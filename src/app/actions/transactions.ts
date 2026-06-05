'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { TransactionType } from '@/types/database'

interface CreateTransactionInput {
  amount: number
  currency: string
  type: TransactionType
  categoryId: string | null
  accountId: string
  counterpartyAccountId?: string | null
  merchant?: string
  description?: string
  date: string
  aiCategorySuggestion?: string | null
  aiConfidence?: number | null
}

export async function createTransaction(
  input: CreateTransactionInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.rpc('create_transaction_with_balance', {
    p_user_id:                 user.id,
    p_date:                    input.date,
    p_amount:                  input.amount,
    p_currency:                input.currency,
    p_type:                    input.type,
    p_category_id:             input.categoryId ?? null,
    p_account_id:              input.accountId,
    p_counterparty_account_id: input.counterpartyAccountId ?? null,
    p_description:             input.description ?? null,
    p_merchant:                input.merchant ?? null,
    p_source:                  'manual',
    p_status:                  'confirmed',
    p_ai_category_suggestion:  input.aiCategorySuggestion ?? null,
    p_ai_confidence:           input.aiConfidence ?? null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/movimientos')
  revalidatePath('/cuentas')
  revalidatePath('/presupuestos')

  return { success: true }
}

export async function confirmTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.rpc('confirm_transaction', {
    p_transaction_id: id,
    p_user_id:        user.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/movimientos')
  revalidatePath('/cuentas')

  return { success: true }
}

export async function discardTransaction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.rpc('discard_transaction', {
    p_transaction_id: id,
    p_user_id:        user.id,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/')
  revalidatePath('/movimientos')
  revalidatePath('/cuentas')

  return { success: true }
}

export async function updateTransactionCategory(
  transactionId: string,
  categoryId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.rpc('update_transaction_category', {
    p_transaction_id: transactionId,
    p_user_id:        user.id,
    p_category_id:    categoryId,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/movimientos')

  return { success: true }
}
