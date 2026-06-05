import { createClient } from '@/lib/supabase/server'
import AllocationClient from '@/components/allocation/AllocationClient'

export default async function ConfiguracionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [
    { data: config },
    { data: rules },
    { data: accounts },
    { data: funds },
  ] = await Promise.all([
    supabase.from('config').select('*').eq('user_id', user.id).single(),
    supabase.from('allocation_rules').select('*').eq('user_id', user.id).eq('is_active', true).order('priority'),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
    supabase.from('funds').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
  ])

  return (
    <AllocationClient
      rules={(rules ?? []) as never}
      accounts={(accounts ?? []) as never}
      funds={(funds ?? []) as never}
      ingresoBruto={Number(config?.ingreso_bruto ?? 0)}
      ingresoNeto={Number(config?.ingreso_neto ?? 0)}
      tasaUsdDop={Number(config?.tasa_usd_dop ?? 60)}
    />
  )
}
