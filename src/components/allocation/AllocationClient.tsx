'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  createAllocationRule,
  deleteAllocationRule,
  updateConfig,
} from '@/app/actions/allocation'
import type { AllocationRule, Account, Fund } from '@/types/database'
import { formatCurrency, cn } from '@/lib/utils'
import { Plus, Trash2, Loader2, ChevronDown, Pencil } from 'lucide-react'

interface AllocationClientProps {
  rules: AllocationRule[]
  accounts: Account[]
  funds: Fund[]
  ingresoBruto: number
  ingresoNeto: number
  tasaUsdDop: number
}

interface RuleForm {
  name: string
  calcType: 'percentage' | 'fixed'
  calcBase: 'bruto' | 'neto'
  value: string
  destination: 'fund' | 'account' | 'category'
  destinationId: string
  priority: number
}

const EMPTY_RULE: RuleForm = {
  name: '',
  calcType: 'percentage',
  calcBase: 'bruto',
  value: '',
  destination: 'fund',
  destinationId: '',
  priority: 0,
}

export default function AllocationClient({
  rules,
  accounts,
  funds,
  ingresoBruto,
  ingresoNeto,
  tasaUsdDop,
}: AllocationClientProps) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState<RuleForm>(EMPTY_RULE)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Config edit
  const [editingConfig, setEditingConfig] = useState(false)
  const [cfgNeto, setCfgNeto]     = useState(String(ingresoNeto))
  const [cfgBruto, setCfgBruto]   = useState(String(ingresoBruto))
  const [cfgTasa, setCfgTasa]     = useState(String(tasaUsdDop))
  const [cfgSaving, setCfgSaving] = useState(false)

  const router = useRouter()

  // Calcular el reparto con las reglas actuales
  function calcReparto(base: number, gross: number): { name: string; amount: number }[] {
    return rules
      .filter(r => r.is_active)
      .sort((a, b) => a.priority - b.priority)
      .map(r => {
        const baseAmount = r.calc_base === 'bruto' ? gross : base
        const amount = r.calc_type === 'percentage'
          ? (Number(r.value) / 100) * baseAmount
          : Number(r.value)
        return { name: r.name, amount }
      })
  }

  const reparto = calcReparto(ingresoNeto, ingresoBruto)
  const totalAsignado = reparto.reduce((s, r) => s + r.amount, 0)
  const disponible = ingresoNeto - totalAsignado

  async function handleSaveRule(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const value = parseFloat(String(form.value).replace(',', '.'))
    if (isNaN(value) || value <= 0) { setError('Valor inválido'); return }
    if (!form.destinationId) { setError('Selecciona un destino'); return }

    setSaving(true)
    const result = await createAllocationRule({
      name:          form.name,
      priority:      rules.length,
      calcType:      form.calcType,
      calcBase:      form.calcBase,
      value,
      destination:   form.destination,
      destinationId: form.destinationId,
    })
    setSaving(false)
    if (result.success) { setShowForm(false); setForm(EMPTY_RULE); router.refresh() }
    else setError(result.error ?? 'Error al guardar')
  }

  async function handleDelete(id: string) {
    await deleteAllocationRule(id)
    router.refresh()
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setCfgSaving(true)
    await updateConfig(
      parseFloat(cfgNeto) || 0,
      parseFloat(cfgBruto) || 0,
      parseFloat(cfgTasa) || 60
    )
    setCfgSaving(false)
    setEditingConfig(false)
    router.refresh()
  }

  const destinationOptions = form.destination === 'fund'
    ? funds.map(f => ({ id: f.id, label: f.name }))
    : accounts.map(a => ({ id: a.id, label: a.name }))

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── Ingreso ─────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ingreso mensual</p>
          <button
            onClick={() => setEditingConfig(v => !v)}
            className="text-slate-600 hover:text-slate-300 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {editingConfig ? (
          <form onSubmit={handleSaveConfig} className="space-y-3">
            {[
              { label: 'Ingreso neto (RD$)',  value: cfgNeto,  set: setCfgNeto  },
              { label: 'Ingreso bruto (RD$)', value: cfgBruto, set: setCfgBruto },
              { label: 'Tasa USD→DOP',         value: cfgTasa,  set: setCfgTasa  },
            ].map(({ label, value, set }) => (
              <div key={label} className="flex items-center gap-3">
                <label className="text-xs text-slate-400 w-36 flex-shrink-0">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={e => set(e.target.value)}
                  step="0.01"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={cfgSaving}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                {cfgSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar'}
              </button>
              <button type="button" onClick={() => setEditingConfig(false)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Neto',   value: formatCurrency(ingresoNeto)  },
              { label: 'Bruto',  value: formatCurrency(ingresoBruto) },
              { label: 'USD→DOP',value: `${tasaUsdDop}`             },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Reglas de reparto ───────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reglas de reparto</p>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:underline"
          >
            <Plus className="w-3 h-3" /> Nueva regla
          </button>
        </div>

        {/* Formulario nueva regla */}
        {showForm && (
          <form onSubmit={handleSaveRule} className="px-4 py-3 border-b border-slate-800 space-y-3 bg-slate-800/30">
            <div>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre (ej. Diezmo)"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Tipo calc */}
              <div className="relative">
                <select
                  value={form.calcType}
                  onChange={e => setForm(f => ({ ...f, calcType: e.target.value as 'percentage' | 'fixed' }))}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 pr-7"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto fijo</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>

              {/* Base */}
              <div className="relative">
                <select
                  value={form.calcBase}
                  onChange={e => setForm(f => ({ ...f, calcBase: e.target.value as 'bruto' | 'neto' }))}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 pr-7"
                >
                  <option value="bruto">Del bruto</option>
                  <option value="neto">Del neto</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Valor */}
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder={form.calcType === 'percentage' ? '10 (= 10%)' : 'Monto'}
                step="0.01"
                min="0"
                required
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500"
              />

              {/* Destino tipo */}
              <div className="relative">
                <select
                  value={form.destination}
                  onChange={e => setForm(f => ({ ...f, destination: e.target.value as 'fund' | 'account', destinationId: '' }))}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 pr-7"
                >
                  <option value="fund">→ Fondo</option>
                  <option value="account">→ Cuenta</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Destino ID */}
            <div className="relative">
              <select
                value={form.destinationId}
                onChange={e => setForm(f => ({ ...f, destinationId: e.target.value }))}
                required
                className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 pr-7"
              >
                <option value="">Selecciona el destino</option>
                {destinationOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Guardar regla'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_RULE) }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 text-sm hover:text-white transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de reglas */}
        {rules.length === 0 && !showForm ? (
          <p className="text-center text-sm text-slate-500 py-8">
            Sin reglas. Agrega la primera para ver el reparto del ingreso.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {rules.sort((a, b) => a.priority - b.priority).map(rule => {
              const baseAmount = rule.calc_base === 'bruto' ? ingresoBruto : ingresoNeto
              const amount = rule.calc_type === 'percentage'
                ? (Number(rule.value) / 100) * baseAmount
                : Number(rule.value)
              return (
                <div key={rule.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{rule.name}</p>
                    <p className="text-xs text-slate-500">
                      {rule.calc_type === 'percentage'
                        ? `${rule.value}% del ${rule.calc_base}`
                        : `RD$ ${rule.value} fijo`}
                      {' → '}{rule.destination}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-400">
                      {formatCurrency(amount)}
                    </span>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Resumen de reparto ──────────────────────────── */}
      {rules.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Resumen — próximo ingreso neto: {formatCurrency(ingresoNeto)}
          </p>
          <div className="space-y-2">
            {reparto.map(r => (
              <div key={r.name} className="flex justify-between text-sm">
                <span className="text-slate-300">{r.name}</span>
                <span className="text-slate-400 font-medium">{formatCurrency(r.amount)}</span>
              </div>
            ))}
            <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-semibold">
              <span className="text-slate-300">Disponible para gastar</span>
              <span className={cn('font-bold', disponible >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                {formatCurrency(disponible)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
