'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreditCardInput {
  name:          string
  currency:      string
  color:         string
  creditLimit:   number
  cutDay:        number
  dueDay:        number
  annualFee:     number
  cashbackRules: Record<string, number>
}

export async function createCreditCard(
  input: CreditCardInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // 1. Crear cuenta de tipo credit_card
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .insert({
      user_id:         user.id,
      name:            input.name,
      type:            'credit_card',
      currency:        input.currency,
      current_balance: 0,
      color:           input.color,
      is_active:       true,
    })
    .select('id')
    .single()

  if (accountError || !account) {
    return { success: false, error: accountError?.message ?? 'Error creando cuenta' }
  }

  // 2. Crear el registro de tarjeta de crédito
  const { error: cardError } = await supabase
    .from('credit_cards')
    .insert({
      user_id:        user.id,
      account_id:     account.id,
      credit_limit:   input.creditLimit,
      cut_day:        input.cutDay,
      due_day:        input.dueDay,
      annual_fee:     input.annualFee,
      cashback_rules: input.cashbackRules,
      status:         'active',
    })

  if (cardError) {
    // Revertir la cuenta si falla la tarjeta
    await supabase.from('accounts').delete().eq('id', account.id)
    return { success: false, error: cardError.message }
  }

  revalidatePath('/tarjetas')
  revalidatePath('/cuentas')
  revalidatePath('/')
  return { success: true }
}
