-- Server-side credit wallet (source of truth for monetization)

CREATE TABLE IF NOT EXISTS public.credit_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance bigint NOT NULL DEFAULT 500 CHECK (balance >= 0),
  plan_id text NOT NULL DEFAULT 'free',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operation text NOT NULL,
  amount bigint NOT NULL,
  balance_after bigint NOT NULL CHECK (balance_after >= 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  simulated boolean NOT NULL DEFAULT false,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_idempotency
  ON public.credit_ledger (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created
  ON public.credit_ledger (user_id, created_at DESC);

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credit wallet"
  ON public.credit_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users read own credit ledger"
  ON public.credit_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- Plan allocation defaults (mirror client creditPolicy)
CREATE OR REPLACE FUNCTION public.credit_plan_allocation(p_plan text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_plan, 'free'))
    WHEN 'starter' THEN 5000::bigint
    WHEN 'pro_author' THEN 20000::bigint
    WHEN 'pro' THEN 20000::bigint
    WHEN 'studio' THEN 75000::bigint
    WHEN 'premium' THEN 75000::bigint
    WHEN 'publisher' THEN 200000::bigint
    WHEN 'enterprise' THEN 200000::bigint
    ELSE 500::bigint
  END;
$$;

CREATE OR REPLACE FUNCTION public.credit_operation_cost(p_operation text, p_book_length text DEFAULT NULL)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_operation
    WHEN 'generate_chapter_short' THEN 150::bigint
    WHEN 'generate_chapter_medium' THEN 300::bigint
    WHEN 'generate_chapter_long' THEN 600::bigint
    WHEN 'rewrite_chapter' THEN 100::bigint
    WHEN 'chapter_diagnostic' THEN 50::bigint
    WHEN 'fix_chapter' THEN 75::bigint
    WHEN 'auto_bestseller' THEN 400::bigint
    WHEN 'market_intelligence' THEN 200::bigint
    WHEN 'kdp_launch' THEN 150::bigint
    WHEN 'cover_generation' THEN 150::bigint
    WHEN 'character_studio_ai' THEN 100::bigint
    WHEN 'book_analysis' THEN 75::bigint
    WHEN 'export_premium' THEN 50::bigint
    WHEN 'masterpiece_mode' THEN 0::bigint
    ELSE 0::bigint
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_credit_wallet(p_user_id uuid, p_plan text DEFAULT 'free')
RETURNS public.credit_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.credit_wallets;
  v_alloc bigint;
BEGIN
  SELECT * INTO v_wallet FROM public.credit_wallets WHERE user_id = p_user_id;
  IF FOUND THEN
    RETURN v_wallet;
  END IF;

  v_alloc := public.credit_plan_allocation(p_plan);
  INSERT INTO public.credit_wallets (user_id, balance, plan_id)
  VALUES (p_user_id, v_alloc, coalesce(nullif(p_plan, ''), 'free'))
  RETURNING * INTO v_wallet;

  INSERT INTO public.credit_ledger (user_id, operation, amount, balance_after, metadata, simulated)
  VALUES (p_user_id, 'plan_grant', v_alloc, v_alloc, jsonb_build_object('plan', p_plan), false);

  RETURN v_wallet;
END;
$$;

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

  SELECT plan INTO v_plan FROM public.user_plans WHERE user_id = v_user_id LIMIT 1;
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

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.credit_ledger
    WHERE user_id = v_user_id AND idempotency_key = p_idempotency_key
    LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true,
        'committed', true,
        'cost', abs(v_existing.amount),
        'balance_after', v_existing.balance_after,
        'simulated', v_existing.simulated,
        'idempotent', true
      );
    END IF;
  END IF;

  v_cost := coalesce(p_cost, public.credit_operation_cost(p_operation));
  IF v_cost < 0 THEN v_cost := 0; END IF;

  SELECT plan INTO v_plan FROM public.user_plans WHERE user_id = v_user_id LIMIT 1;
  v_wallet := public.ensure_credit_wallet(v_user_id, coalesce(v_plan, 'free'));

  IF p_simulated THEN
    INSERT INTO public.credit_ledger (user_id, operation, amount, balance_after, metadata, simulated, idempotency_key)
    VALUES (v_user_id, p_operation, 0, v_wallet.balance, p_metadata || jsonb_build_object('original_cost', v_cost), true, p_idempotency_key);
    RETURN jsonb_build_object('ok', true, 'committed', true, 'cost', 0, 'balance_after', v_wallet.balance, 'simulated', true);
  END IF;

  IF v_cost = 0 THEN
    RETURN jsonb_build_object('ok', true, 'committed', true, 'cost', 0, 'balance_after', v_wallet.balance, 'simulated', false);
  END IF;

  SELECT * INTO v_wallet FROM public.credit_wallets WHERE user_id = v_user_id FOR UPDATE;
  IF v_wallet.balance < v_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'insufficient_credits',
      'cost', v_cost,
      'balance_after', v_wallet.balance
    );
  END IF;

  v_new_balance := v_wallet.balance - v_cost;
  UPDATE public.credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE user_id = v_user_id;

  INSERT INTO public.credit_ledger (user_id, operation, amount, balance_after, metadata, simulated, idempotency_key)
  VALUES (v_user_id, p_operation, -v_cost, v_new_balance, p_metadata, false, p_idempotency_key);

  RETURN jsonb_build_object(
    'ok', true,
    'committed', true,
    'cost', v_cost,
    'balance_after', v_new_balance,
    'simulated', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_credit_wallet_state() TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_credit_operation(text, bigint, jsonb, text, boolean) TO authenticated;
