// Tipos TypeScript que reflejan el esquema de Supabase

export type AccountType = 'checking' | 'savings' | 'investment_fund' | 'brokerage' | 'credit_card' | 'cash'
export type CategoryKind = 'income' | 'expense' | 'saving' | 'transfer'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type TransactionSource = 'manual' | 'auto_email' | 'recurring' | 'system'
export type TransactionStatus = 'pending_review' | 'confirmed' | 'discarded'
export type FundType = 'emergency' | 'investment' | 'saving'
export type CardStatus = 'active' | 'cancelled'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  currency: string
  current_balance: number
  is_active: boolean
  color: string | null
  icon: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
  name: string
  kind: CategoryKind
  parent_id: string | null
  color: string | null
  icon: string | null
  is_system: boolean
  is_active: boolean
  sort_order: number
  created_at: string
  children?: Category[]
}

export interface Transaction {
  id: string
  user_id: string
  date: string
  amount: number
  currency: string
  type: TransactionType
  category_id: string | null
  account_id: string
  counterparty_account_id: string | null
  description: string | null
  merchant: string | null
  source: TransactionSource
  status: TransactionStatus
  card_id: string | null
  statement_id: string | null
  cashback_earned: number
  ai_category_suggestion: string | null
  ai_confidence: number | null
  tags: string[]
  created_at: string
  updated_at: string
  // Relaciones opcionales (joins)
  category?: Category
  account?: Account
  counterparty_account?: Account
}

export interface Fund {
  id: string
  user_id: string
  name: string
  type: FundType
  target_amount: number
  current_amount: number
  linked_account_id: string | null
  projection_rate: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  account_id: string
  credit_limit: number
  cut_day: number
  due_day: number
  annual_fee: number
  cashback_rules: Record<string, number>
  status: CardStatus
  created_at: string
  updated_at: string
  account?: Account
}

export interface Statement {
  id: string
  user_id: string
  card_id: string
  period_start: string
  period_end: string
  total_amount: number
  due_date: string
  paid: boolean
  paid_date: string | null
  created_at: string
  updated_at: string
}

export interface AppConfig {
  id: string
  user_id: string
  ingreso_bruto: number
  ingreso_neto: number
  moneda_principal: string
  tasa_usd_dop: number
  fecha_pago_1: number
  fecha_pago_2: number
  fase_actual: 1 | 2
  created_at: string
  updated_at: string
}

export interface Alert {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface AllocationRule {
  id: string
  user_id: string
  name: string
  priority: number
  calc_type: 'percentage' | 'fixed'
  calc_base: 'bruto' | 'neto'
  value: number
  destination: 'fund' | 'account' | 'category'
  destination_id: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CategorizationRule {
  id: string
  user_id: string
  pattern: string
  category_id: string
  match_type: 'exact' | 'contains' | 'regex'
  confidence: number
  times_used: number
  created_at: string
  updated_at: string
}

export interface RecurringTemplate {
  id: string
  user_id: string
  name: string
  amount: number
  currency: string
  type: 'income' | 'expense'
  category_id: string | null
  account_id: string
  merchant: string | null
  description: string | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  day_of_month: number | null
  next_due_date: string
  last_run_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// Para el categorizador de IA
export interface CategorizationRequest {
  merchant?: string
  description?: string
  amount: number
  date: string
  type: TransactionType
}

export interface CategorizationResponse {
  category_id: string
  category_name: string
  confidence: number
  reason: string
}

// Para el dashboard
export interface DashboardSummary {
  patrimonio_neto: number
  ingresos_mes: number
  gastos_mes: number
  disponible_mes: number
  presupuesto_utilizado_pct: number
  alertas_sin_leer: number
  pendientes_revision: number
}
