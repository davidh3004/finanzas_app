-- =============================================================
-- Currency conversion in all balance-update functions
-- =============================================================

-- Helper: convert an amount between two currencies
CREATE OR REPLACE FUNCTION public.convert_amount(
  p_amount    NUMERIC,
  p_from_curr TEXT,
  p_to_curr   TEXT,
  p_tasa      NUMERIC   -- DOP per 1 USD
) RETURNS NUMERIC AS $$
BEGIN
  IF p_from_curr = p_to_curr OR p_tasa IS NULL OR p_tasa = 0 THEN
    RETURN p_amount;
  ELSIF p_from_curr = 'USD' AND p_to_curr = 'DOP' THEN
    RETURN p_amount * p_tasa;
  ELSIF p_from_curr = 'DOP' AND p_to_curr = 'USD' THEN
    RETURN p_amount / p_tasa;
  ELSE
    RETURN p_amount;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER SET search_path = public;

-- Drop the old apply_balance_change that lacked p_currency
DROP FUNCTION IF EXISTS public.apply_balance_change(TEXT, NUMERIC, UUID, UUID, UUID, INT);

-- Re-create with currency-aware conversion
CREATE OR REPLACE FUNCTION public.apply_balance_change(
  p_type                    TEXT,
  p_amount                  NUMERIC,
  p_currency                TEXT,
  p_account_id              UUID,
  p_counterparty_account_id UUID,
  p_user_id                 UUID,
  p_multiplier              INT
) RETURNS VOID AS $$
DECLARE
  v_tasa          NUMERIC;
  v_acc_curr      TEXT;
  v_ctr_curr      TEXT;
  v_delta_main    NUMERIC;
  v_delta_counter NUMERIC;
BEGIN
  SELECT COALESCE(tasa_usd_dop, 60) INTO v_tasa
  FROM public.config WHERE user_id = p_user_id;
  IF v_tasa IS NULL THEN v_tasa := 60; END IF;

  SELECT currency INTO v_acc_curr FROM public.accounts WHERE id = p_account_id;
  v_delta_main := public.convert_amount(p_amount, p_currency, COALESCE(v_acc_curr, p_currency), v_tasa);

  IF p_type = 'income' THEN
    UPDATE public.accounts
    SET current_balance = current_balance + (v_delta_main * p_multiplier)
    WHERE id = p_account_id AND user_id = p_user_id;

  ELSIF p_type = 'expense' THEN
    UPDATE public.accounts
    SET current_balance = current_balance - (v_delta_main * p_multiplier)
    WHERE id = p_account_id AND user_id = p_user_id;

  ELSIF p_type = 'transfer' AND p_counterparty_account_id IS NOT NULL THEN
    SELECT currency INTO v_ctr_curr FROM public.accounts WHERE id = p_counterparty_account_id;
    v_delta_counter := public.convert_amount(p_amount, p_currency, COALESCE(v_ctr_curr, p_currency), v_tasa);

    UPDATE public.accounts
    SET current_balance = current_balance - (v_delta_main * p_multiplier)
    WHERE id = p_account_id AND user_id = p_user_id;

    UPDATE public.accounts
    SET current_balance = current_balance + (v_delta_counter * p_multiplier)
    WHERE id = p_counterparty_account_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Re-create create_transaction_with_balance (passes currency)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_transaction_with_balance(
  p_user_id                  UUID,
  p_date                     DATE,
  p_amount                   NUMERIC,
  p_currency                 TEXT,
  p_type                     TEXT,
  p_category_id              UUID,
  p_account_id               UUID,
  p_counterparty_account_id  UUID,
  p_description              TEXT,
  p_merchant                 TEXT,
  p_source                   TEXT,
  p_status                   TEXT,
  p_ai_category_suggestion   UUID,
  p_ai_confidence            NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.transactions (
    user_id, date, amount, currency, type,
    category_id, account_id, counterparty_account_id,
    description, merchant, source, status,
    ai_category_suggestion, ai_confidence
  ) VALUES (
    p_user_id, p_date, p_amount, p_currency, p_type,
    p_category_id, p_account_id, p_counterparty_account_id,
    p_description, p_merchant, p_source, p_status,
    p_ai_category_suggestion, p_ai_confidence
  ) RETURNING id INTO v_id;

  IF p_status = 'confirmed' THEN
    PERFORM public.apply_balance_change(
      p_type, p_amount, p_currency,
      p_account_id, p_counterparty_account_id, p_user_id, 1
    );
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Re-create confirm_transaction (passes transaction currency)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_transaction(
  p_transaction_id UUID,
  p_user_id        UUID
) RETURNS VOID AS $$
DECLARE
  v_txn public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_txn
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id AND status = 'pending_review';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada o no está pendiente';
  END IF;

  UPDATE public.transactions SET status = 'confirmed' WHERE id = p_transaction_id;

  PERFORM public.apply_balance_change(
    v_txn.type, v_txn.amount, v_txn.currency,
    v_txn.account_id, v_txn.counterparty_account_id, p_user_id, 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Re-create discard_transaction (passes transaction currency)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.discard_transaction(
  p_transaction_id UUID,
  p_user_id        UUID
) RETURNS VOID AS $$
DECLARE
  v_txn public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_txn
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
    AND status IN ('pending_review', 'confirmed');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada';
  END IF;

  IF v_txn.status = 'confirmed' THEN
    PERFORM public.apply_balance_change(
      v_txn.type, v_txn.amount, v_txn.currency,
      v_txn.account_id, v_txn.counterparty_account_id, p_user_id, -1
    );
  END IF;

  UPDATE public.transactions SET status = 'discarded' WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Re-create update_transaction (passes transaction currency)
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_transaction(
  p_transaction_id UUID,
  p_user_id        UUID,
  p_amount         NUMERIC,
  p_merchant       TEXT,
  p_description    TEXT,
  p_category_id    UUID,
  p_date           DATE
) RETURNS VOID AS $$
DECLARE
  v_txn public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_txn
  FROM public.transactions
  WHERE id = p_transaction_id AND user_id = p_user_id
    AND status = 'confirmed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada o no está confirmada';
  END IF;

  IF p_amount <> v_txn.amount THEN
    PERFORM public.apply_balance_change(
      v_txn.type, v_txn.amount, v_txn.currency,
      v_txn.account_id, v_txn.counterparty_account_id, p_user_id, -1
    );
    PERFORM public.apply_balance_change(
      v_txn.type, p_amount, v_txn.currency,
      v_txn.account_id, v_txn.counterparty_account_id, p_user_id, 1
    );
  END IF;

  UPDATE public.transactions
  SET
    amount      = p_amount,
    merchant    = p_merchant,
    description = p_description,
    category_id = p_category_id,
    date        = p_date
  WHERE id = p_transaction_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
