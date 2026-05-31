-- Sprint A2 — Credit ledger (wallet + movements)
-- Client: SELECT only. Writes via service_role Edge Functions / webhooks.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  monthly_grant integer NOT NULL DEFAULT 0,
  lifetime_purchased integer NOT NULL DEFAULT 0,
  lifetime_used integer NOT NULL DEFAULT 0,
  last_monthly_grant_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_credit_wallets_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_credit_wallets_balance_nonneg CHECK (balance >= 0),
  CONSTRAINT user_credit_wallets_monthly_grant_nonneg CHECK (monthly_grant >= 0),
  CONSTRAINT user_credit_wallets_lifetime_purchased_nonneg CHECK (lifetime_purchased >= 0),
  CONSTRAINT user_credit_wallets_lifetime_used_nonneg CHECK (lifetime_used >= 0)
);

CREATE TABLE IF NOT EXISTS public.user_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES public.user_credit_wallets(id) ON DELETE CASCADE,
  operation text NOT NULL,
  credits_delta integer NOT NULL,
  balance_after integer,
  status text NOT NULL CHECK (status IN ('pending', 'committed', 'refunded', 'failed')),
  provider text,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  refunded_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_user_id ON public.user_credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_wallet_id ON public.user_credit_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_status ON public.user_credit_ledger(status);
CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_reference_id ON public.user_credit_ledger(reference_id);
CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_created_at ON public.user_credit_ledger(created_at DESC);

-- ---------------------------------------------------------------------------
-- updated_at trigger (reuse existing helper)
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_user_credit_wallets_updated_at ON public.user_credit_wallets;
CREATE TRIGGER trg_user_credit_wallets_updated_at
  BEFORE UPDATE ON public.user_credit_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_plans_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — read-only for authenticated
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own credit wallet" ON public.user_credit_wallets;
CREATE POLICY "Users read own credit wallet"
  ON public.user_credit_wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own credit ledger" ON public.user_credit_ledger;
CREATE POLICY "Users read own credit ledger"
  ON public.user_credit_ledger FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMENT ON TABLE public.user_credit_wallets IS 'Authoritative Scriptora credit balance per user. Writes via service_role only.';
COMMENT ON TABLE public.user_credit_ledger IS 'Append-only credit movements (reserve/commit/refund). Writes via service_role only.';

-- ---------------------------------------------------------------------------
-- Atomic RPC (service_role / Edge Functions only)
-- Pattern: reserve debits immediately; commit marks committed; refund restores.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.credit_wallet_reserve(
  p_user_id uuid,
  p_operation text,
  p_credits integer,
  p_provider text DEFAULT NULL,
  p_reference_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.user_credit_wallets%ROWTYPE;
  v_ledger_id uuid;
  v_new_balance integer;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_wallet
  FROM public.user_credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_wallet.balance < p_credits THEN
    RETURN jsonb_build_object(
      'ok', false,
      'allowed', false,
      'balance', v_wallet.balance,
      'required', p_credits
    );
  END IF;

  v_new_balance := v_wallet.balance - p_credits;

  UPDATE public.user_credit_wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.user_credit_ledger (
    user_id, wallet_id, operation, credits_delta, balance_after,
    status, provider, reference_id, metadata
  )
  VALUES (
    p_user_id, v_wallet.id, p_operation, -p_credits, v_new_balance,
    'pending', p_provider, p_reference_id, COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'allowed', true,
    'ledgerId', v_ledger_id,
    'balance', v_new_balance,
    'reserved', p_credits
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_wallet_commit(
  p_user_id uuid,
  p_ledger_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.user_credit_ledger%ROWTYPE;
  v_credits integer;
BEGIN
  SELECT * INTO v_row
  FROM public.user_credit_ledger
  WHERE id = p_ledger_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEDGER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status = 'committed' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'ledgerId', p_ledger_id);
  END IF;

  IF v_row.status = 'refunded' THEN
    RAISE EXCEPTION 'LEDGER_ALREADY_REFUNDED' USING ERRCODE = '22023';
  END IF;

  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'LEDGER_INVALID_STATUS' USING ERRCODE = '22023';
  END IF;

  v_credits := abs(v_row.credits_delta);

  UPDATE public.user_credit_ledger
  SET status = 'committed', committed_at = now()
  WHERE id = p_ledger_id;

  UPDATE public.user_credit_wallets
  SET lifetime_used = lifetime_used + v_credits, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('ok', true, 'ledgerId', p_ledger_id, 'committed', v_credits);
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_wallet_refund(
  p_user_id uuid,
  p_ledger_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.user_credit_ledger%ROWTYPE;
  v_credits integer;
  v_new_balance integer;
BEGIN
  SELECT * INTO v_row
  FROM public.user_credit_ledger
  WHERE id = p_ledger_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEDGER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_row.status = 'refunded' THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'ledgerId', p_ledger_id);
  END IF;

  IF v_row.status NOT IN ('pending', 'committed') THEN
    RAISE EXCEPTION 'LEDGER_INVALID_STATUS' USING ERRCODE = '22023';
  END IF;

  v_credits := abs(v_row.credits_delta);

  UPDATE public.user_credit_wallets
  SET
    balance = balance + v_credits,
    lifetime_used = GREATEST(0, lifetime_used - CASE WHEN v_row.status = 'committed' THEN v_credits ELSE 0 END),
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  UPDATE public.user_credit_ledger
  SET status = 'refunded', refunded_at = now(), balance_after = v_new_balance
  WHERE id = p_ledger_id;

  RETURN jsonb_build_object('ok', true, 'ledgerId', p_ledger_id, 'refunded', v_credits, 'balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_reserve(uuid, text, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_commit(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.credit_wallet_refund(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.credit_wallet_reserve(uuid, text, integer, text, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_wallet_commit(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.credit_wallet_refund(uuid, uuid) TO service_role;
