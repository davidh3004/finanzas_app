'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAlertRead(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('alerts')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/alertas')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markAllAlertsRead(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('alerts')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)

  if (error) return { success: false, error: error.message }
  revalidatePath('/alertas')
  revalidatePath('/', 'layout')
  return { success: true }
}
