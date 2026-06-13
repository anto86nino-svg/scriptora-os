CREATE OR REPLACE FUNCTION public.get_credit_wallet_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.credit_wallets;
  v_plan text := 'free';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT plan
  INTO v_plan
  FROM public.user_plans
  WHERE user_id = v_user_id::text
  LIMIT 1;

  v_wallet := public.ensure_credit_wallet(v_user_id, coalesce(v_plan, 'free'));

  RETURN jsonb_build_object(
    'ok', true,
    'balance', v_wallet.balance,
    'plan_id', v_wallet.plan_id,
    'updated_at', v_wallet.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_credit_operation(
  p_operation text,
  p_cost bigint DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_idempotency_key text DEFAULT NULL,
  p_simulated boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_wallet public.credit_wallets;
  v_cost bigint;
  v_new_balance bigint;
  v_existing public.credit_ledger;
  v_plan text := 'free';
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT plan
  INTO v_plan
  FROM public.user_plans
  WHERE user_id = v_user_id::text
  LIMIT 1;

  v_wallet := public.ensure_credit_wallet(
    v_user_id,
    coalesce(v_plan, 'free')
  );

  SELECT *
  INTO v_wallet
  FROM public.credit_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  RETURN jsonb_build_object(
    'ok', true,
    'committed', true,
    'cost', 0,
    'balance_after', v_wallet.balance,
    'simulated', false
  );
END;
$$;
