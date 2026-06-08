import { createClient } from '@/lib/supabase/server'
import MovimientosClient from '@/components/transactions/MovimientosClient'

export const dynamic = 'force-dynamic'

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; nuevo?: string }>
}) {
  const params = await searchParams
  const filtro  = params.filtro
  const openForm = params.nuevo === '1'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Query sin joins para evitar problemas con FK ambiguos
  let txQuery = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (filtro === 'confirmed') {
    txQuery = txQuery.eq('status', 'confirmed')
  } else if (filtro === 'pending_review') {
    txQuery = txQuery.eq('status', 'pending_review')
  } else {
    txQuery = txQuery.in('status', ['confirmed', 'pending_review'])
  }

  const [
    { data: transactions, error: txError },
    { data: accounts },
    { data: categories },
    { data: pending },
    { data: config },
  ] = await Promise.all([
    txQuery,
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('categories').select('*').eq('user_id', user.id).eq('is_active', true).order('sort_order'),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false }),
    supabase.from('config').select('tasa_usd_dop').eq('user_id', user.id).single(),
  ])

  if (txError) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <p className="text-red-400 text-sm">Error cargando movimientos: {txError.message}</p>
      </div>
    )
  }

  // Excluir pendientes de la lista principal si se muestra "Todos"
  const confirmedTx = filtro === 'pending_review'
    ? (transactions ?? [])
    : (transactions ?? []).filter(t => t.status === 'confirmed')

  return (
    <div className="max-w-3xl mx-auto">
      <MovimientosClient
        accounts={(accounts ?? []) as never}
        categories={(categories ?? []) as never}
        transactions={(confirmedTx ?? []) as never}
        pendingTransactions={(pending ?? []) as never}
        openForm={openForm}
        filtro={filtro}
        tasaUsdDop={Number(config?.tasa_usd_dop ?? 60)}
      />
    </div>
  )
}
