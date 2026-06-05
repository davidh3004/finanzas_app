'use client'

import { useState } from 'react'
import { createAccount } from '@/app/actions/accounts'
import type { AccountType } from '@/types/database'
import { Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccountFormProps {
  onSuccess: () => void
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking',        label: 'Cuenta corriente'    },
  { value: 'savings',         label: 'Cuenta de ahorros'   },
  { value: 'investment_fund', label: 'Fondo de inversión'  },
  { value: 'brokerage',       label: 'Corretaje (IBKR)'    },
  { value: 'credit_card',     label: 'Tarjeta de crédito'  },
  { value: 'cash',            label: 'Efectivo'            },
]

const COLORS = [
  '#22c55e', '#10b981', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ec4899', '#f97316', '#eab308',
  '#64748b', '#ef4444',
]

export default function AccountForm({ onSuccess }: AccountFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [currency, setCurrency] = useState('DOP')
  const [initialBalance, setInitialBalance] = useState('0')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const bal = parseFloat(initialBalance.replace(',', '.'))
    if (isNaN(bal)) {
      setError('Ingresa un saldo inicial válido')
      return
    }
    if (!name.trim()) {
      setError('El nombre es requerido')
      return
    }

    setLoading(true)
    const result = await createAccount({ name: name.trim(), type, currency, initialBalance: bal, color })
    setLoading(false)

    if (result.success) onSuccess()
    else setError(result.error ?? 'Error al guardar')
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8">
      {/* Nombre */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Nombre de la cuenta</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ej. Corriente Popular, Qik, IBKR"
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Tipo</label>
        <div className="relative">
          <select
            value={type}
            onChange={e => setType(e.target.value as AccountType)}
            className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
          >
            {ACCOUNT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Moneda + Saldo inicial */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Moneda</label>
          <div className="relative">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
            >
              <option value="DOP">DOP (RD$)</option>
              <option value="USD">USD (US$)</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Saldo inicial</label>
          <input
            type="number"
            value={initialBalance}
            onChange={e => setInitialBalance(e.target.value)}
            step="0.01"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Color */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'w-7 h-7 rounded-full transition-all',
                color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-70 hover:opacity-100'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {error && (
        <p className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-white text-sm transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cuenta'}
      </button>
    </form>
  )
}
