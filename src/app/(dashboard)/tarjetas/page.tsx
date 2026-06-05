import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { CreditCard, AlertTriangle } from 'lucide-react'

export default async function TarjetasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: cards } = await supabase
    .from('credit_cards')
    .select(`*, account:accounts(*)`)
    .eq('user_id', user.id)
    .eq('status', 'active')

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {(cards?.length ?? 0) === 0 ? (
        <Card>
          <p className="text-center text-slate-400 py-12">
            No hay tarjetas activas. Agrégalas en Configuración.
          </p>
        </Card>
      ) : (
        cards?.map((card) => {
          const balance   = Math.abs(Number(card.account?.current_balance ?? 0))
          const limit     = Number(card.credit_limit)
          const utilPct   = limit > 0 ? (balance / limit) * 100 : 0
          const isHighUtil = utilPct > 30

          return (
            <Card key={card.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-800">
                  <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{card.account?.name}</h3>
                  <p className="text-xs text-slate-500">
                    Corte: día {card.cut_day} · Pago: día {card.due_day}
                  </p>
                </div>
                {isHighUtil && (
                  <AlertTriangle className="ml-auto w-4 h-4 text-yellow-400" />
                )}
              </div>

              {/* Utilización */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Utilización</span>
                  <span className={isHighUtil ? 'text-yellow-400 font-medium' : 'text-slate-300'}>
                    {utilPct.toFixed(1)}%
                  </span>
                </div>
                <ProgressBar value={utilPct} />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Usado: {formatCurrency(balance)}</span>
                  <span>Límite: {formatCurrency(limit)}</span>
                </div>
              </div>

              {/* Cashback rules */}
              {Object.keys(card.cashback_rules).length > 0 && (
                <div className="pt-3 border-t border-slate-800">
                  <p className="text-xs font-medium text-slate-400 mb-2">Cashback</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(card.cashback_rules).map(([cat, pct]) => (
                      <span
                        key={cat}
                        className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5"
                      >
                        {cat}: {String(pct)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )
        })
      )}
    </div>
  )
}
