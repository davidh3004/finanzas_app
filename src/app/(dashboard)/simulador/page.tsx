import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import SimuladorClient from '@/components/simulador/SimuladorClient'

export default async function SimuladorPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return null

  const [
    { data: config },
    { data: funds },
    { data: rules },
  ] = await Promise.all([
    supabase.from('config').select('ingreso_neto, ingreso_bruto').eq('user_id', user.id).single(),
    supabase.from('funds').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('allocation_rules').select('*').eq('user_id', user.id).eq('is_active', true),
  ])

  const ingresoNeto  = Number(config?.ingreso_neto  ?? 0)
  const ingresoBruto = Number(config?.ingreso_bruto ?? 0)

  const emergencyFund  = funds?.find(f => f.type === 'emergency')
  const investmentFund = funds?.find(f => f.type === 'investment')

  // Ahorro mensual = suma de las reglas de reparto que van a fondos
  const ahorro = Math.round(
    (rules ?? []).reduce((sum, r) => {
      if (r.destination !== 'fund') return sum
      const base   = r.calc_base === 'bruto' ? ingresoBruto : ingresoNeto
      const amount = r.calc_type === 'percentage'
        ? (Number(r.value) / 100) * base
        : Number(r.value)
      return sum + amount
    }, 0)
  )

  return (
    <SimuladorClient
      defaultIngresoNeto={ingresoNeto}
      defaultAhorro={ahorro}
      defaultMetaEmergencia={Number(emergencyFund?.target_amount ?? 85000)}
      defaultSaldoEmergencia={Number(emergencyFund?.current_amount ?? 0)}
      defaultSaldoInversion={Number(investmentFund?.current_amount ?? 0)}
      defaultTasaVOO={Number(investmentFund?.projection_rate ?? 0.10) * 100}
    />
  )
}
