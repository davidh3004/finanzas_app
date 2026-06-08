'use server'

import { createClient } from '@/lib/supabase/server'
import { sendDailySummaryForUser } from '@/lib/email/send'

export async function sendDailySummary(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  return sendDailySummaryForUser(user.id)
}
