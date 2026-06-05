-- =============================================================
-- Funciones RPC para operaciones atómicas de transacciones
-- (crean el movimiento Y actualizan el saldo en una sola TX)
-- =============================================================

-- ---------------------------------------------------------------
-- Crear transacción + actualizar saldo (si status = confirmed)
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
    PERFORM public.apply_balance_change(p_type, p_amount, p_account_id, p_counterparty_account_id, p_user_id, 1);
  END IF;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Confirmar transacción pendiente + actualizar saldo
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
    v_txn.type, v_txn.amount, v_txn.account_id,
    v_txn.counterparty_account_id, p_user_id, 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Descartar transacción (revierte saldo si estaba confirmada)
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

  -- Si estaba confirmada, revertir el saldo
  IF v_txn.status = 'confirmed' THEN
    PERFORM public.apply_balance_change(
      v_txn.type, v_txn.amount, v_txn.account_id,
      v_txn.counterparty_account_id, p_user_id, -1
    );
  END IF;

  UPDATE public.transactions SET status = 'discarded' WHERE id = p_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Helper: aplica o revierte el cambio de saldo
-- multiplier: 1 = aplicar, -1 = revertir
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_balance_change(
  p_type                    TEXT,
  p_amount                  NUMERIC,
  p_account_id              UUID,
  p_counterparty_account_id UUID,
  p_user_id                 UUID,
  p_multiplier              INT
) RETURNS VOID AS $$
BEGIN
  IF p_type = 'income' THEN
    UPDATE public.accounts
    SET current_balance = current_balance + (p_amount * p_multiplier)
    WHERE id = p_account_id AND user_id = p_user_id;

  ELSIF p_type = 'expense' THEN
    UPDATE public.accounts
    SET current_balance = current_balance - (p_amount * p_multiplier)
    WHERE id = p_account_id AND user_id = p_user_id;

  ELSIF p_type = 'transfer' AND p_counterparty_account_id IS NOT NULL THEN
    UPDATE public.accounts
    SET current_balance = current_balance - (p_amount * p_multiplier)
    WHERE id = p_account_id AND user_id = p_user_id;

    UPDATE public.accounts
    SET current_balance = current_balance + (p_amount * p_multiplier)
    WHERE id = p_counterparty_account_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------
-- Actualizar categoría de una transacción pendiente
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_transaction_category(
  p_transaction_id UUID,
  p_user_id        UUID,
  p_category_id    UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.transactions
  SET category_id = p_category_id
  WHERE id = p_transaction_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
