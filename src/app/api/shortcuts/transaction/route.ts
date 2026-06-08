/**
 * iOS Shortcuts integration — create a transaction without a browser session.
 *
 * Setup (once):
 * 1. Add SHORTCUTS_SECRET and SHORTCUTS_USER_ID to your Vercel env vars.
 * 2. In iOS Shortcuts, create a "Get Contents of URL" action:
 *      URL:    https://<your-app>.vercel.app/api/shortcuts/transaction
 *      Method: POST
 *      Headers: Authorization: Bearer <SHORTCUTS_SECRET>
 *               Content-Type: application/json
 *      Body (JSON):
 *        {
 *          "merchant":    "<Ask for Input>",
 *          "amount":      <Ask for Number>,
 *          "currency":    "DOP",
 *          "type":        "expense",
 *          "account_id":  "<your account UUID>",
 *          "date":        "<Current Date, format YYYY-MM-DD>"
 *        }
 * 3. The shortcut can show the response to confirm success.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { categorizeTransaction, matchCategorizationRules } from '@/lib/ai/categorizer'

export const dynamic = 'force-dynamic'

interface ShortcutPayload {
  merchant?:    string
  amount:       number
  currency?:    string
  type?:        string
  account_id:   string
  date?:        string
  description?: string
}

export async function POST(req: NextRequest) {
  // Auth
  const secret = process.env.SHORTCUTS_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'SHORTCUTS_SECRET not configured' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = process.env.SHORTCUTS_USER_ID
  if (!userId) {
    return NextResponse.json({ error: 'SHORTCUTS_USER_ID not configured' }, { status: 503 })
  }

  let body: ShortcutPayload
  try {
    body = await req.json() as ShortcutPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.amount || body.amount <= 0) {
    return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
  }
  if (!body.account_id) {
    return NextResponse.json({ error: 'account_id is required' }, { status: 400 })
  }

  const supabase  = createAdminClient()
  const currency  = (body.currency ?? 'DOP').toUpperCase()
  const type      = (body.type ?? 'expense') as 'income' | 'expense' | 'transfer'
  const date      = body.date ?? new Date().toISOString().split('T')[0]
  const merchant  = body.merchant?.trim() ?? null

  // AI categorisation
  let categoryId: string | null = null
  try {
    const [{ data: rules }, { data: categories }] = await Promise.all([
      supabase.from('categorization_rules').select('pattern, category_id, match_type, confidence')
        .eq('user_id', userId).eq('is_active' as string, true).order('confidence', { ascending: false }),
      supabase.from('categories').select('id, name, kind, parent_id')
        .eq('user_id', userId).eq('is_active', true),
    ])

    const ruleMatch = matchCategorizationRules(merchant, body.description ?? null, rules ?? [])
    if (ruleMatch && ruleMatch.confidence >= 0.8) {
      categoryId = ruleMatch.category_id
    } else if (merchant && categories) {
      const result = await categorizeTransaction({
        transaction: { merchant, amount: body.amount, type, date, description: body.description },
        categories: categories.map(c => ({ id: c.id, name: c.name, kind: c.kind })),
      })
      if (result.confidence >= 0.6) categoryId = result.category_id
    }
  } catch { /* categorisation is best-effort */ }

  // Create transaction
  const { data: txId, error } = await supabase.rpc('create_transaction_with_balance', {
    p_user_id:                 userId,
    p_date:                    date,
    p_amount:                  body.amount,
    p_currency:                currency,
    p_type:                    type,
    p_category_id:             categoryId,
    p_account_id:              body.account_id,
    p_counterparty_account_id: null,
    p_description:             body.description ?? null,
    p_merchant:                merchant,
    p_source:                  'manual',
    p_status:                  'pending_review',
    p_ai_category_suggestion:  categoryId,
    p_ai_confidence:           null,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success:        true,
    transaction_id: txId,
    message:        `Movimiento de ${currency} ${body.amount} registrado como pendiente de revisión`,
  })
}
