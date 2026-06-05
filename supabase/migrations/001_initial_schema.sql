-- =============================================================
-- FINANZAS APP — Esquema inicial
-- =============================================================

-- Extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------
-- CONFIG — ajustes globales del usuario
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS config (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingreso_bruto    NUMERIC(12,2) NOT NULL DEFAULT 0,
  ingreso_neto     NUMERIC(12,2) NOT NULL DEFAULT 0,
  moneda_principal VARCHAR(3)    NOT NULL DEFAULT 'DOP',
  tasa_usd_dop     NUMERIC(10,4) NOT NULL DEFAULT 60.0,
  fecha_pago_1     INT           NOT NULL DEFAULT 15,   -- día del mes
  fecha_pago_2     INT           NOT NULL DEFAULT 30,
  fase_actual      INT           NOT NULL DEFAULT 1,    -- 1=emergencia, 2=inversión
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ---------------------------------------------------------------
-- ACCOUNTS — cuentas / buckets financieros
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  type            VARCHAR(30)  NOT NULL CHECK (type IN (
                    'checking','savings','investment_fund','brokerage','credit_card','cash'
                  )),
  currency        VARCHAR(3)   NOT NULL DEFAULT 'DOP',
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  color           VARCHAR(7),           -- hex color para UI
  icon            VARCHAR(50),          -- nombre de ícono
  metadata        JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- CATEGORIES — categorías y subcategorías
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  kind        VARCHAR(10)  NOT NULL CHECK (kind IN ('income','expense','saving','transfer')),
  parent_id   UUID         REFERENCES categories(id) ON DELETE SET NULL,
  color       VARCHAR(7),
  icon        VARCHAR(50),
  is_system   BOOLEAN      NOT NULL DEFAULT FALSE, -- categorías del sistema no se borran
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- CREDIT_CARDS — tarjetas de crédito
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credit_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id      UUID         NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  credit_limit    NUMERIC(12,2) NOT NULL DEFAULT 0,
  cut_day         INT          NOT NULL, -- día de corte
  due_day         INT          NOT NULL, -- día de pago
  annual_fee      NUMERIC(10,2) NOT NULL DEFAULT 0,
  cashback_rules  JSONB        NOT NULL DEFAULT '{}',
  -- Ejemplo: {"gasolina": 5, "internacional": 2, "default": 1}
  status          VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- STATEMENTS — estados de cuenta de tarjeta
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id      UUID         NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  period_start DATE         NOT NULL,
  period_end   DATE         NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date     DATE         NOT NULL,
  paid         BOOLEAN      NOT NULL DEFAULT FALSE,
  paid_date    DATE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- TRANSACTIONS — movimientos (el corazón del sistema)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                  DATE          NOT NULL DEFAULT CURRENT_DATE,
  amount                NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency              VARCHAR(3)    NOT NULL DEFAULT 'DOP',
  type                  VARCHAR(15)   NOT NULL CHECK (type IN ('income','expense','transfer')),
  category_id           UUID          REFERENCES categories(id) ON DELETE SET NULL,
  account_id            UUID          NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  counterparty_account_id UUID        REFERENCES accounts(id) ON DELETE SET NULL,
  -- Solo para transferencias: cuenta destino
  description           TEXT,
  merchant              VARCHAR(200),
  source                VARCHAR(20)   NOT NULL DEFAULT 'manual'
                          CHECK (source IN ('manual','auto_email','recurring','system')),
  status                VARCHAR(20)   NOT NULL DEFAULT 'confirmed'
                          CHECK (status IN ('pending_review','confirmed','discarded')),
  card_id               UUID          REFERENCES credit_cards(id) ON DELETE SET NULL,
  statement_id          UUID          REFERENCES statements(id) ON DELETE SET NULL,
  cashback_earned       NUMERIC(8,2)  NOT NULL DEFAULT 0,
  ai_category_suggestion UUID         REFERENCES categories(id) ON DELETE SET NULL,
  ai_confidence         NUMERIC(4,3), -- 0.000 a 1.000
  tags                  TEXT[]        NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- FUNDS — metas / fondos de ahorro e inversión
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funds (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             VARCHAR(100)  NOT NULL,
  type             VARCHAR(20)   NOT NULL CHECK (type IN ('emergency','investment','saving')),
  target_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  linked_account_id UUID         REFERENCES accounts(id) ON DELETE SET NULL,
  projection_rate  NUMERIC(6,4)  NOT NULL DEFAULT 0, -- tasa anual (0.08 = 8%)
  currency         VARCHAR(3)    NOT NULL DEFAULT 'DOP',
  is_active        BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- ALLOCATION_RULES — reglas de reparto del ingreso
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS allocation_rules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(100)  NOT NULL,
  priority      INT           NOT NULL DEFAULT 0,
  calc_type     VARCHAR(10)   NOT NULL CHECK (calc_type IN ('percentage','fixed')),
  calc_base     VARCHAR(10)   NOT NULL DEFAULT 'neto' CHECK (calc_base IN ('bruto','neto')),
  value         NUMERIC(10,4) NOT NULL, -- % o monto fijo
  destination   VARCHAR(20)   NOT NULL CHECK (destination IN ('fund','account','category')),
  destination_id UUID         NOT NULL,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- CATEGORIZATION_RULES — merchant → categoría (para auto-clasificación)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorization_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern      VARCHAR(200) NOT NULL, -- texto o regex del merchant/descripción
  category_id  UUID         NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  match_type   VARCHAR(10)  NOT NULL DEFAULT 'contains'
                 CHECK (match_type IN ('exact','contains','regex')),
  confidence   NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  times_used   INT          NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- ALERT_RULES — condición → alerta
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alert_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  type         VARCHAR(30)  NOT NULL,
  -- Tipos: 'budget_exceeded','card_due','low_balance','fund_goal','high_utilization'
  conditions   JSONB        NOT NULL DEFAULT '{}',
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- ALERTS — notificaciones generadas
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alerts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       VARCHAR(30) NOT NULL,
  title      VARCHAR(200) NOT NULL,
  message    TEXT        NOT NULL,
  metadata   JSONB       NOT NULL DEFAULT '{}',
  read       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- RECURRING_TEMPLATES — plantillas de movimientos recurrentes
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recurring_templates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          VARCHAR(100)  NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  currency      VARCHAR(3)    NOT NULL DEFAULT 'DOP',
  type          VARCHAR(15)   NOT NULL CHECK (type IN ('income','expense')),
  category_id   UUID          REFERENCES categories(id) ON DELETE SET NULL,
  account_id    UUID          NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  merchant      VARCHAR(200),
  description   TEXT,
  frequency     VARCHAR(20)   NOT NULL CHECK (frequency IN ('daily','weekly','biweekly','monthly','yearly')),
  day_of_month  INT,           -- para monthly
  next_due_date DATE          NOT NULL,
  last_run_date DATE,
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- ÍNDICES para rendimiento
-- ---------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_alerts_user_unread ON alerts(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_user ON categorization_rules(user_id);

-- ---------------------------------------------------------------
-- TRIGGERS — updated_at automático
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_accounts_updated_at
    BEFORE UPDATE ON accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_funds_updated_at
    BEFORE UPDATE ON funds FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_credit_cards_updated_at
    BEFORE UPDATE ON credit_cards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_statements_updated_at
    BEFORE UPDATE ON statements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_config_updated_at
    BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
