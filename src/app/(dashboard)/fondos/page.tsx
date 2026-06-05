import { createClient } from '@/lib/supabase/server'
import { formatCurrency, calcMonthsToGoal } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Target, TrendingUp, Umbrella } from 'lucide-react'
import type { FundType } from '@/types/database'

const fundIcon: Record<FundType, React.ElementType> = {
  emergency:  Umbrella,
  investment: TrendingUp,
  saving:     Target,
}

const fundColor: Record<FundType, string> = {
  emergency:  'text-yellow-400',
  investment: 'text-emerald-400',
  saving:     'text-blue-400',
}

export default async function FondosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: funds } = await supabase
    .from('funds')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('type')

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {(funds?.length ?? 0) === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-12">
            No hay fondos configurados. Agrégalos en Configuración.
          </p>
        </Card>
      ) : (
        funds?.map((fund) => {
          const Icon = fundIcon[fund.type as FundType] ?? Target
          const colorClass = fundColor[fund.type as FundType] ?? 'text-slate-400'
          const current = Number(fund.current_amount)
          const target  = Number(fund.target_amount)
          const pct     = target > 0 ? (current / target) * 100 : 0
          const months  = calcMonthsToGoal(current, target, 0, Number(fund.projection_rate))
          const rate    = Number(fund.projection_rate)

          return (
            <Card key={fund.id}>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl bg-slate-800 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-white">{fund.name}</h3>
                    <span className="text-xs text-slate-500 capitalize">{fund.type}</span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-2">
                      <span className={`font-bold text-lg ${colorClass}`}>
                        {formatCurrency(current, fund.currency)}
                      </span>
                      <span className="text-slate-400">
                        meta: {formatCurrency(target, fund.currency)}
                      </span>
                    </div>
                    <ProgressBar value={pct} showLabel label={`${pct.toFixed(1)}%`} />
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-800 flex gap-4 text-xs text-slate-400">
                    {rate > 0 && (
                      <span>Tasa: {(rate * 100).toFixed(1)}% anual</span>
                    )}
                    {target > current && months !== Infinity && months > 0 && (
                      <span>
                        Proyección: ~{months} {months === 1 ? 'mes' : 'meses'} para llenar
                      </span>
                    )}
                    {current >= target && (
                      <span className="text-emerald-400 font-medium">✓ Meta alcanzada</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        })
      )}
    </div>
  )
}
