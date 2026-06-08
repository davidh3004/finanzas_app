'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { formatCurrency, calcMonthsToGoal } from '@/lib/utils'

interface SimuladorClientProps {
  defaultIngresoNeto:    number
  defaultAhorro:         number
  defaultMetaEmergencia: number
  defaultSaldoEmergencia: number
  defaultSaldoInversion: number
  defaultTasaVOO:        number
}

export default function SimuladorClient({
  defaultIngresoNeto,
  defaultAhorro,
  defaultMetaEmergencia,
  defaultSaldoEmergencia,
  defaultSaldoInversion,
  defaultTasaVOO,
}: SimuladorClientProps) {
  const [ingresoNeto,     setIngresoNeto]     = useState(defaultIngresoNeto)
  const [ahorro,          setAhorro]          = useState(defaultAhorro)
  const [metaEmergencia,  setMetaEmergencia]  = useState(defaultMetaEmergencia)
  const [saldoEmergencia, setSaldoEmergencia] = useState(defaultSaldoEmergencia)
  const [saldoInversion,  setSaldoInversion]  = useState(defaultSaldoInversion)
  const [tasaVOO,         setTasaVOO]         = useState(defaultTasaVOO || 10)
  const [años,            setAños]            = useState(10)

  const disponible = ingresoNeto - ahorro
  const mesesMeta  = calcMonthsToGoal(saldoEmergencia, metaEmergencia, ahorro)

  function proyeccionVOO() {
    const r = tasaVOO / 100 / 12
    const n = años * 12
    const pv = saldoInversion
    if (r === 0) return pv + ahorro * n
    return pv * Math.pow(1 + r, n) + ahorro * ((Math.pow(1 + r, n) - 1) / r)
  }

  const fields: { label: string; value: number; set: (v: number) => void; min: number; step: number; max?: number }[] = [
    { label: 'Ingreso neto mensual (RD$)',       value: ingresoNeto,     set: setIngresoNeto,     min: 0, step: 1000 },
    { label: 'Ahorro / aporte mensual (RD$)',    value: ahorro,          set: setAhorro,          min: 0, step: 500  },
    { label: 'Meta fondo de emergencia (RD$)',   value: metaEmergencia,  set: setMetaEmergencia,  min: 0, step: 5000 },
    { label: 'Saldo actual — emergencia (RD$)',  value: saldoEmergencia, set: setSaldoEmergencia, min: 0, step: 1000 },
    { label: 'Saldo actual — inversión (RD$)',   value: saldoInversion,  set: setSaldoInversion,  min: 0, step: 1000 },
    { label: 'Tasa anual esperada (%)',          value: tasaVOO,         set: setTasaVOO,         min: 0, step: 0.5, max: 50 },
    { label: 'Años de proyección',               value: años,            set: setAños,            min: 1, step: 1,   max: 40 },
  ]

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="mb-0">Parámetros</CardTitle>
          <span className="text-xs text-slate-500">Pre-cargado de tu configuración</span>
        </div>
        <div className="space-y-4">
          {fields.map(({ label, value, set, min, step, max }) => (
            <div key={label}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                type="number"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={e => set(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardTitle>Disponible para gastar</CardTitle>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(disponible)}</p>
          <p className="text-xs text-slate-500 mt-1">Ingreso neto − ahorro mensual</p>
        </Card>

        <Card>
          <CardTitle>Meses para meta emergencia</CardTitle>
          <p className="text-2xl font-bold text-yellow-400">
            {mesesMeta === Infinity ? '∞' : mesesMeta === 0 ? '✓' : `${mesesMeta}m`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {mesesMeta === 0
              ? 'Meta ya alcanzada'
              : mesesMeta === Infinity
                ? 'Sin aporte definido'
                : `~${(mesesMeta / 12).toFixed(1)} años`}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>Proyección inversión en {años} {años === 1 ? 'año' : 'años'}</CardTitle>
        <p className="text-3xl font-bold text-emerald-400">{formatCurrency(proyeccionVOO())}</p>
        <p className="text-xs text-slate-500 mt-2">
          Aportando {formatCurrency(ahorro)}/mes · {tasaVOO}% anual · interés compuesto mensual
        </p>
      </Card>
    </div>
  )
}
