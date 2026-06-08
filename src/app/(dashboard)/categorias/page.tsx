import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/supabase/get-user'
import CategoriesClient from '@/components/categories/CategoriesClient'

export default async function CategoriasPage() {
  const [user, supabase] = await Promise.all([getUser(), createClient()])
  if (!user) return null

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('sort_order')
    .order('name')

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-white">Categorías</h1>
      </div>
      <CategoriesClient categories={(categories ?? []) as never} />
    </div>
  )
}
