'use client'

import { useState } from 'react'
import { createFund, updateFund } from '@/app/actions/funds'
import type { Fund, Account, FundType } from '@/types/database'
import { Loader2, ChevronDown } from 'lucide-react'

interface FundFormProps {
  fund?: Fund
  accounts: Account[]
  onSuccess: () => void
}

const FUND_TYPES: { value: FundType; label: string; desc: string }[] = [
  { value: 'emergency',  label: 'Emergencia',  desc: 'Fondo para imprevistos' },
  { value: 'investment', label: 'Inversión',   desc: 'VOO, ETFs, etc.' },
  { value: 'saving',     label: 'Ahorro',      desc: 'Meta de ahorro general' },
]

export default function FundForm({ fund, accounts, onSuccess }: FundFormProps) {
  const [name, setName]                   = useState(fund?.name ?? '')
  const [type, setType]                   = useState<FundType>(fund?.type ?? 'emergency')
  const [targetAmount, setTargetAmount]   = useState(fund ? String(fund.target_amount) : '')
  const [currency, setCurrency]           = useState(fund?.currency ?? 'DOP')
  const [projectionRate, setProjectionRate] = useState(
    fund ? String(Number(fund.projection_rate) * 100) : ''
  )
  const [linkedAccountId, setLinkedAccountId] = useState(fund?.linked_account_id ?? '')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const target = parseFloat(targetAmount.replace(',', '.'))
    if (isNaN(target) || target <= 0) {
      setError('Ingresa una meta válida')
      return
    }

    const rate = projectionRate ? parseFloat(projectionRate.replace(',', '.')) : 0

    setLoading(true)
    const input = {
      name: name.trim(),
      type,
      targetAmount: target,
      currency,
      projectionRate: rate,
      linkedAccountId: linkedAccountId || null,
    }

    const result = fund
      ? await updateFund(fund.id, input)
      : await createFund(input)

    setLoading(false)
    if (result.success) onSuccess()
    else setError(result.error ?? 'Error al guardar')
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8">
      {/* Nombre */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Nombre del fondo</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ej. Fondo Emergencia, VOO"
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Tipo</label>
        <div className="grid grid-cols-3 gap-2">
          {FUND_TYPES.map(ft => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setType(ft.value)}
              className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                type === ft.value
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      {/* Meta + Moneda */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Meta</label>
          <input
            type="number"
            value={targetAmount}
            onChange={e => setTargetAmount(e.target.value)}
            placeholder="85000"
            step="0.01"
            min="0"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
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
      </div>

      {/* Tasa de rendimiento */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">
          Tasa anual esperada (% — opcional)
        </label>
        <input
          type="number"
          value={projectionRate}
          onChange={e => setProjectionRate(e.target.value)}
          placeholder="ej. 8 para BHD Liquidez, 10 para VOO"
          step="0.1"
          min="0"
          max="100"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Cuenta vinculada */}
      {accounts.length > 0 && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">
            Cuenta vinculada (opcional)
          </label>
          <div className="relative">
            <select
              value={linkedAccountId}
              onChange={e => setLinkedAccountId(e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 pr-8"
            >
              <option value="">Ninguna</option>
              {accounts.filter(a => a.is_active).map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      )}

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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (fund ? 'Guardar cambios' : 'Crear fondo')}
      </button>
    </form>
  )
}
