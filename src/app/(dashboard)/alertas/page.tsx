import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import AlertasClient from '@/components/alertas/AlertasClient'

export const dynamic = 'force-dynamic'

export default async function AlertasPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return null

  const { data: alerts } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const emailConfigured = !!(process.env.RESEND_API_KEY)

  return <AlertasClient alerts={alerts ?? []} emailConfigured={emailConfigured} />
}
