# Sprint A3 — Stripe Checkout

Production-safe Stripe integration for Scriptora subscriptions and credit packs. **Credit enforcement remains off** (`VITE_SCRIPTORA_CREDIT_ENFORCEMENT=false`).

## Architecture

```
Browser (authenticated)
  → create-stripe-checkout-session (Edge Function)
  → Stripe Checkout (hosted)
  → stripe-webhook (Edge Function, signature verified)
  → service_role writes user_plans + user_credit_wallets + user_credit_ledger
```

- **No Stripe secrets in the frontend**
- **Client cannot write plans or wallet balances** (RLS from A1/A2)
- **Idempotent webhook** via `stripe_events_processed` + ledger `reference_id`

## Files

| Path | Role |
|------|------|
| `supabase/migrations/20260529230000_stripe_events_processed.sql` | Idempotency table + `credit_wallet_grant_credits` RPC |
| `supabase/functions/_shared/stripe-config.ts` | Server catalog + env price mapping |
| `supabase/functions/_shared/stripe-billing.ts` | Plan upsert, credit grants |
| `supabase/functions/create-stripe-checkout-session/index.ts` | Authenticated checkout |
| `supabase/functions/stripe-webhook/index.ts` | Stripe events |
| `src/lib/billing/stripeCheckout.ts` | Frontend checkout helper |
| `src/pages/PricingPage.tsx` | Plan + pack CTAs |
| `src/components/UpgradeModal.tsx` | Upgrade CTAs |
| `src/components/billing/CheckoutReturnBanner.tsx` | Post-checkout messages |

## Environment variables

### Supabase Edge (secrets)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API (test: `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing (`whsec_…`) |
| `SITE_URL` or `APP_URL` | Redirect base (e.g. `https://scriptora.ac`) |
| `STRIPE_PRICE_STARTER` | Price ID for Starter €9,99/mo |
| `STRIPE_PRICE_PRO_AUTHOR` | Pro Author €19,99/mo |
| `STRIPE_PRICE_STUDIO` | Studio €49,99/mo |
| `STRIPE_PRICE_PUBLISHER` | Publisher €99,99/mo |
| `STRIPE_PRICE_CREDITS_100` | 100 credits €4,99 |
| `STRIPE_PRICE_CREDITS_300` | 300 credits €12,99 |
| `STRIPE_PRICE_CREDITS_800` | 800 credits €29,99 |
| `STRIPE_PRICE_CREDITS_2000` | 2.000 credits €69,99 |
| `STRIPE_PRICE_CREDITS_5000` | 5.000 credits €149,99 |

`SUPABASE_SERVICE_ROLE_KEY` is already available to Edge Functions.

### Vercel / frontend

No new Stripe env vars on the client. Existing Supabase public keys only.

**Do not set** `VITE_SCRIPTORA_CREDIT_ENFORCEMENT=true` until reserve/commit is wired to AI flows.

## Create Stripe products & prices

1. Stripe Dashboard → **Products** → create recurring products for each plan.
2. Create one-time products for each credit pack.
3. Copy each **Price ID** (`price_…`) into the matching env var above.
4. Use **Test mode** until production launch.

### Plan → legacy `user_plans` mapping

| Commercial plan | `user_plans.plan` | Monthly credits |
|-----------------|-------------------|-----------------|
| Starter | `beta` | 250 |
| Pro Author | `pro` | 700 |
| Studio | `premium` | 2.000 |
| Publisher | `premium` | 5.000 (wallet grant) |

Publisher uses legacy `premium` gates with a 5.000-credit wallet grant.

## Webhook setup

1. Deploy: `supabase functions deploy stripe-webhook`
2. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
3. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
4. Events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

Local testing: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

## Deploy

```bash
supabase db push
supabase functions deploy create-stripe-checkout-session
supabase functions deploy stripe-webhook
vercel --prod
```

## Manual tests

### Checkout not configured (no Stripe env)

1. Open `/pricing` → click a paid plan.
2. Expect **PremiumActivationNoticeDialog**: “Attivazione pagamento in arrivo”.

### Test mode checkout

1. Set all Stripe env vars on Supabase.
2. Log in → `/pricing` → choose Pro Author.
3. Complete Stripe test card `4242…`.
4. Return to `/pricing?checkout=success` — success banner.
5. Verify `user_plans.plan = pro` in Supabase (not via client update).
6. Verify wallet balance increased via `get-credit-wallet`.

### RLS safety (browser console, normal user)

```js
await supabase.from("user_plans").update({ plan: "premium" }).eq("user_id", "<UUID>")
// Must fail

await supabase.from("user_credit_wallets").update({ balance: 99999 }).eq("user_id", "<UUID>")
// Must fail
```

### Credit pack

1. Buy 100 credits pack in test mode.
2. Ledger row `credit_pack_purchase` with `reference_id = stripe_session_…`.
3. `lifetime_purchased` incremented.

## Events handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Subscription plan sync or credit pack grant |
| `customer.subscription.created/updated` | Update plan + wallet monthly grant |
| `customer.subscription.deleted` | Downgrade to free |
| `invoice.paid` | Monthly credit grant (idempotent per invoice) |
| `invoice.payment_failed` | Mark `user_plans.suspicious` |

## Rollback if checkout fails

1. Remove or unset `STRIPE_SECRET_KEY` on Supabase → UI falls back to activation notice (no charges).
2. Disable webhook endpoint in Stripe Dashboard.
3. Existing subscriptions: cancel in Stripe; webhook downgrades users to free.
4. No client-side plan writes — manual support fixes via service_role only.

## Residual risks

- Publisher shares `premium` legacy gates (higher credits only via wallet).
- Concurrent webhook retries: protected by `stripe_events_processed` + ledger `reference_id`.
- `invoice.paid` + `checkout.session.completed` may both fire on first subscription — monthly grant uses invoice id as reference (idempotent).
- No customer portal / cancellation UI yet — users cancel via Stripe email or future sprint.

## Regression

```bash
npm test -- creditPolicy creditWallet stripeCheckout
npm run typecheck
npm run build
npm run scriptora:doctor:smoke
```
