import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import { formatCurrency } from '@/lib/utils'
import { Card, CardTitle } from '@/components/ui/Card'
import IngresosGastosLineChart from '@/components/charts/IngresosGastosLineChart'
import GastosCategoriasBarChart from '@/components/charts/GastosCategoriasBarChart'

export default async function ReportesPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return null

  // Last 6 months date ranges
  const meses: { label: string; firstDay: string; lastDay: string }[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const year  = d.getFullYear()
    const month = d.getMonth()
    meses.push({
      label:    d.toLocaleDateString('es-DO', { month: 'short', year: 'numeric' }),
      firstDay: new Date(year, month, 1).toISOString().split('T')[0],
      lastDay:  new Date(year, month + 1, 0).toISOString().split('T')[0],
    })
  }

  const now = new Date()
  const currentFirstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const currentLastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const tasa = 60 // fallback; could fetch from config

  // Fetch all data in parallel
  const [resumenMeses, { data: gastosTx }, { data: categories }, { data: configRow }] = await Promise.all([
    Promise.all(
      meses.map(async ({ label, firstDay, lastDay }) => {
        const [{ data: ing }, { data: gas }] = await Promise.all([
          supabase.from('transactions').select('amount, currency')
            .eq('user_id', user.id).eq('type', 'income').eq('status', 'confirmed')
            .gte('date', firstDay).lte('date', lastDay),
          supabase.from('transactions').select('amount, currency')
            .eq('user_id', user.id).eq('type', 'expense').eq('status', 'confirmed')
            .gte('date', firstDay).lte('date', lastDay),
        ])
        const ingresos = (ing ?? []).reduce((s, t) => s + (t.currency === 'USD' ? Number(t.amount) * tasa : Number(t.amount)), 0)
        const gastos   = (gas ?? []).reduce((s, t) => s + (t.currency === 'USD' ? Number(t.amount) * tasa : Number(t.amount)), 0)
        return { label, ingresos, gastos, ahorro: ingresos - gastos }
      })
    ),
    supabase.from('transactions').select('amount, currency, category_id')
      .eq('user_id', user.id).eq('type', 'expense').eq('status', 'confirmed')
      .gte('date', currentFirstDay).lte('date', currentLastDay),
    supabase.from('categories').select('id, name, color, parent_id')
      .eq('user_id', user.id).eq('is_active', true),
    supabase.from('config').select('tasa_usd_dop').eq('user_id', user.id).single(),
  ])

  const tasaActual = Number(configRow?.tasa_usd_dop ?? 60)

  // Build category spending for bar chart
  const catMap: Record<string, { name: string; color: string; parent_id: string | null }> = {}
  for (const c of categories ?? []) catMap[c.id] = { name: c.name, color: c.color ?? '#64748b', parent_id: c.parent_id }

  const spentByParent: Record<string, number> = {}
  for (const t of gastosTx ?? []) {
    if (!t.category_id) continue
    const parentId = catMap[t.category_id]?.parent_id ?? t.category_id
    const amt = t.currency === 'USD' ? Number(t.amount) * tasaActual : Number(t.amount)
    spentByParent[parentId] = (spentByParent[parentId] ?? 0) + amt
  }

  const barData = Object.entries(spentByParent)
    .map(([id, amount]) => ({
      name:   catMap[id]?.name ?? '—',
      amount,
      color:  catMap[id]?.color ?? '#64748b',
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 7)

  const mesActual = now.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Line chart — income vs expenses */}
      <Card>
        <CardTitle>Ingresos vs Gastos — últimos 6 meses</CardTitle>
        <IngresosGastosLineChart data={resumenMeses} />
      </Card>

      {/* Bar chart — top categories this month */}
      <Card>
        <CardTitle className="capitalize">Gastos por categoría — {mesActual}</CardTitle>
        <GastosCategoriasBarChart data={barData} />
      </Card>

      {/* Monthly summary table */}
      <Card>
        <CardTitle>Resumen mensual (últimos 6 meses)</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-800">
                <th className="text-left py-2 pr-4">Mes</th>
                <th className="text-right py-2 pr-4">Ingresos</th>
                <th className="text-right py-2 pr-4">Gastos</th>
                <th className="text-right py-2">Resultado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {resumenMeses.map(({ label, ingresos, gastos, ahorro }) => (
                <tr key={label}>
                  <td className="py-2.5 pr-4 text-slate-300 capitalize">{label}</td>
                  <td className="py-2.5 pr-4 text-right text-emerald-400">{formatCurrency(ingresos)}</td>
                  <td className="py-2.5 pr-4 text-right text-red-400">{formatCurrency(gastos)}</td>
                  <td className={`py-2.5 text-right font-medium ${ahorro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ahorro >= 0 ? '+' : ''}{formatCurrency(ahorro)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
