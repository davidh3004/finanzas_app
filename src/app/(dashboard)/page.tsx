import { createClient } from '@/lib/supabase/server'
import { formatCurrency, calcMonthsToGoal } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Wallet, TrendingDown, TrendingUp, Target, Clock, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: config },
    { data: accounts },
    { data: funds },
    { data: ingresosTx },
    { data: gastosTx },
    { data: pendientes },
    { data: budgets },
    { data: allCategories },
    { data: rules },
  ] = await Promise.all([
    supabase.from('config').select('*').eq('user_id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('funds').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('transactions').select('amount')
      .eq('user_id', user.id).eq('type', 'income').eq('status', 'confirmed')
      .gte('date', firstDay).lte('date', lastDay),
    supabase.from('transactions').select('amount, category_id')
      .eq('user_id', user.id).eq('type', 'expense').eq('status', 'confirmed')
      .gte('date', firstDay).lte('date', lastDay),
    supabase.from('transactions').select('id, amount, merchant, description, date')
      .eq('user_id', user.id).eq('status', 'pending_review')
      .order('created_at', { ascending: false }).limit(4),
    supabase.from('budgets').select('category_id, amount')
      .eq('user_id', user.id).eq('period', 'monthly'),
    supabase.from('categories').select('id, name, color, parent_id, kind')
      .eq('user_id', user.id).eq('is_active', true),
    supabase.from('allocation_rules').select('*')
      .eq('user_id', user.id).eq('is_active', true).order('priority'),
  ])

  // ── Totales del mes ──────────────────────────────────────
  const totalIngresos = (ingresosTx ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const totalGastos   = (gastosTx   ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const disponible    = totalIngresos - totalGastos

  const patrimonioNeto = (accounts ?? [])
    .filter(a => a.type !== 'credit_card')
    .reduce((s, a) => s + Number(a.current_balance), 0)

  // ── Gastos por categoría padre (para presupuesto) ────────
  const parentMap: Record<string, string | null> = {}
  for (const c of allCategories ?? []) parentMap[c.id] = c.parent_id

  const spentByParent: Record<string, number> = {}
  for (const t of gastosTx ?? []) {
    if (!t.category_id) continue
    const parentId = parentMap[t.category_id] ?? t.category_id
    spentByParent[parentId] = (spentByParent[parentId] ?? 0) + Number(t.amount)
  }

  const budgetMap: Record<string, number> = {}
  for (const b of budgets ?? []) budgetMap[b.category_id] = Number(b.amount)

  // Top categorías con presupuesto definido, ordenadas por % usado
  const parentCategories = (allCategories ?? []).filter(c => !c.parent_id && c.kind !== 'transfer' && c.kind !== 'income')
  const budgetRows = parentCategories
    .filter(c => budgetMap[c.id])
    .map(c => ({
      id:     c.id,
      name:   c.name,
      color:  c.color,
      spent:  spentByParent[c.id] ?? 0,
      budget: budgetMap[c.id],
      pct:    ((spentByParent[c.id] ?? 0) / budgetMap[c.id]) * 100,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4)

  // ── Reparto del ingreso ──────────────────────────────────
  const ingresoNeto  = Number(config?.ingreso_neto  ?? 0)
  const ingresoBruto = Number(config?.ingreso_bruto ?? 0)

  const reparto = (rules ?? []).map(r => {
    const base   = r.calc_base === 'bruto' ? ingresoBruto : ingresoNeto
    const amount = r.calc_type === 'percentage' ? (Number(r.value) / 100) * base : Number(r.value)
    return { name: r.name as string, amount }
  })
  const totalAsignado = reparto.reduce((s, r) => s + r.amount, 0)
  const remanente     = ingresoNeto - totalAsignado

  const mes = now.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* ── Stats principales ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Patrimonio neto"
          value={formatCurrency(patrimonioNeto)}
          icon={Wallet}
          className="col-span-2 lg:col-span-1"
        />
        <StatCard
          label="Ingresos del mes"
          value={formatCurrency(totalIngresos)}
          icon={TrendingUp}
          valueClassName="text-emerald-400"
        />
        <StatCard
          label="Gastos del mes"
          value={formatCurrency(totalGastos)}
          icon={TrendingDown}
          valueClassName="text-red-400"
        />
        <StatCard
          label="Disponible"
          value={formatCurrency(disponible)}
          sublabel={mes}
          valueClassName={disponible >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {/* ── Presupuesto vs real ─────────────────────────── */}
      {budgetRows.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">Presupuesto del mes</CardTitle>
            <Link href="/presupuestos" className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              Ver todo <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {budgetRows.map(row => (
              <div key={row.id}>
                <div className="flex justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color ?? '#64748b' }} />
                    <span className="text-slate-300 font-medium">{row.name}</span>
                  </div>
                  <span className={cn(
                    'font-medium',
                    row.pct >= 100 ? 'text-red-400' : row.pct >= 80 ? 'text-yellow-400' : 'text-slate-400'
                  )}>
                    {formatCurrency(row.spent)} / {formatCurrency(row.budget)}
                  </span>
                </div>
                <ProgressBar value={row.pct} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Fondos ──────────────────────────────────────── */}
      {(funds?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">Fondos</CardTitle>
            <Link href="/fondos" className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {funds?.map(fund => {
              const pct    = fund.target_amount > 0 ? (Number(fund.current_amount) / Number(fund.target_amount)) * 100 : 0
              const rate   = Number(fund.projection_rate)
              const months = calcMonthsToGoal(Number(fund.current_amount), Number(fund.target_amount), 0, rate)
              return (
                <div key={fund.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">{fund.name}</span>
                    <div className="flex items-center gap-2">
                      {months > 0 && months !== Infinity && Number(fund.current_amount) < Number(fund.target_amount) && (
                        <span className="text-slate-600">~{months}m</span>
                      )}
                      <span className="text-slate-400">
                        {formatCurrency(fund.current_amount, fund.currency)} / {formatCurrency(fund.target_amount, fund.currency)}
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={pct} />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Reparto del ingreso ─────────────────────────── */}
      {reparto.length > 0 && ingresoNeto > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">Reparto del ingreso</CardTitle>
            <Link href="/configuracion" className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              Editar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="text-xs text-slate-500 mb-3">
            Neto mensual: {formatCurrency(ingresoNeto)}
          </div>
          <div className="space-y-1.5">
            {reparto.map(r => {
              const pct = ingresoNeto > 0 ? (r.amount / ingresoNeto) * 100 : 0
              return (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-28 flex-shrink-0 truncate">{r.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-20 text-right flex-shrink-0">
                    {formatCurrency(r.amount)}
                  </span>
                </div>
              )
            })}
            <div className="flex items-center gap-3 pt-1 border-t border-slate-800 mt-1">
              <span className="text-sm text-slate-300 w-28 flex-shrink-0">Para gastar</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', remanente >= 0 ? 'bg-slate-500' : 'bg-red-500')}
                  style={{ width: `${Math.min(Math.max((remanente / ingresoNeto) * 100, 0), 100)}%` }}
                />
              </div>
              <span className={cn('text-xs font-semibold w-20 text-right flex-shrink-0',
                remanente >= 0 ? 'text-slate-300' : 'text-red-400')}>
                {formatCurrency(remanente)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Pendientes de revisión ──────────────────────── */}
      {(pendientes?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="mb-0">Pendientes de revisión</CardTitle>
              <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded-full px-2 py-0.5 font-medium">
                {pendientes?.length}
              </span>
            </div>
            <Link href="/movimientos?filtro=pending_review" className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              Revisar <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-0 divide-y divide-slate-800">
            {pendientes?.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {t.merchant ?? t.description ?? 'Sin nombre'}
                    </p>
                    <p className="text-xs text-slate-500">{t.date}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white ml-3 flex-shrink-0">
                  {formatCurrency(Number(t.amount))}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Fase actual ─────────────────────────────────── */}
      {config && (
        <Card className="bg-emerald-950/30 border-emerald-900/50">
          <div className="flex items-center gap-3">
            <Target className="w-7 h-7 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">
                Fase actual: {config.fase_actual === 1 ? 'Emergencia' : 'Inversión'}
              </p>
              <p className="text-sm text-slate-300 mt-0.5">
                {config.fase_actual === 1
                  ? 'Prioridad: llenar el fondo de emergencia (RD$85,000)'
                  : 'Prioridad: invertir en VOO a largo plazo'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
