'use client'

import { useState } from 'react'
import { Card, CardTitle } from '@/components/ui/Card'
import { formatCurrency, calcMonthsToGoal } from '@/lib/utils'
import { Calculator } from 'lucide-react'

export default function SimuladorPage() {
  const [ingresoNeto, setIngresoNeto] = useState(28227)
  const [ahorro, setAhorro] = useState(10000)
  const [metaEmergencia, setMetaEmergencia] = useState(85000)
  const [saldoActual, setSaldoActual] = useState(0)
  const [tasaVOO, setTasaVOO] = useState(10)
  const [años, setAños] = useState(10)

  const disponible = ingresoNeto - ahorro
  const mesesMeta  = calcMonthsToGoal(saldoActual, metaEmergencia, ahorro)

  // Proyección VOO con interés compuesto
  const proyeccionVOO = () => {
    const r = tasaVOO / 100 / 12
    const n = años * 12
    const pv = saldoActual
    if (r === 0) return pv + ahorro * n
    return pv * Math.pow(1 + r, n) + ahorro * ((Math.pow(1 + r, n) - 1) / r)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <CardTitle>Parámetros</CardTitle>
        <div className="space-y-4">
          {[
            { label: 'Ingreso neto mensual (RD$)', value: ingresoNeto, set: setIngresoNeto, min: 0, step: 1000 },
            { label: 'Aporte mensual (RD$)',        value: ahorro,      set: setAhorro,      min: 0, step: 500  },
            { label: 'Meta de emergencia (RD$)',     value: metaEmergencia, set: setMetaEmergencia, min: 0, step: 5000 },
            { label: 'Saldo actual en fondo (RD$)',  value: saldoActual, set: setSaldoActual, min: 0, step: 1000 },
            { label: 'Tasa anual VOO (%)',           value: tasaVOO,     set: setTasaVOO,     min: 0, step: 0.5, max: 50 },
            { label: 'Años de proyección',           value: años,        set: setAños,        min: 1, step: 1,   max: 40 },
          ].map(({ label, value, set, min, step, max }) => (
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
          <p className="text-xs text-slate-500 mt-1">Ingreso neto − aporte</p>
        </Card>

        <Card>
          <CardTitle>Meses para meta emergencia</CardTitle>
          <p className="text-2xl font-bold text-yellow-400">
            {mesesMeta === Infinity ? '∞' : `${mesesMeta} meses`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {mesesMeta !== Infinity && mesesMeta > 0
              ? `~${(mesesMeta / 12).toFixed(1)} años`
              : 'Meta ya alcanzada'}
          </p>
        </Card>
      </div>

      <Card>
        <CardTitle>Proyección VOO en {años} {años === 1 ? 'año' : 'años'}</CardTitle>
        <p className="text-3xl font-bold text-emerald-400">{formatCurrency(proyeccionVOO())}</p>
        <p className="text-xs text-slate-500 mt-2">
          Aportando {formatCurrency(ahorro)}/mes · {tasaVOO}% anual · interés compuesto mensual
        </p>
      </Card>
    </div>
  )
}
