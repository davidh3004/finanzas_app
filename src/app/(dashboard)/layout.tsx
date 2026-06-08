import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import AppLayout from '@/components/layout/AppLayout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const [user, { count: alertCount }] = await Promise.all([
    getUser(),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('read', false),
  ])

  if (!user) redirect('/login')

  return (
    <AppLayout alertCount={alertCount ?? 0}>
      {children}
    </AppLayout>
  )
}
