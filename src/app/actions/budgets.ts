'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertBudget(
  categoryId: string,
  amount: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.rpc('upsert_budget', {
    p_user_id:     user.id,
    p_category_id: categoryId,
    p_amount:      amount,
    p_period:      'monthly',
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/presupuestos')
  revalidatePath('/')
  return { success: true }
}

export async function deleteBudget(
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('user_id', user.id)
    .eq('category_id', categoryId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/presupuestos')
  revalidatePath('/')
  return { success: true }
}
