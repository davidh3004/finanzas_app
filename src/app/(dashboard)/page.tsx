import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardTitle } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Target,
  Clock,
  ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  // Todas las queries en paralelo
  const [
    { data: config },
    { data: accounts },
    { data: funds },
    { data: ingresosMes },
    { data: gastosMes },
    { data: pendientes },
  ] = await Promise.all([
    supabase.from('config').select('*').eq('user_id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('funds').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'income')
      .eq('status', 'confirmed')
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase.from('transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase.from('transactions')
      .select('id, amount, merchant, description, date, category_id')
      .eq('user_id', user.id)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const patrimonioNeto = (accounts ?? [])
    .filter(a => a.type !== 'credit_card')
    .reduce((sum, a) => sum + Number(a.current_balance), 0)

  const totalIngresos = (ingresosMes ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const totalGastos   = (gastosMes   ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const disponible    = totalIngresos - totalGastos
  const gastadoPct    = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0

  const mes = now.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Fila principal */}
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

      {/* Presupuesto del mes */}
      <Card>
        <CardTitle>Presupuesto del mes</CardTitle>
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">
              {formatCurrency(totalGastos)} <span className="text-slate-500">de</span> {formatCurrency(totalIngresos)}
            </span>
            <span className={gastadoPct >= 90 ? 'text-red-400' : 'text-slate-400'}>
              {gastadoPct.toFixed(0)}%
            </span>
          </div>
          <ProgressBar value={gastadoPct} showLabel={false} />
        </div>
      </Card>

      {/* Fondos */}
      {(funds?.length ?? 0) > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle className="mb-0">Fondos</CardTitle>
            <Link href="/fondos" className="text-xs text-emerald-400 flex items-center gap-1 hover:underline">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {funds?.map((fund) => {
              const pct = fund.target_amount > 0
                ? (Number(fund.current_amount) / Number(fund.target_amount)) * 100
                : 0
              return (
                <div key={fund.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-medium">{fund.name}</span>
                    <span className="text-slate-400 text-xs">
                      {formatCurrency(fund.current_amount)} / {formatCurrency(fund.target_amount)}
                    </span>
                  </div>
                  <ProgressBar value={pct} showLabel label={`${pct.toFixed(0)}%`} />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Pendientes de revisión */}
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
          <div className="space-y-2">
            {pendientes?.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">
                      {t.merchant ?? t.description ?? 'Movimiento sin nombre'}
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

      {/* Estado (fase) */}
      {config && (
        <Card className="bg-emerald-950/30 border-emerald-900/50">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8 text-emerald-400 flex-shrink-0" />
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
