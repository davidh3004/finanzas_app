import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { categorizeTransaction, matchCategorizationRules } from '@/lib/ai/categorizer'
import type { CategorizationRequest } from '@/types/database'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as CategorizationRequest

  // 1. Buscar en reglas de categorización del usuario (sin API call)
  const { data: rules } = await supabase
    .from('categorization_rules')
    .select('pattern, category_id, match_type, confidence')
    .eq('user_id', user.id)
    .eq('is_active' as string, true)
    .order('confidence', { ascending: false })

  const ruleMatch = matchCategorizationRules(
    body.merchant ?? null,
    body.description ?? null,
    rules ?? []
  )

  if (ruleMatch && ruleMatch.confidence >= 0.8) {
    // Buscar nombre de categoría
    const { data: cat } = await supabase
      .from('categories')
      .select('name')
      .eq('id', ruleMatch.category_id)
      .single()

    const catData = cat as unknown as { name: string } | null
    return NextResponse.json({
      category_id:   ruleMatch.category_id,
      category_name: catData?.name ?? '',
      confidence:    ruleMatch.confidence,
      reason:        'Coincidencia con regla guardada',
      source:        'rule',
    })
  }

  // 2. Buscar en historial: mismo merchant → categoría más frecuente
  if (body.merchant) {
    const { data: history } = await supabase
      .from('transactions')
      .select('category_id, category:categories(name)')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .ilike('merchant', `%${body.merchant}%`)
      .not('category_id', 'is', null)
      .limit(10)

    if (history && history.length >= 3) {
      // Categoría más frecuente
      const freq: Record<string, { count: number; name: string }> = {}
      for (const t of history) {
        if (!t.category_id) continue
        const catName = (t.category as unknown as { name: string } | null)?.name ?? ''
        if (!freq[t.category_id]) freq[t.category_id] = { count: 0, name: catName }
        freq[t.category_id].count++
      }
      const top = Object.entries(freq).sort(([, a], [, b]) => b.count - a.count)[0]
      if (top && top[1].count >= 2) {
        return NextResponse.json({
          category_id:   top[0],
          category_name: top[1].name,
          confidence:    0.85,
          reason:        `Basado en ${top[1].count} compras previas en este merchant`,
          source:        'history',
        })
      }
    }
  }

  // 3. Llamar a Claude si no hay match suficiente
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, kind, parent_id')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const { data: recentPatterns } = await supabase
    .from('transactions')
    .select('merchant, category:categories(name)')
    .eq('user_id', user.id)
    .eq('status', 'confirmed')
    .not('merchant', 'is', null)
    .not('category_id', 'is', null)
    .order('date', { ascending: false })
    .limit(10)

  const result = await categorizeTransaction({
    transaction: body,
    categories: (categories ?? []).map(c => ({ id: c.id, name: c.name, kind: c.kind })),
    recentPatterns: (recentPatterns ?? []).map(t => ({
      merchant: t.merchant ?? '',
      category_name: (t.category as unknown as { name: string } | null)?.name ?? '',
    })),
  })

  return NextResponse.json({ ...result, source: 'ai' })
}
