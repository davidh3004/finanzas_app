-- =============================================================
-- ROW LEVEL SECURITY — cada tabla solo accesible por su usuario
-- =============================================================

ALTER TABLE config                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories             ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE statements             ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE funds                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules            ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_templates    ENABLE ROW LEVEL SECURITY;

-- Macro para políticas estándar
-- Cada tabla: el usuario solo ve y modifica sus propios registros

DO $$ BEGIN

  -- CONFIG
  CREATE POLICY "config_user" ON config
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- ACCOUNTS
  CREATE POLICY "accounts_user" ON accounts
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- CATEGORIES
  CREATE POLICY "categories_user" ON categories
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- CREDIT_CARDS
  CREATE POLICY "credit_cards_user" ON credit_cards
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- STATEMENTS
  CREATE POLICY "statements_user" ON statements
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- TRANSACTIONS
  CREATE POLICY "transactions_user" ON transactions
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- FUNDS
  CREATE POLICY "funds_user" ON funds
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- ALLOCATION_RULES
  CREATE POLICY "allocation_rules_user" ON allocation_rules
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- CATEGORIZATION_RULES
  CREATE POLICY "categorization_rules_user" ON categorization_rules
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- ALERT_RULES
  CREATE POLICY "alert_rules_user" ON alert_rules
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- ALERTS
  CREATE POLICY "alerts_user" ON alerts
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

  -- RECURRING_TEMPLATES
  CREATE POLICY "recurring_templates_user" ON recurring_templates
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
