'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createTransaction } from '@/app/actions/transactions'
import type { Account, Category, TransactionType } from '@/types/database'
import { cn, formatCurrency } from '@/lib/utils'
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Loader2, Sparkles, ChevronDown,
} from 'lucide-react'

interface TransactionFormProps {
  accounts: Account[]
  categories: Category[]
  onSuccess: () => void
  defaultType?: TransactionType
}

interface AISuggestion {
  category_id: string
  category_name: string
  confidence: number
  source: string
}

const TYPE_CONFIG = {
  expense: {
    label: 'Gasto',
    icon: ArrowDownLeft,
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    activeBg: 'bg-red-500 border-red-500',
  },
  income: {
    label: 'Ingreso',
    icon: ArrowUpRight,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
    activeBg: 'bg-emerald-500 border-emerald-500',
  },
  transfer: {
    label: 'Transferencia',
    icon: ArrowLeftRight,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/30',
    activeBg: 'bg-slate-600 border-slate-600',
  },
} as const

export default function TransactionForm({
  accounts,
  categories,
  onSuccess,
  defaultType = 'expense',
}: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(defaultType)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('DOP')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [counterpartyAccountId, setCounterpartyAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AI Categorizer
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const expenseCategories = categories.filter(
    c => c.parent_id === null && (type === 'income' ? c.kind === 'income' : c.kind !== 'income' && c.kind !== 'transfer')
  )

  const allChildren = categories.filter(c => c.parent_id !== null)

  function getChildren(parentId: string) {
    return allChildren.filter(c => c.parent_id === parentId)
  }

  // Debounce AI categorizer cuando cambia el merchant
  const runCategorizer = useCallback(async (merchantText: string) => {
    if (!merchantText.trim() || type === 'transfer') return
    setAiLoading(true)
    try {
      const res = await fetch('/api/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: merchantText,
          description,
          amount: parseFloat(amount) || 0,
          type,
          date,
        }),
      })
      if (res.ok) {
        const data = await res.json() as AISuggestion
        setAiSuggestion(data)
        // Auto-rellenar si el usuario no ha elegido categoría
        if (!categoryId) setCategoryId(data.category_id)
      }
    } catch { /* silencioso */ }
    finally { setAiLoading(false) }
  }, [description, amount, type, date, categoryId])

  useEffect(() => {
    if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current)
    if (merchant.length >= 2) {
      aiDebounceRef.current = setTimeout(() => runCategorizer(merchant), 600)
    } else {
      setAiSuggestion(null)
    }
    return () => { if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current) }
  }, [merchant, runCategorizer])

  // Reset categoría al cambiar tipo
  useEffect(() => {
    setCategoryId('')
    setAiSuggestion(null)
  }, [type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount.replace(',', '.'))
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (!accountId) {
      setError('Selecciona una cuenta')
      return
    }
    if (type === 'transfer' && !counterpartyAccountId) {
      setError('Selecciona la cuenta destino')
      return
    }
    if (type === 'transfer' && accountId === counterpartyAccountId) {
      setError('Las cuentas origen y destino deben ser diferentes')
      return
    }

    setLoading(true)
    const result = await createTransaction({
      amount: amountNum,
      currency,
      type,
      categoryId: categoryId || null,
      accountId,
      counterpartyAccountId: type === 'transfer' ? counterpartyAccountId : null,
      merchant: merchant || undefined,
      description: description || undefined,
      date,
      aiCategorySuggestion: aiSuggestion?.category_id ?? null,
      aiConfidence: aiSuggestion?.confidence ?? null,
    })
    setLoading(false)

    if (result.success) {
      onSuccess()
    } else {
      setError(result.error ?? 'Error al guardar')
    }
  }

  const activeAccount = accounts.find(a => a.id === accountId)

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8">
      {/* Tipo de movimiento */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TYPE_CONFIG) as TransactionType[]).map((t) => {
          const cfg = TYPE_CONFIG[t]
          const Icon = cfg.icon
          const isActive = type === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all',
                isActive ? `${cfg.activeBg} text-white` : `${cfg.bg} ${cfg.color}`
              )}
            >
              <Icon className="w-4 h-4" />
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* Monto */}
      <div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">
              {currency === 'DOP' ? 'RD$' : 'US$'}
            </span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-xl font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="DOP">DOP</option>
            <option value="USD">USD</option>
          </select>
        </div>
      </div>

      {/* Cuenta origen */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">
          {type === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
        </label>
        <div className="relative">
          <select
            value={accountId}
            onChange={e => setAccountId(e.target.value)}
            required
            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
          >
            <option value="">Selecciona una cuenta</option>
            {accounts.filter(a => a.is_active).map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({formatCurrency(a.current_balance, a.currency)})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Cuenta destino (solo transferencias) */}
      {type === 'transfer' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Cuenta destino</label>
          <div className="relative">
            <select
              value={counterpartyAccountId}
              onChange={e => setCounterpartyAccountId(e.target.value)}
              required
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
            >
              <option value="">Selecciona la cuenta destino</option>
              {accounts.filter(a => a.is_active && a.id !== accountId).map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.current_balance, a.currency)})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Comercio / Merchant */}
      {type !== 'transfer' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Comercio / Descripción corta
          </label>
          <div className="relative">
            <input
              type="text"
              value={merchant}
              onChange={e => setMerchant(e.target.value)}
              placeholder="ej. La Sirena, Netflix, Gasolinera"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition pr-8"
            />
            {aiLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 animate-spin" />
            )}
          </div>

          {/* Sugerencia de IA */}
          {aiSuggestion && !aiLoading && (
            <button
              type="button"
              onClick={() => setCategoryId(aiSuggestion.category_id)}
              className={cn(
                'mt-1.5 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
                categoryId === aiSuggestion.category_id
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400'
              )}
            >
              <Sparkles className="w-3 h-3" />
              {aiSuggestion.category_name}
              <span className="text-slate-600">·</span>
              <span>{Math.round(aiSuggestion.confidence * 100)}%</span>
            </button>
          )}
        </div>
      )}

      {/* Categoría */}
      {type !== 'transfer' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Categoría</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
            >
              <option value="">Sin categoría</option>
              {expenseCategories.map(parent => {
                const children = getChildren(parent.id)
                if (children.length === 0) {
                  return (
                    <option key={parent.id} value={parent.id}>
                      {parent.name}
                    </option>
                  )
                }
                return (
                  <optgroup key={parent.id} label={parent.name}>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>
                        {child.name}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Nota / descripción larga */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Nota (opcional)</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Detalle adicional..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Fecha */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Fecha</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Saldo resultante preview */}
      {activeAccount && amount && parseFloat(amount) > 0 && type !== 'transfer' && (
        <div className="text-xs text-slate-500 flex justify-between px-1">
          <span>Saldo de {activeAccount.name} después:</span>
          <span className="font-medium text-slate-300">
            {formatCurrency(
              type === 'income'
                ? activeAccount.current_balance + parseFloat(amount)
                : activeAccount.current_balance - parseFloat(amount),
              activeAccount.currency
            )}
          </span>
        </div>
      )}

      {/* Botón submit */}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-colors',
          type === 'income' ? 'bg-emerald-600 hover:bg-emerald-500' :
          type === 'expense' ? 'bg-red-600 hover:bg-red-500' :
          'bg-slate-600 hover:bg-slate-500',
          loading && 'opacity-50 cursor-not-allowed'
        )}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          `Guardar ${TYPE_CONFIG[type].label}`
        )}
      </button>
    </form>
  )
}
