import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import PresupuestosClient from '@/components/budgets/PresupuestosClient'

export default async function PresupuestosPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return null

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const lastDay  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

  const [
    { data: categories },
    { data: transactions },
    { data: budgets },
  ] = await Promise.all([
    // Solo categorías padre (nivel raíz) de tipo expense/saving
    supabase.from('categories')
      .select('id, name, color, kind')
      .eq('user_id', user.id)
      .is('parent_id', null)
      .neq('kind', 'transfer')
      .neq('kind', 'income')
      .eq('is_active', true)
      .order('sort_order'),

    // Todos los gastos confirmados del mes
    supabase.from('transactions')
      .select('amount, category_id, category:categories(parent_id)')
      .eq('user_id', user.id)
      .eq('type', 'expense')
      .eq('status', 'confirmed')
      .gte('date', firstDay)
      .lte('date', lastDay),

    supabase.from('budgets')
      .select('category_id, amount')
      .eq('user_id', user.id)
      .eq('period', 'monthly'),
  ])

  // Construir mapa de gastos por categoría padre
  const spentByParent: Record<string, number> = {}

  // Mapa categoryId → parentId
  const allCategories = await supabase
    .from('categories')
    .select('id, parent_id')
    .eq('user_id', user.id)

  const parentMap: Record<string, string | null> = {}
  for (const c of allCategories.data ?? []) {
    parentMap[c.id] = c.parent_id
  }

  for (const t of transactions ?? []) {
    if (!t.category_id) continue
    const parentId = parentMap[t.category_id] ?? t.category_id
    spentByParent[parentId] = (spentByParent[parentId] ?? 0) + Number(t.amount)
  }

  const budgetMap: Record<string, number> = {}
  for (const b of budgets ?? []) {
    budgetMap[b.category_id] = Number(b.amount)
  }

  const totalGastos = Object.values(spentByParent).reduce((s, v) => s + v, 0)

  const categoryRows = (categories ?? []).map(cat => ({
    id:       cat.id,
    name:     cat.name,
    color:    cat.color,
    spent:    spentByParent[cat.id] ?? 0,
    budget:   budgetMap[cat.id] ?? null,
    currency: 'DOP',
  }))

  return (
    <PresupuestosClient
      categories={categoryRows}
      totalGastos={totalGastos}
    />
  )
}
