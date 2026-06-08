import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDailySummaryForUser } from '@/lib/email/send'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: configs } = await supabase.from('config').select('user_id')
  if (!configs?.length) {
    return NextResponse.json({ sent: 0, reason: 'no users found' })
  }

  let sent = 0
  for (const { user_id } of configs) {
    const result = await sendDailySummaryForUser(user_id)
    if (result.success) sent++
  }

  return NextResponse.json({ sent })
}
