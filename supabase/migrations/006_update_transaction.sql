-- ---------------------------------------------------------------
-- Editar transacción confirmada (ajusta saldo si el monto cambia)
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

  -- Si el monto cambió, ajustar saldo de la cuenta
  IF p_amount <> v_txn.amount THEN
    -- Revertir monto antiguo
    PERFORM public.apply_balance_change(
      v_txn.type, v_txn.amount, v_txn.account_id,
      v_txn.counterparty_account_id, p_user_id, -1
    );
    -- Aplicar monto nuevo
    PERFORM public.apply_balance_change(
      v_txn.type, p_amount, v_txn.account_id,
      v_txn.counterparty_account_id, p_user_id, 1
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
