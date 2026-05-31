-- Sprint A3 — Stripe webhook idempotency + safe credit grants

CREATE TABLE IF NOT EXISTS public.stripe_events_processed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT stripe_events_processed_event_id_unique UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_type ON public.stripe_events_processed(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_at ON public.stripe_events_processed(processed_at DESC);

ALTER TABLE public.stripe_events_processed ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.stripe_events_processed IS 'Stripe webhook idempotency log. Writes via service_role only.';

-- Idempotent credit grant (packs, monthly invoice grants). reference_id must be unique per grant.
CREATE OR REPLACE FUNCTION public.credit_wallet_grant_credits(
  p_user_id uuid,
  p_credits integer,
  p_operation text,
  p_reference_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb,
  p_increment_lifetime_purchased boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.user_credit_wallets%ROWTYPE;
  v_existing uuid;
  v_new_balance integer;
  v_ledger_id uuid;
BEGIN
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'INVALID_CREDITS' USING ERRCODE = '22023';
  END IF;

  IF p_reference_id IS NULL OR length(trim(p_reference_id)) = 0 THEN
    RAISE EXCEPTION 'REFERENCE_REQUIRED' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_existing
  FROM public.user_credit_ledger
  WHERE reference_id = p_reference_id
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'referenceId', p_reference_id);
  END IF;

  SELECT * INTO v_wallet
  FROM public.user_credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  v_new_balance := v_wallet.balance + p_credits;

  UPDATE public.user_credit_wallets
  SET
    balance = v_new_balance,
    lifetime_purchased = lifetime_purchased + CASE WHEN p_increment_lifetime_purchased THEN p_credits ELSE 0 END,
    updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.user_credit_ledger (
    user_id, wallet_id, operation, credits_delta, balance_after,
    status, provider, reference_id, metadata, committed_at
  )
  VALUES (
    p_user_id, v_wallet.id, p_operation, p_credits, v_new_balance,
    'committed', 'stripe', p_reference_id, COALESCE(p_metadata, '{}'::jsonb), now()
  )
  RETURNING id INTO v_ledger_id;

  RETURN jsonb_build_object(
    'ok', true,
    'ledgerId', v_ledger_id,
    'balance', v_new_balance,
    'granted', p_credits
  );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_grant_credits(uuid, integer, text, text, jsonb, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet_grant_credits(uuid, integer, text, text, jsonb, boolean) TO service_role;
