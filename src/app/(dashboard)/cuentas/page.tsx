import { createClient } from '@/lib/supabase/server'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { Wallet, TrendingUp, CreditCard, PiggyBank, Banknote } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountType } from '@/types/database'

const typeLabel: Record<AccountType, string> = {
  checking:        'Cuenta corriente',
  savings:         'Cuenta de ahorros',
  investment_fund: 'Fondo de inversión',
  brokerage:       'Corretaje',
  credit_card:     'Tarjeta de crédito',
  cash:            'Efectivo',
}

const typeIcon: Record<AccountType, React.ElementType> = {
  checking:        Wallet,
  savings:         PiggyBank,
  investment_fund: TrendingUp,
  brokerage:       TrendingUp,
  credit_card:     CreditCard,
  cash:            Banknote,
}

export default async function CuentasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('type')

  const patrimonioNeto = (accounts ?? [])
    .filter(a => a.type !== 'credit_card')
    .reduce((s, a) => s + Number(a.current_balance), 0)

  const deudaTarjeta = (accounts ?? [])
    .filter(a => a.type === 'credit_card')
    .reduce((s, a) => s + Math.abs(Number(a.current_balance)), 0)

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Patrimonio neto</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(patrimonioNeto)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-xs text-slate-400">Deuda tarjetas</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(deudaTarjeta)}</p>
        </div>
      </div>

      {/* Lista de cuentas */}
      <Card className="p-0 overflow-hidden">
        {(accounts?.length ?? 0) === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No hay cuentas aún. Agrega una en Configuración.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {accounts?.map((account) => {
              const Icon = typeIcon[account.type as AccountType] ?? Wallet
              const isCC = account.type === 'credit_card'
              const balance = Number(account.current_balance)

              return (
                <div key={account.id} className="flex items-center gap-3 px-4 py-3">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{ backgroundColor: account.color ? `${account.color}20` : '#1e293b' }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: account.color ?? '#64748b' }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{account.name}</p>
                    <p className="text-xs text-slate-500">{typeLabel[account.type as AccountType]}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'text-sm font-semibold',
                      isCC
                        ? balance < 0 ? 'text-red-400' : 'text-slate-300'
                        : balance >= 0 ? 'text-white' : 'text-red-400'
                    )}>
                      {formatCurrency(Math.abs(balance), account.currency)}
                    </p>
                    <p className="text-xs text-slate-600">{account.currency}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
