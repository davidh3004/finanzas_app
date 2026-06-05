import { createClient } from '@/lib/supabase/server'
import FondosClient from '@/components/funds/FondosClient'

export default async function FondosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: funds }, { data: accounts }] = await Promise.all([
    supabase.from('funds').select('*').eq('user_id', user.id).eq('is_active', true).order('type').order('name'),
    supabase.from('accounts').select('*').eq('user_id', user.id).eq('is_active', true).order('name'),
  ])

  return (
    <FondosClient
      funds={(funds ?? []) as never}
      accounts={(accounts ?? []) as never}
    />
  )
}
