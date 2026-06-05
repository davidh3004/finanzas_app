'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface AllocationRuleInput {
  name: string
  priority: number
  calcType: 'percentage' | 'fixed'
  calcBase: 'bruto' | 'neto'
  value: number
  destination: 'fund' | 'account' | 'category'
  destinationId: string
}

export async function createAllocationRule(
  input: AllocationRuleInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.from('allocation_rules').insert({
    user_id:        user.id,
    name:           input.name,
    priority:       input.priority,
    calc_type:      input.calcType,
    calc_base:      input.calcBase,
    value:          input.value,
    destination:    input.destination,
    destination_id: input.destinationId,
    is_active:      true,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracion')
  revalidatePath('/')
  return { success: true }
}

export async function updateAllocationRule(
  id: string,
  input: AllocationRuleInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('allocation_rules')
    .update({
      name:           input.name,
      priority:       input.priority,
      calc_type:      input.calcType,
      calc_base:      input.calcBase,
      value:          input.value,
      destination:    input.destination,
      destination_id: input.destinationId,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracion')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAllocationRule(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('allocation_rules')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracion')
  revalidatePath('/')
  return { success: true }
}

export async function updateConfig(
  ingresoNeto: number,
  ingresoBruto: number,
  tasaUsdDop: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('config')
    .update({ ingreso_neto: ingresoNeto, ingreso_bruto: ingresoBruto, tasa_usd_dop: tasaUsdDop })
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/configuracion')
  return { success: true }
}
