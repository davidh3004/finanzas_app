'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AccountType } from '@/types/database'

interface CreateAccountInput {
  name: string
  type: AccountType
  currency: string
  initialBalance: number
  color: string
}

export async function createAccount(
  input: CreateAccountInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.from('accounts').insert({
    user_id:         user.id,
    name:            input.name,
    type:            input.type,
    currency:        input.currency,
    current_balance: input.initialBalance,
    color:           input.color,
    is_active:       true,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/cuentas')

  return { success: true }
}

export async function updateAccountBalance(
  accountId: string,
  newBalance: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('accounts')
    .update({ current_balance: newBalance })
    .eq('id', accountId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/cuentas')
  revalidatePath('/')

  return { success: true }
}

export async function updateAccount(
  id: string,
  input: { name: string; color: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('accounts')
    .update({ name: input.name, color: input.color })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/cuentas')
  revalidatePath('/tarjetas')
  revalidatePath('/')
  return { success: true }
}

export async function deleteAccount(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/cuentas')
  revalidatePath('/tarjetas')
  revalidatePath('/')
  return { success: true }
}
