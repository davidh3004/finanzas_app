import { createClient } from '@/lib/supabase/server'
import TarjetasClient from '@/components/tarjetas/TarjetasClient'

export const dynamic = 'force-dynamic'

export default async function TarjetasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // credit_cards tiene un solo FK a accounts (account_id), sin ambigüedad
  const { data: cards } = await supabase
    .from('credit_cards')
    .select('id, credit_limit, cut_day, due_day, annual_fee, cashback_rules, account_id')
    .eq('user_id', user.id)
    .eq('status', 'active')

  // Traer cuentas de tipo credit_card para obtener nombre, saldo y color
  const accountIds = (cards ?? []).map(c => c.account_id).filter(Boolean)
  const { data: accounts } = accountIds.length > 0
    ? await supabase
        .from('accounts')
        .select('id, name, current_balance, currency, color')
        .in('id', accountIds)
    : { data: [] }

  const accountMap = Object.fromEntries((accounts ?? []).map(a => [a.id, a]))

  const cardData = (cards ?? []).map(card => ({
    id:             card.id,
    credit_limit:   Number(card.credit_limit),
    cut_day:        card.cut_day,
    due_day:        card.due_day,
    annual_fee:     Number(card.annual_fee),
    cashback_rules: (card.cashback_rules ?? {}) as Record<string, number>,
    account:        accountMap[card.account_id] ?? null,
  }))

  return <TarjetasClient cards={cardData} />
}
