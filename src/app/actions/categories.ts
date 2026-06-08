'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CategoryKind } from '@/types/database'

interface CategoryInput {
  name:     string
  kind:     CategoryKind
  parentId: string | null
  color:    string
}

export async function createCategory(
  input: CategoryInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase.from('categories').insert({
    user_id:   user.id,
    name:      input.name.trim(),
    kind:      input.kind,
    parent_id: input.parentId ?? null,
    color:     input.color,
    is_active: true,
    is_system: false,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/categorias')
  revalidatePath('/movimientos')
  revalidatePath('/presupuestos')
  return { success: true }
}

export async function updateCategory(
  id: string,
  input: { name: string; color: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('categories')
    .update({ name: input.name.trim(), color: input.color })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_system', false)

  if (error) return { success: false, error: error.message }

  revalidatePath('/categorias')
  revalidatePath('/movimientos')
  revalidatePath('/presupuestos')
  return { success: true }
}

export async function deleteCategory(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { error } = await supabase
    .from('categories')
    .update({ is_active: false })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_system', false)

  if (error) return { success: false, error: error.message }

  revalidatePath('/categorias')
  revalidatePath('/movimientos')
  revalidatePath('/presupuestos')
  return { success: true }
}
