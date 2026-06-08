import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildDailySummaryHtml } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

// Vercel cron & manual test both hit this endpoint.
// Protect it with CRON_SECRET so only authorized callers can trigger it.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }

  const toEmail = process.env.REPORT_TO_EMAIL ?? 'henriquezdavid3004@gmail.com'
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tu-app.vercel.app'

  const supabase = createAdminClient()

  // Get all user IDs that have a config row (= active users)
  const { data: configs } = await supabase.from('config').select('user_id')
  if (!configs?.length) {
    return NextResponse.json({ sent: 0, reason: 'no users found' })
  }

  const now        = new Date()
  const firstDay   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay    = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const dateLabel  = now.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const resend = new Resend(resendKey)
  let sent = 0

  for (const { user_id } of configs) {
    // 1. Generate fresh alerts
    try { await supabase.rpc('generate_user_alerts', { p_user_id: user_id }) } catch (_) {}

    // 2. Fetch unread alerts (newest 10)
    const { data: alertRows } = await supabase
      .from('alerts')
      .select('type, title, message')
      .eq('user_id', user_id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // 3. Monthly income & expenses
    const { data: ingresosTx } = await supabase
      .from('transactions')
      .select('amount')
      .eq('user_id', user_id)
      .eq('type', 'income')
      .eq('status', 'confirmed')
      .gte('date', firstDay)
      .lte('date', lastDay)

    const { data: gastosTx } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .eq('user_id', user_id)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('date', firstDay)
      .lte('date', lastDay)

    const ingresos   = (ingresosTx ?? []).reduce((s, t) => s + Number(t.amount), 0)
    const gastos     = (gastosTx   ?? []).reduce((s, t) => s + Number(t.amount), 0)
    const disponible = ingresos - gastos

    // 4. Budget vs spent
    const { data: budgets }   = await supabase.from('budgets').select('category_id, amount').eq('user_id', user_id).eq('period', 'monthly')
    const { data: categories } = await supabase.from('categories').select('id, name, parent_id').eq('user_id', user_id).eq('is_active', true)

    const parentMap: Record<string, string | null> = {}
    for (const c of categories ?? []) parentMap[c.id] = c.parent_id

    const spentByParent: Record<string, number> = {}
    for (const t of gastosTx ?? []) {
      if (!t.category_id) continue
      const parentId = parentMap[t.category_id] ?? t.category_id
      spentByParent[parentId] = (spentByParent[parentId] ?? 0) + Number(t.amount)
    }

    const budgetRows = (budgets ?? [])
      .map(b => {
        const cat = (categories ?? []).find(c => c.id === b.category_id)
        const spent  = spentByParent[b.category_id] ?? 0
        const budget = Number(b.amount)
        return { name: cat?.name ?? '—', spent, budget, pct: budget > 0 ? (spent / budget) * 100 : 0 }
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)

    // 5. Build and send email
    const html = buildDailySummaryHtml({
      date:       dateLabel,
      ingresos,
      gastos,
      disponible,
      alerts:     (alertRows ?? []) as { type: string; title: string; message: string }[],
      budgetRows,
      appUrl,
    })

    const from = process.env.RESEND_FROM_EMAIL ?? 'Finanzas <onboarding@resend.dev>'

    const { error } = await resend.emails.send({
      from,
      to:      toEmail,
      subject: `Resumen diario — ${dateLabel}`,
      html,
    })

    if (!error) sent++
  }

  return NextResponse.json({ sent, date: dateLabel })
}
