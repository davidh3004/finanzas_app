import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import MovimientosClient from '@/components/transactions/MovimientosClient'

export const dynamic = 'force-dynamic'

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    filtro?: string
    nuevo?: string
    tipo?: string
    cuenta?: string
    categoria?: string
    desde?: string
    hasta?: string
    moneda?: string
  }>
}) {
  const params    = await searchParams
  const filtro    = params.filtro
  const openForm  = params.nuevo === '1'
  const tipo      = params.tipo
  const cuenta    = params.cuenta
  const categoria = params.categoria
  const desde     = params.desde
  const hasta     = params.hasta
  const moneda    = params.moneda

  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return null

  let txQuery = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(200)

  // Status filter
  if (filtro === 'confirmed') {
    txQuery = txQuery.eq('status', 'confirmed')
  } else if (filtro === 'pending_review') {
    txQuery = txQuery.eq('status', 'pending_review')
  } else {
    txQuery = txQuery.in('status', ['confirmed', 'pending_review'])
  }

  // New filters
  if (tipo)      txQuery = txQuery.eq('type', tipo)
  if (cuenta)    txQuery = txQuery.eq('account_id', cuenta)
  if (categoria) txQuery = txQuery.eq('category_id', categoria)
  if (desde)     txQuery = txQuery.gte('date', desde)
  if (hasta)     txQuery = txQuery.lte('date', hasta)
  if (moneda)    txQuery = txQuery.eq('currency', moneda)

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

  // When not filtering by status, separate pendientes from the main list
  const confirmedTx = filtro === 'pending_review'
    ? (transactions ?? [])
    : (transactions ?? []).filter(t => t.status === 'confirmed')

  const activeFilters = { filtro, tipo, cuenta, categoria, desde, hasta, moneda }

  return (
    <div className="max-w-3xl mx-auto">
      <MovimientosClient
        accounts={(accounts ?? []) as never}
        categories={(categories ?? []) as never}
        transactions={(confirmedTx ?? []) as never}
        pendingTransactions={(pending ?? []) as never}
        openForm={openForm}
        activeFilters={activeFilters}
        tasaUsdDop={Number(config?.tasa_usd_dop ?? 60)}
      />
    </div>
  )
}
