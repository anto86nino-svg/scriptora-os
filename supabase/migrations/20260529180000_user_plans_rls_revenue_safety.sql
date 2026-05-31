-- Sprint A1 — Revenue Safety
-- user_plans: authenticated clients may SELECT their own row only.
-- INSERT / UPDATE / DELETE must go through service_role (edge functions, Stripe webhooks).

DROP POLICY IF EXISTS "Users can insert own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can delete own plan" ON public.user_plans;

-- Ensure SELECT policies remain (created in 20260420143007 + 20260420143025):
--   "Users can view own plan" (authenticated)
--   "Local dev read user_plans" (anon, local-user-* / public-user)

COMMENT ON TABLE public.user_plans IS
  'Per-user plan tier. Client read-only via RLS; writes only via service_role (activate-beta, exit-editorial-preview, Stripe webhook).';
