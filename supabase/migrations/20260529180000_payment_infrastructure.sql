-- Payment infrastructure: event log, provider metadata, client plan guard, wallet sync.

ALTER TABLE public.user_plans
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS provider_customer_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS checkout_plan_id text;

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  user_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_events_provider_event
  ON public.payment_events (provider, event_id);

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages payment events"
  ON public.payment_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Prevent authenticated users from self-upgrading via client writes.
CREATE OR REPLACE FUNCTION public.guard_user_plan_mutations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.plan IS DISTINCT FROM OLD.plan AND NEW.plan <> 'free' THEN
        RAISE EXCEPTION 'Plan upgrades require a verified payment'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
        OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
        OR NEW.payment_provider IS DISTINCT FROM OLD.payment_provider
        OR NEW.provider_customer_id IS DISTINCT FROM OLD.provider_customer_id
        OR NEW.provider_subscription_id IS DISTINCT FROM OLD.provider_subscription_id
        OR NEW.checkout_plan_id IS DISTINCT FROM OLD.checkout_plan_id THEN
        RAISE EXCEPTION 'Payment metadata is read-only'
          USING ERRCODE = '42501';
      END IF;
    END IF;
    IF TG_OP = 'INSERT' AND NEW.plan NOT IN ('free') THEN
      RAISE EXCEPTION 'Initial paid plans require a verified payment'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_plan_mutations ON public.user_plans;
CREATE TRIGGER trg_guard_user_plan_mutations
  BEFORE INSERT OR UPDATE ON public.user_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_user_plan_mutations();

-- Sync credit wallet allocation when subscription tier changes (webhook / service role).
CREATE OR REPLACE FUNCTION public.sync_credit_wallet_for_plan(
  p_user_id text,
  p_plan text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uuid uuid;
  v_alloc bigint;
  v_wallet public.credit_wallets;
BEGIN
  BEGIN
    v_uuid := p_user_id::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN;
  END;

  v_alloc := public.credit_plan_allocation(p_plan);
  v_wallet := public.ensure_credit_wallet(v_uuid, p_plan);

  IF v_wallet.plan_id IS DISTINCT FROM p_plan OR v_wallet.balance < v_alloc THEN
    UPDATE public.credit_wallets
    SET
      plan_id = p_plan,
      balance = GREATEST(v_wallet.balance, v_alloc),
      updated_at = now()
    WHERE user_id = v_uuid;

    INSERT INTO public.credit_ledger (user_id, operation, amount, balance_after, metadata, simulated)
    SELECT
      v_uuid,
      'plan_sync',
      GREATEST(v_alloc - v_wallet.balance, 0),
      GREATEST(v_wallet.balance, v_alloc),
      jsonb_build_object('plan', p_plan, 'source', 'payment_webhook'),
      false
    WHERE GREATEST(v_alloc - v_wallet.balance, 0) > 0;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_credit_wallet_for_plan(text, text) TO service_role;
