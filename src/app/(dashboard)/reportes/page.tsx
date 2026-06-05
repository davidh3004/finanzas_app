import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card, CardTitle } from '@/components/ui/Card'

export default async function ReportesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Últimos 6 meses
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

  const resumenMeses = await Promise.all(
    meses.map(async ({ label, firstDay, lastDay }) => {
      const [{ data: ing }, { data: gas }] = await Promise.all([
        supabase.from('transactions').select('amount')
          .eq('user_id', user.id).eq('type', 'income').eq('status', 'confirmed')
          .gte('date', firstDay).lte('date', lastDay),
        supabase.from('transactions').select('amount')
          .eq('user_id', user.id).eq('type', 'expense').eq('status', 'confirmed')
          .gte('date', firstDay).lte('date', lastDay),
      ])
      const ingresos = (ing ?? []).reduce((s, t) => s + Number(t.amount), 0)
      const gastos   = (gas ?? []).reduce((s, t) => s + Number(t.amount), 0)
      return { label, ingresos, gastos, ahorro: ingresos - gastos }
    })
  )

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
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
