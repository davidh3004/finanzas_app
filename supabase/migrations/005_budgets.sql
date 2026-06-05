-- =============================================================
-- BUDGETS — límites de presupuesto por categoría
-- =============================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID          NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period      VARCHAR(10)   NOT NULL DEFAULT 'monthly',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, period)
);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "budgets_user" ON public.budgets
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_budgets_updated_at
    BEFORE UPDATE ON public.budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Upsert de presupuesto (insert or update)
CREATE OR REPLACE FUNCTION public.upsert_budget(
  p_user_id     UUID,
  p_category_id UUID,
  p_amount      NUMERIC,
  p_period      TEXT DEFAULT 'monthly'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.budgets (user_id, category_id, amount, period)
    VALUES (p_user_id, p_category_id, p_amount, p_period)
    ON CONFLICT (user_id, category_id, period)
    DO UPDATE SET amount = EXCLUDED.amount, updated_at = NOW()
    RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
