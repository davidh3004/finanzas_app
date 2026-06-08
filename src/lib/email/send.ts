import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildDailySummaryHtml } from './templates'

export async function sendDailySummaryForUser(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return { success: false, error: 'RESEND_API_KEY no configurado' }

  const toEmail = process.env.REPORT_TO_EMAIL ?? 'henriquezdavid3004@gmail.com'
  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? ''
  // Use plain onboarding@resend.dev for testing (no custom domain needed).
  // To use your own domain, verify it at resend.com/domains and set
  // RESEND_FROM_EMAIL=Finanzas <noreply@yourdomain.com>
  const from    = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  const supabase = createAdminClient()

  const now       = new Date()
  const firstDay  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  const dateLabel = now.toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  // 1. Generate fresh alerts
  try { await supabase.rpc('generate_user_alerts', { p_user_id: userId }) } catch (_) {}

  // 2. Unread alerts
  const { data: alertRows } = await supabase
    .from('alerts')
    .select('type, title, message')
    .eq('user_id', userId)
    .eq('read', false)
    .order('created_at', { ascending: false })
    .limit(10)

  // 3. Monthly income & expenses
  const [{ data: ingresosTx }, { data: gastosTx }] = await Promise.all([
    supabase.from('transactions').select('amount')
      .eq('user_id', userId).eq('type', 'income').eq('status', 'confirmed')
      .gte('date', firstDay).lte('date', lastDay),
    supabase.from('transactions').select('amount, category_id')
      .eq('user_id', userId).eq('type', 'expense').eq('status', 'confirmed')
      .gte('date', firstDay).lte('date', lastDay),
  ])

  const ingresos   = (ingresosTx ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const gastos     = (gastosTx   ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const disponible = ingresos - gastos

  // 4. Budget vs spent
  const [{ data: budgets }, { data: categories }] = await Promise.all([
    supabase.from('budgets').select('category_id, amount')
      .eq('user_id', userId).eq('period', 'monthly'),
    supabase.from('categories').select('id, name, parent_id')
      .eq('user_id', userId).eq('is_active', true),
  ])

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
      const cat    = (categories ?? []).find(c => c.id === b.category_id)
      const spent  = spentByParent[b.category_id] ?? 0
      const budget = Number(b.amount)
      return { name: cat?.name ?? '—', spent, budget, pct: budget > 0 ? (spent / budget) * 100 : 0 }
    })
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5)

  // 5. Build and send
  const html = buildDailySummaryHtml({
    date: dateLabel, ingresos, gastos, disponible,
    alerts:     (alertRows ?? []) as { type: string; title: string; message: string }[],
    budgetRows,
    appUrl,
  })

  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from,
    to:      toEmail,
    subject: `Resumen diario — ${dateLabel}`,
    html,
  })

  if (error) {
    const hint = error.message.toLowerCase().includes('domain')
      ? ' — verifica el dominio en resend.com/domains o deja RESEND_FROM_EMAIL vacío para usar onboarding@resend.dev'
      : ''
    return { success: false, error: error.message + hint }
  }
  return { success: true }
}
