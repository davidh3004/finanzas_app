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

  let txQuery = supabase
    .from('transactions')
    .select(`
      *,
      category:categories(id, name, color),
      account:accounts!transactions_account_id_fkey(id, name)
    `)
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
    { data: transactions },
    { data: accounts },
    { data: categories },
    { data: pending },
  ] = await Promise.all([
    txQuery,
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('categories').select('*').eq('user_id', user.id).eq('is_active', true).order('sort_order'),
    supabase.from('transactions')
      .select(`
        *,
        category:categories(id, name),
        account:accounts!transactions_account_id_fkey(id, name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'pending_review')
      .order('created_at', { ascending: false }),
  ])

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
      />
    </div>
  )
}
