'use client'

import { useState } from 'react'
import { createCreditCard, updateCreditCard } from '@/app/actions/creditCards'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CardData {
  id:             string
  credit_limit:   number
  cut_day:        number
  due_day:        number
  annual_fee:     number
  cashback_rules: Record<string, number>
  account: {
    name:  string
    color: string | null
  } | null
}

interface TarjetaFormProps {
  card?:      CardData
  onSuccess:  () => void
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#06b6d4', '#eab308', '#ef4444',
  '#64748b', '#10b981',
]

export default function TarjetaForm({ card, onSuccess }: TarjetaFormProps) {
  const isEditing = !!card

  const [name,        setName]        = useState(card?.account?.name ?? '')
  const [currency,    setCurrency]    = useState('DOP')
  const [color,       setColor]       = useState(card?.account?.color ?? COLORS[0])
  const [creditLimit, setCreditLimit] = useState(String(card?.credit_limit ?? ''))
  const [cutDay,      setCutDay]      = useState(String(card?.cut_day ?? '15'))
  const [dueDay,      setDueDay]      = useState(String(card?.due_day ?? '5'))
  const [annualFee,   setAnnualFee]   = useState(String(card?.annual_fee ?? '0'))
  const [cashback,    setCashback]    = useState<{ cat: string; pct: string }[]>(
    card ? Object.entries(card.cashback_rules).map(([cat, pct]) => ({ cat, pct: String(pct) })) : []
  )
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  function addCashbackRow() {
    setCashback(prev => [...prev, { cat: '', pct: '' }])
  }

  function updateCashbackRow(i: number, field: 'cat' | 'pct', value: string) {
    setCashback(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))
  }

  function removeCashback(i: number) {
    setCashback(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const limit = parseFloat(creditLimit.replace(',', '.'))
    if (isNaN(limit) || limit <= 0) { setError('Ingresa un límite válido'); return }

    const cut = parseInt(cutDay)
    const due = parseInt(dueDay)
    if (cut < 1 || cut > 31) { setError('Día de corte inválido (1-31)'); return }
    if (due < 1 || due > 31) { setError('Día de pago inválido (1-31)'); return }

    const cashbackRules: Record<string, number> = {}
    for (const row of cashback) {
      if (!row.cat.trim()) continue
      const pct = parseFloat(row.pct)
      if (!isNaN(pct) && pct > 0) cashbackRules[row.cat.trim()] = pct
    }

    setLoading(true)
    let result: { success: boolean; error?: string }

    if (isEditing) {
      result = await updateCreditCard(card.id, {
        name:          name.trim(),
        color,
        creditLimit:   limit,
        cutDay:        cut,
        dueDay:        due,
        annualFee:     parseFloat(annualFee) || 0,
        cashbackRules,
      })
    } else {
      result = await createCreditCard({
        name:          name.trim(),
        currency,
        color,
        creditLimit:   limit,
        cutDay:        cut,
        dueDay:        due,
        annualFee:     parseFloat(annualFee) || 0,
        cashbackRules,
      })
    }

    setLoading(false)

    if (result.success) onSuccess()
    else setError(result.error ?? 'Error al guardar')
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 pb-8">
      {/* Nombre */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Nombre de la tarjeta</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="ej. Visa Popular, Scotia Visa"
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
      </div>

      {/* Moneda (solo en creación) */}
      {!isEditing && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Moneda</label>
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="DOP">DOP (RD$)</option>
              <option value="USD">USD (US$)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Límite de crédito</label>
            <input
              type="number"
              value={creditLimit}
              onChange={e => setCreditLimit(e.target.value)}
              placeholder="50000"
              step="1000"
              min="0"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
        </div>
      )}

      {/* Límite (solo en edición) */}
      {isEditing && (
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Límite de crédito</label>
          <input
            type="number"
            value={creditLimit}
            onChange={e => setCreditLimit(e.target.value)}
            placeholder="50000"
            step="1000"
            min="0"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      )}

      {/* Días de corte y pago */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Día de corte</label>
          <input
            type="number"
            value={cutDay}
            onChange={e => setCutDay(e.target.value)}
            min="1" max="31"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1.5">Día de pago</label>
          <input
            type="number"
            value={dueDay}
            onChange={e => setDueDay(e.target.value)}
            min="1" max="31"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Comisión anual */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Comisión anual (opcional)</label>
        <input
          type="number"
          value={annualFee}
          onChange={e => setAnnualFee(e.target.value)}
          placeholder="0"
          step="100"
          min="0"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition"
        />
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
                color === c
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                  : 'opacity-70 hover:opacity-100'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Cashback rules */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">Cashback (opcional)</label>
          <button
            type="button"
            onClick={addCashbackRow}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
          >
            <Plus className="w-3 h-3" /> Añadir
          </button>
        </div>
        {cashback.length > 0 && (
          <div className="space-y-2">
            {cashback.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={row.cat}
                  onChange={e => updateCashbackRow(i, 'cat', e.target.value)}
                  placeholder="Categoría (ej. gasolina)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  value={row.pct}
                  onChange={e => updateCashbackRow(i, 'pct', e.target.value)}
                  placeholder="%"
                  min="0" max="100" step="0.5"
                  className="w-16 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => removeCashback(i)}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
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
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEditing ? 'Guardar cambios' : 'Agregar tarjeta'}
      </button>
    </form>
  )
}
