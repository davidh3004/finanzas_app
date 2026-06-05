import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card } from '@/components/ui/Card'
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Clock } from 'lucide-react'
import Link from 'next/link'
import type { TransactionType, TransactionStatus } from '@/types/database'
import { cn } from '@/lib/utils'

const typeIcon = {
  income: ArrowUpRight,
  expense: ArrowDownLeft,
  transfer: ArrowLeftRight,
} as const

const typeColor = {
  income: 'text-emerald-400',
  expense: 'text-red-400',
  transfer: 'text-slate-400',
} as const

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>
}) {
  const params = await searchParams
  const filtro = params.filtro as TransactionStatus | undefined

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  let query = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name, color, icon),
      account:accounts!transactions_account_id_fkey(id, name)
    `)
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (filtro) {
    query = query.eq('status', filtro)
  }

  const { data: transactions } = await query

  const pendingCount = transactions?.filter(t => t.status === 'pending_review').length ?? 0

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[
          { label: 'Todos', value: undefined },
          { label: 'Pendientes', value: 'pending_review' },
          { label: 'Confirmados', value: 'confirmed' },
        ].map(({ label, value }) => (
          <Link
            key={label}
            href={value ? `/movimientos?filtro=${value}` : '/movimientos'}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filtro === value || (!filtro && !value)
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-600'
            )}
          >
            {label}
            {label === 'Pendientes' && pendingCount > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black rounded-full px-1.5 py-0 text-[10px]">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        {(transactions?.length ?? 0) === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <p className="text-slate-400 text-sm">No hay movimientos aún.</p>
            <Link
              href="/movimientos?nuevo=1"
              className="mt-3 text-xs text-emerald-400 hover:underline"
            >
              Agregar el primero
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {transactions?.map((t) => {
              const Icon = typeIcon[t.type as TransactionType] ?? ArrowLeftRight
              const colorClass = typeColor[t.type as TransactionType] ?? 'text-slate-400'
              const isPending = t.status === 'pending_review'

              return (
                <div
                  key={t.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors',
                    isPending && 'bg-yellow-500/5'
                  )}
                >
                  {/* Icono */}
                  <div className={cn('p-2 rounded-xl bg-slate-800', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-100 truncate">
                        {t.merchant ?? t.description ?? 'Sin descripción'}
                      </p>
                      {isPending && (
                        <Clock className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-500">{formatDate(t.date)}</p>
                      {t.category && (
                        <>
                          <span className="text-slate-700">·</span>
                          <p className="text-xs text-slate-500 truncate">{(t.category as {name: string}).name}</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Monto */}
                  <div className="text-right flex-shrink-0">
                    <p className={cn('text-sm font-semibold', colorClass)}>
                      {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                      {formatCurrency(Number(t.amount), t.currency)}
                    </p>
                    <p className="text-xs text-slate-600">{t.currency}</p>
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
