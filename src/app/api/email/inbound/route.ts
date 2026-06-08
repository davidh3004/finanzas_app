/**
 * Inbound email webhook — auto-creates transactions from card notification emails.
 *
 * Setup (once):
 * 1. Create a free Postmark account at postmarkapp.com
 * 2. Go to your server → Message Streams → Inbound stream → get your inbound address
 *    (e.g. abcd1234@inbound.postmarkapp.com)
 * 3. In Gmail, create a filter: from:(alertas@bancopopular.com.do OR your bank's sender)
 *    → Forward to your Postmark inbound address
 * 4. In Postmark → Inbound Settings → Webhook URL:
 *    https://<your-app>.vercel.app/api/email/inbound
 * 5. Add these Vercel env vars:
 *    POSTMARK_WEBHOOK_TOKEN  — any secret string you choose (set it in Postmark too)
 *    SHORTCUTS_USER_ID       — your Supabase user UUID (shared with Shortcuts endpoint)
 *    EMAIL_DEFAULT_ACCOUNT_ID — fallback account UUID when card last4 doesn't match
 *
 * To store last4 on an account, add {"last4":"1234"} to that account's metadata field in Supabase.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { categorizeTransaction, matchCategorizationRules } from '@/lib/ai/categorizer'

export const dynamic = 'force-dynamic'

interface ParsedTransaction {
  merchant:   string | null
  amount:     number | null
  currency:   'DOP' | 'USD'
  type:       'expense' | 'income'
  date:       string
  card_last4: string | null
}

async function parseEmailWithClaude(subject: string, body: string): Promise<ParsedTransaction | null> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const today = new Date().toISOString().split('T')[0]

  const prompt = `Analiza este correo de notificación de tarjeta de crédito/débito de un banco dominicano y extrae los datos de la transacción.

Asunto: ${subject}
Cuerpo: ${body.slice(0, 2000)}

Extrae ÚNICAMENTE estos campos en JSON válido, sin texto adicional:
{
  "merchant": "nombre del comercio o establecimiento (null si no se menciona)",
  "amount": 1500.00,
  "currency": "DOP o USD según el símbolo (RD$ = DOP, US$ o $ = USD)",
  "type": "expense si es compra/débito/cargo, income si es abono/crédito/reverso",
  "date": "${today}",
  "card_last4": "últimos 4 dígitos de la tarjeta (null si no se menciona)"
}

Reglas:
- amount debe ser número positivo sin símbolo de moneda
- Si no puedes determinar un campo con certeza, usa null (excepto currency y type que tienen valores por defecto)
- date en formato YYYY-MM-DD; si no hay fecha en el email usa ${today}`

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    // Strip markdown code fences if present
    const json = text.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
    return JSON.parse(json) as ParsedTransaction
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // Validate webhook token
  const token = process.env.POSTMARK_WEBHOOK_TOKEN
  if (token && req.headers.get('x-postmark-token') !== token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = process.env.SHORTCUTS_USER_ID
  if (!userId) {
    return NextResponse.json({ error: 'SHORTCUTS_USER_ID not configured' }, { status: 503 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await req.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subject  = String(payload.Subject ?? '')
  const textBody = String(payload.TextBody ?? payload.StrippedTextReply ?? '')

  if (!textBody) {
    return NextResponse.json({ skipped: true, reason: 'empty body' })
  }

  const parsed = await parseEmailWithClaude(subject, textBody)
  if (!parsed || !parsed.amount || parsed.amount <= 0) {
    return NextResponse.json({ skipped: true, reason: 'could not parse transaction from email' })
  }

  const supabase = createAdminClient()

  // Match card last4 to an account
  let accountId = process.env.EMAIL_DEFAULT_ACCOUNT_ID ?? null
  if (parsed.card_last4) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, metadata')
      .eq('user_id', userId)
      .eq('is_active', true)

    const matched = (accounts ?? []).find(a => {
      const meta = a.metadata as Record<string, string> | null
      return meta?.last4 === parsed.card_last4
    })
    if (matched) accountId = matched.id
  }

  if (!accountId) {
    return NextResponse.json({ skipped: true, reason: 'no matching account found and no default set' })
  }

  // AI categorisation (best-effort)
  let categoryId: string | null = null
  try {
    const [{ data: rules }, { data: categories }] = await Promise.all([
      supabase.from('categorization_rules').select('pattern, category_id, match_type, confidence')
        .eq('user_id', userId).eq('is_active' as string, true).order('confidence', { ascending: false }),
      supabase.from('categories').select('id, name, kind, parent_id')
        .eq('user_id', userId).eq('is_active', true),
    ])

    const ruleMatch = matchCategorizationRules(parsed.merchant, null, rules ?? [])
    if (ruleMatch && ruleMatch.confidence >= 0.8) {
      categoryId = ruleMatch.category_id
    } else if (parsed.merchant && categories) {
      const result = await categorizeTransaction({
        transaction: { merchant: parsed.merchant, amount: parsed.amount, type: parsed.type, date: parsed.date },
        categories: categories.map(c => ({ id: c.id, name: c.name, kind: c.kind })),
      })
      if (result.confidence >= 0.6) categoryId = result.category_id
    }
  } catch { /* best-effort */ }

  const { data: txId, error } = await supabase.rpc('create_transaction_with_balance', {
    p_user_id:                 userId,
    p_date:                    parsed.date,
    p_amount:                  parsed.amount,
    p_currency:                parsed.currency,
    p_type:                    parsed.type,
    p_category_id:             categoryId,
    p_account_id:              accountId,
    p_counterparty_account_id: null,
    p_description:             `Auto-importado vía email`,
    p_merchant:                parsed.merchant,
    p_source:                  'auto_email',
    p_status:                  'pending_review',
    p_ai_category_suggestion:  categoryId,
    p_ai_confidence:           null,
  })

  if (error) {
    console.error('[email/inbound] RPC error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Generate alerts (non-blocking)
  try { await supabase.rpc('generate_user_alerts', { p_user_id: userId }) } catch (_) {}

  return NextResponse.json({ success: true, transaction_id: txId })
}
