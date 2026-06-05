import Anthropic from '@anthropic-ai/sdk'
import type { CategorizationRequest, CategorizationResponse } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface CategoryOption {
  id: string
  name: string
  kind: string
  parent_name?: string
}

interface CategorizationContext {
  transaction: CategorizationRequest
  categories: CategoryOption[]
  recentPatterns?: { merchant: string; category_name: string }[]
}

export async function categorizeTransaction(
  ctx: CategorizationContext
): Promise<CategorizationResponse> {
  const { transaction, categories, recentPatterns } = ctx

  const expenseCategories = categories.filter(c => c.kind === 'expense' || c.kind === 'saving')

  const systemPrompt = `Eres un clasificador de gastos personales para un usuario en Santo Domingo, República Dominicana.
Tu tarea es asignar la categoría más adecuada a una transacción basándote en el merchant/descripción.
Responde ÚNICAMENTE con JSON válido, sin texto adicional.`

  const userPrompt = `Clasifica esta transacción:
- Merchant/Comercio: ${transaction.merchant ?? 'Desconocido'}
- Descripción: ${transaction.description ?? 'Sin descripción'}
- Monto: RD$ ${transaction.amount}
- Tipo: ${transaction.type}
- Fecha: ${transaction.date}

${recentPatterns && recentPatterns.length > 0 ? `
Patrones recientes del usuario (merchant → categoría):
${recentPatterns.map(p => `- "${p.merchant}" → ${p.category_name}`).join('\n')}
` : ''}

Categorías disponibles:
${expenseCategories.map(c => `- ID: ${c.id} | Nombre: ${c.name}${c.parent_name ? ` (sub de: ${c.parent_name})` : ''}`).join('\n')}

Responde con este JSON exacto:
{
  "category_id": "uuid-de-la-categoria",
  "category_name": "Nombre de la categoría",
  "confidence": 0.95,
  "reason": "Breve explicación en español"
}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const result = JSON.parse(text) as CategorizationResponse

    // Validar que el category_id existe en las opciones
    const valid = expenseCategories.find(c => c.id === result.category_id)
    if (!valid) {
      return fallbackCategory(categories, transaction)
    }

    return result
  } catch {
    return fallbackCategory(categories, transaction)
  }
}

function fallbackCategory(
  categories: CategoryOption[],
  transaction: CategorizationRequest
): CategorizationResponse {
  // Fallback: "Gastos no clasificados"
  const fallback = categories.find(c => c.name.includes('no clasificado') || c.name.includes('Varios'))
  return {
    category_id:   fallback?.id ?? '',
    category_name: fallback?.name ?? 'Varios',
    confidence:    0.1,
    reason:        'No se pudo determinar la categoría automáticamente',
  }
}

// ---------------------------------------------------------------
// Clasificador con reglas (sin API call) — se llama primero
// ---------------------------------------------------------------
export function matchCategorizationRules(
  merchant: string | null,
  description: string | null,
  rules: Array<{ pattern: string; category_id: string; match_type: string; confidence: number }>
): { category_id: string; confidence: number } | null {
  const text = `${merchant ?? ''} ${description ?? ''}`.toLowerCase().trim()
  if (!text) return null

  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase()
    let matches = false

    if (rule.match_type === 'exact') {
      matches = text === pattern
    } else if (rule.match_type === 'contains') {
      matches = text.includes(pattern)
    } else if (rule.match_type === 'regex') {
      try {
        matches = new RegExp(pattern, 'i').test(text)
      } catch {
        matches = false
      }
    }

    if (matches) {
      return { category_id: rule.category_id, confidence: rule.confidence }
    }
  }

  return null
}
