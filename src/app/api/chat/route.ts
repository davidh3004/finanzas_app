import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Tools que Claude puede usar para consultar la base de datos del usuario
const dbTools: Anthropic.Tool[] = [
  {
    name: 'get_monthly_summary',
    description: 'Obtiene el resumen de ingresos y gastos de un mes específico',
    input_schema: {
      type: 'object' as const,
      properties: {
        year:  { type: 'number', description: 'Año (ej: 2025)' },
        month: { type: 'number', description: 'Mes (1-12)' },
      },
      required: ['year', 'month'],
    },
  },
  {
    name: 'get_category_spending',
    description: 'Obtiene los gastos agrupados por categoría en un período',
    input_schema: {
      type: 'object' as const,
      properties: {
        from: { type: 'string', description: 'Fecha inicio (YYYY-MM-DD)' },
        to:   { type: 'string', description: 'Fecha fin (YYYY-MM-DD)' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'get_fund_status',
    description: 'Obtiene el estado actual de los fondos (emergencia, inversión)',
    input_schema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'get_accounts_balance',
    description: 'Obtiene los saldos actuales de todas las cuentas',
    input_schema: { type: 'object' as const, properties: {} },
  },
]

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  userId: string
): Promise<unknown> {
  const now = new Date()

  if (toolName === 'get_monthly_summary') {
    const { year, month } = toolInput as { year: number; month: number }
    const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const lastDay  = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: ing }, { data: gas }] = await Promise.all([
      supabase.from('transactions').select('amount').eq('user_id', userId)
        .eq('type', 'income').eq('status', 'confirmed').gte('date', firstDay).lte('date', lastDay),
      supabase.from('transactions').select('amount').eq('user_id', userId)
        .eq('type', 'expense').eq('status', 'confirmed').gte('date', firstDay).lte('date', lastDay),
    ])

    const ingresos = (ing ?? []).reduce((s, t) => s + Number(t.amount), 0)
    const gastos   = (gas ?? []).reduce((s, t) => s + Number(t.amount), 0)
    return { year, month, ingresos, gastos, ahorro: ingresos - gastos, currency: 'DOP' }
  }

  if (toolName === 'get_category_spending') {
    const { from, to } = toolInput as { from: string; to: string }
    const { data } = await supabase
      .from('transactions')
      .select('amount, category:categories(name)')
      .eq('user_id', userId).eq('type', 'expense').eq('status', 'confirmed')
      .gte('date', from).lte('date', to)

    const byCategory: Record<string, number> = {}
    for (const t of data ?? []) {
      const name = (t.category as unknown as { name: string } | null)?.name ?? 'Sin categoría'
      byCategory[name] = (byCategory[name] ?? 0) + Number(t.amount)
    }
    return Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([category, total]) => ({ category, total, currency: 'DOP' }))
  }

  if (toolName === 'get_fund_status') {
    const { data } = await supabase
      .from('funds').select('*').eq('user_id', userId).eq('is_active', true)
    return data?.map(f => ({
      name: f.name, type: f.type, currency: f.currency,
      current_amount: Number(f.current_amount),
      target_amount: Number(f.target_amount),
      progress_pct: f.target_amount > 0
        ? ((Number(f.current_amount) / Number(f.target_amount)) * 100).toFixed(1) + '%'
        : '0%',
    })) ?? []
  }

  if (toolName === 'get_accounts_balance') {
    const { data } = await supabase
      .from('accounts').select('name, type, current_balance, currency')
      .eq('user_id', userId).eq('is_active', true)
    return data?.map(a => ({
      name: a.name, type: a.type,
      balance: Number(a.current_balance), currency: a.currency,
    })) ?? []
  }

  return { error: 'Tool no encontrada' }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages } = await request.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[]
  }

  const now = new Date()
  const systemPrompt = `Eres el asistente financiero personal de David, un joven de 22 años en Santo Domingo, RD.
Tienes acceso a sus datos financieros en tiempo real mediante las tools disponibles.
Hoy es ${now.toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Responde siempre en español, de forma clara, directa y útil. Usa los datos reales del usuario.
Cuando hagas cálculos, muestra los números con formato de moneda (RD$ o USD).`

  const anthropicMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    tools: dbTools,
    messages: anthropicMessages,
  })

  // Agentic loop: ejecutar tools mientras Claude las pida
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use')
    const toolResults: Anthropic.MessageParam = {
      role: 'user',
      content: await Promise.all(
        toolUseBlocks.map(async (block) => {
          if (block.type !== 'tool_use') return { type: 'tool_result' as const, tool_use_id: '', content: '' }
          const result = await executeTool(block.name, block.input as Record<string, unknown>, supabase, user.id)
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          }
        })
      ),
    }

    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: dbTools,
      messages: [
        ...anthropicMessages,
        { role: 'assistant', content: response.content },
        toolResults,
      ],
    })
  }

  const text = response.content.find(b => b.type === 'text')?.text ?? ''
  return NextResponse.json({ message: text })
}
