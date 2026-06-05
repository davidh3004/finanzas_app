import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'

export default async function PresupuestosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Gastos agrupados por categoría padre este mes
  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount, category:categories(id, name, parent_id, color)')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .eq('status', 'confirmed')
    .gte('date', firstDay)
    .lte('date', lastDay)

  // Agrupar por categoría
  const byCategory: Record<string, { name: string; color: string | null; total: number }> = {}
  for (const t of transactions ?? []) {
    const cat = t.category as unknown as { id: string; name: string; parent_id: string | null; color: string | null } | null
    if (!cat) continue
    const key = cat.id
    if (!byCategory[key]) {
      byCategory[key] = { name: cat.name, color: cat.color, total: 0 }
    }
    byCategory[key].total += Number(t.amount)
  }

  const sorted = Object.entries(byCategory).sort(([, a], [, b]) => b.total - a.total)
  const totalGastos = sorted.reduce((s, [, v]) => s + v.total, 0)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <Card>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300 font-medium">Total gastos del mes</span>
          <span className="text-red-400 font-bold">{formatCurrency(totalGastos)}</span>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {sorted.length === 0 ? (
          <p className="text-center text-slate-400 py-12 text-sm">
            Sin gastos registrados este mes.
          </p>
        ) : (
          <div className="divide-y divide-slate-800">
            {sorted.map(([id, { name, color, total }]) => {
              const pct = totalGastos > 0 ? (total / totalGastos) * 100 : 0
              return (
                <div key={id} className="px-4 py-3">
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-200 font-medium">{name}</span>
                    <span className="text-slate-400">{formatCurrency(total)}</span>
                  </div>
                  <ProgressBar
                    value={pct}
                    barClassName={color ? '' : undefined}
                    showLabel
                  />
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
