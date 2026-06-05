'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { FundType } from '@/types/database'

interface FundInput {
  name: string
  type: FundType
  targetAmount: number
  currency: string
  projectionRate: number
  linkedAccountId?: string | null
}

export async function createFund(
  input: FundInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.from('funds').insert({
    user_id:           user.id,
    name:              input.name,
    type:              input.type,
    target_amount:     input.targetAmount,
    current_amount:    0,
    currency:          input.currency,
    projection_rate:   input.projectionRate / 100, // guardar como decimal
    linked_account_id: input.linkedAccountId ?? null,
    is_active:         true,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/fondos')
  revalidatePath('/')
  return { success: true }
}

export async function updateFund(
  id: string,
  input: FundInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('funds')
    .update({
      name:              input.name,
      type:              input.type,
      target_amount:     input.targetAmount,
      currency:          input.currency,
      projection_rate:   input.projectionRate / 100,
      linked_account_id: input.linkedAccountId ?? null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/fondos')
  revalidatePath('/')
  return { success: true }
}

export async function aportarFondo(
  id: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: fund } = await supabase
    .from('funds')
    .select('current_amount')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!fund) return { success: false, error: 'Fondo no encontrado' }

  const { error } = await supabase
    .from('funds')
    .update({ current_amount: Number(fund.current_amount) + amount })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/fondos')
  revalidatePath('/')
  return { success: true }
}
