-- ---------------------------------------------------------------
-- Motor de alertas: genera alertas automáticas para un usuario
-- Retorna la cantidad de alertas nuevas creadas
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_user_alerts(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_count          INTEGER := 0;
  v_rec            RECORD;
  v_month_start    DATE;
  v_spent          NUMERIC;
  v_days_until_due INTEGER;
BEGIN
  v_month_start := date_trunc('month', CURRENT_DATE)::DATE;

  -- 1. Presupuesto excedido por categoría este mes
  FOR v_rec IN
    SELECT b.category_id, b.amount AS budget_amount, cat.name AS cat_name
    FROM public.budgets b
    JOIN public.categories cat ON cat.id = b.category_id
    WHERE b.user_id = p_user_id AND b.period = 'monthly'
  LOOP
    -- Sumar gasto de categoría padre y todas sus subcategorías
    SELECT COALESCE(SUM(t.amount), 0) INTO v_spent
    FROM public.transactions t
    JOIN public.categories c ON c.id = t.category_id
    WHERE t.user_id = p_user_id
      AND t.status = 'confirmed'
      AND t.type = 'expense'
      AND t.date >= v_month_start
      AND (t.category_id = v_rec.category_id OR c.parent_id = v_rec.category_id);

    IF v_spent > v_rec.budget_amount THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE user_id = p_user_id
          AND type = 'budget_exceeded'
          AND metadata->>'category_id' = v_rec.category_id::text
          AND created_at >= date_trunc('day', now())
      ) THEN
        INSERT INTO public.alerts (user_id, type, title, message, metadata)
        VALUES (
          p_user_id, 'budget_exceeded',
          'Presupuesto excedido: ' || v_rec.cat_name,
          'Gastaste RD$ ' || TO_CHAR(v_spent, 'FM999,999,990.00') ||
            ' de RD$ ' || TO_CHAR(v_rec.budget_amount, 'FM999,999,990.00') || ' presupuestados.',
          jsonb_build_object(
            'category_id', v_rec.category_id,
            'spent',        v_spent,
            'budget',       v_rec.budget_amount
          )
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  -- 2. Saldo bajo en cuentas líquidas (< RD$5,000)
  FOR v_rec IN
    SELECT id, name, current_balance
    FROM public.accounts
    WHERE user_id = p_user_id
      AND is_active = true
      AND type IN ('checking', 'savings', 'cash')
      AND currency = 'DOP'
      AND current_balance < 5000
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
      WHERE user_id = p_user_id
        AND type = 'low_balance'
        AND metadata->>'account_id' = v_rec.id::text
        AND created_at >= date_trunc('day', now())
    ) THEN
      INSERT INTO public.alerts (user_id, type, title, message, metadata)
      VALUES (
        p_user_id, 'low_balance',
        'Saldo bajo: ' || v_rec.name,
        'El saldo bajó a RD$ ' || TO_CHAR(v_rec.current_balance, 'FM999,999,990.00') || '.',
        jsonb_build_object('account_id', v_rec.id, 'balance', v_rec.current_balance)
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 3. Alta utilización de tarjeta de crédito (> 80%)
  FOR v_rec IN
    SELECT cc.id AS card_id, a.name, a.current_balance, cc.credit_limit,
           ROUND(ABS(a.current_balance) / cc.credit_limit * 100, 1) AS util_pct
    FROM public.credit_cards cc
    JOIN public.accounts a ON a.id = cc.account_id
    WHERE cc.user_id = p_user_id
      AND cc.status = 'active'
      AND cc.credit_limit > 0
      AND ABS(a.current_balance) / cc.credit_limit > 0.80
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.alerts
      WHERE user_id = p_user_id
        AND type = 'high_utilization'
        AND metadata->>'card_id' = v_rec.card_id::text
        AND created_at >= date_trunc('day', now())
    ) THEN
      INSERT INTO public.alerts (user_id, type, title, message, metadata)
      VALUES (
        p_user_id, 'high_utilization',
        'Utilización alta: ' || v_rec.name,
        'Tu tarjeta ' || v_rec.name || ' tiene una utilización del ' || v_rec.util_pct ||
          '%. Considera pagar antes del corte.',
        jsonb_build_object(
          'card_id',        v_rec.card_id,
          'utilization_pct', v_rec.util_pct
        )
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 4. Pago de tarjeta próximo (≤ 5 días)
  FOR v_rec IN
    SELECT cc.id AS card_id, a.name, a.current_balance, cc.due_day
    FROM public.credit_cards cc
    JOIN public.accounts a ON a.id = cc.account_id
    WHERE cc.user_id = p_user_id
      AND cc.status = 'active'
      AND a.current_balance < 0
  LOOP
    v_days_until_due := CASE
      WHEN v_rec.due_day >= EXTRACT(DAY FROM CURRENT_DATE)::INTEGER
      THEN v_rec.due_day - EXTRACT(DAY FROM CURRENT_DATE)::INTEGER
      ELSE (date_trunc('month', CURRENT_DATE + INTERVAL '1 month')::DATE
            + (v_rec.due_day - 1)) - CURRENT_DATE
    END;

    IF v_days_until_due BETWEEN 0 AND 5 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.alerts
        WHERE user_id = p_user_id
          AND type = 'card_due'
          AND metadata->>'card_id' = v_rec.card_id::text
          AND created_at >= date_trunc('day', now())
      ) THEN
        INSERT INTO public.alerts (user_id, type, title, message, metadata)
        VALUES (
          p_user_id, 'card_due',
          'Pago próximo: ' || v_rec.name,
          'El pago de ' || v_rec.name || ' vence en ' || v_days_until_due ||
            ' día(s). Monto: RD$ ' || TO_CHAR(ABS(v_rec.current_balance), 'FM999,999,990.00') || '.',
          jsonb_build_object(
            'card_id',        v_rec.card_id,
            'balance',        v_rec.current_balance,
            'due_day',        v_rec.due_day,
            'days_until_due', v_days_until_due
          )
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
