'use server'

import { createClient } from '@/lib/supabase/server'

export async function sendDailySummary(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const secret = process.env.CRON_SECRET ?? ''

  // Call the cron endpoint internally
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) headers['Authorization'] = `Bearer ${secret}`

  try {
    const res = await fetch(`${appUrl}/api/cron/daily-summary`, { headers })
    const body = await res.json() as { sent?: number; error?: string }
    if (!res.ok) return { success: false, error: body.error ?? `HTTP ${res.status}` }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
