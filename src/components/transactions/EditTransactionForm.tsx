'use client'

import { useState } from 'react'
import { updateTransaction, discardTransaction } from '@/app/actions/transactions'
import type { Category, Transaction } from '@/types/database'
import { cn } from '@/lib/utils'
import { Loader2, ChevronDown, Trash2 } from 'lucide-react'

interface EditTransactionFormProps {
  transaction: Transaction
  categories:  Category[]
  onSuccess:   () => void
}

const TYPE_LABEL: Record<string, string> = {
  income:   'Ingreso',
  expense:  'Gasto',
  transfer: 'Transferencia',
}
const TYPE_STYLE: Record<string, string> = {
  income:   'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  expense:  'bg-red-500/10 border-red-500/30 text-red-400',
  transfer: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
}

export default function EditTransactionForm({
  transaction: t,
  categories,
  onSuccess,
}: EditTransactionFormProps) {
  const [amount,      setAmount]      = useState(String(t.amount))
  const [merchant,    setMerchant]    = useState(t.merchant ?? '')
  const [description, setDescription] = useState(t.description ?? '')
  const [categoryId,  setCategoryId]  = useState(t.category_id ?? '')
  const [date,        setDate]        = useState(t.date)
  const [loading,     setLoading]     = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const parentCats = categories.filter(
    c => c.parent_id === null && (
      t.type === 'income'
        ? c.kind === 'income'
        : c.kind !== 'income' && c.kind !== 'transfer'
    )
  )
  const childCats = categories.filter(c => c.parent_id !== null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountNum = parseFloat(amount.replace(',', '.'))
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }

    setLoading(true)
    const result = await updateTransaction({
      id:          t.id,
      amount:      amountNum,
      merchant:    merchant || null,
      description: description || null,
      categoryId:  categoryId || null,
      date,
    })
    setLoading(false)

    if (result.success) onSuccess()
    else setError(result.error ?? 'Error al guardar')
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8">
      {/* Tipo — solo lectura */}
      <div className="flex items-center gap-2">
        <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', TYPE_STYLE[t.type])}>
          {TYPE_LABEL[t.type]}
        </span>
        <span className="text-xs text-slate-500">{t.currency}</span>
      </div>

      {/* Monto */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Monto</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-medium">
            {t.currency === 'DOP' ? 'RD$' : 'US$'}
          </span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            step="0.01"
            min="0.01"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Merchant */}
      {t.type !== 'transfer' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Comercio</label>
          <input
            type="text"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            placeholder="ej. La Sirena, Netflix"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      )}

      {/* Categoría */}
      {t.type !== 'transfer' && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Categoría</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
            >
              <option value="">Sin categoría</option>
              {parentCats.map(parent => {
                const children = childCats.filter(c => c.parent_id === parent.id)
                if (children.length === 0) return (
                  <option key={parent.id} value={parent.id}>{parent.name}</option>
                )
                return (
                  <optgroup key={parent.id} label={parent.name}>
                    {children.map(child => (
                      <option key={child.id} value={child.id}>{child.name}</option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Nota */}
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

      {error && (
        <p className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || deleting}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-sm transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
      </button>

      <button
        type="button"
        disabled={loading || deleting}
        onClick={async () => {
          if (!confirm('¿Eliminar este movimiento? El saldo de la cuenta se revertirá.')) return
          setDeleting(true)
          await discardTransaction(t.id)
          setDeleting(false)
          onSuccess()
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors disabled:opacity-50"
      >
        {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4" /> Eliminar movimiento</>}
      </button>
    </form>
  )
}
