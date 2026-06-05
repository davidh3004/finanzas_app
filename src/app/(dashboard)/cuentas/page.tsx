import { createClient } from '@/lib/supabase/server'
import CuentasClient from '@/components/accounts/CuentasClient'

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
    .order('name')

  const list = accounts ?? []

  const patrimonioNeto = list
    .filter(a => a.type !== 'credit_card')
    .reduce((s, a) => s + Number(a.current_balance), 0)

  const deudaTarjeta = list
    .filter(a => a.type === 'credit_card')
    .reduce((s, a) => s + Math.abs(Number(a.current_balance)), 0)

  return (
    <CuentasClient
      accounts={list as never}
      patrimonioNeto={patrimonioNeto}
      deudaTarjeta={deudaTarjeta}
    />
  )
}
