'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  label:    string
  ingresos: number
  gastos:   number
}

function abbrev(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(Math.round(n))
}

function fmtDOP(n: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 0 }).format(n)
}

export default function IngresosGastosLineChart({ data }: { data: DataPoint[] }) {
  // Recharts renders oldest → newest; reverse so chart reads left=old right=new
  const reversed = [...data].reverse()

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={reversed} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => v.split(' ')[0]}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={abbrev}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          formatter={(value, name) => [fmtDOP(Number(value ?? 0)), name === 'ingresos' ? 'Ingresos' : 'Gastos']}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#64748b' }}
          formatter={v => v === 'ingresos' ? 'Ingresos' : 'Gastos'}
        />
        <Line
          type="monotone"
          dataKey="ingresos"
          stroke="#34d399"
          strokeWidth={2}
          dot={{ r: 3, fill: '#34d399' }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="gastos"
          stroke="#f87171"
          strokeWidth={2}
          dot={{ r: 3, fill: '#f87171' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
