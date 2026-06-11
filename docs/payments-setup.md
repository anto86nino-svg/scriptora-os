# Scriptora — Payments Setup Guide

This guide activates monetization **without code changes**.  
Default state: `VITE_ENABLE_PAYMENTS=false` → safe Coming Soon mode.

---

## Architecture overview

| Layer | Role |
|-------|------|
| `src/config/payments.ts` | Plan catalog + env-driven checkout mode |
| `src/lib/payments/` | Client checkout helpers |
| `supabase/functions/payments-webhook` | Verifies provider webhooks → unlocks `user_plans` |
| `supabase/functions/create-checkout` | Stripe Checkout Session (`provider_sdk` mode) |
| `supabase/functions/refresh-payment-status` | Reconciles plan after redirect (webhook lag) |
| `user_plans` + `credit_wallets` | Subscription tier + AI credits |

**Plan mapping**

| Checkout ID | `user_plans.plan` | Credits tier |
|-------------|-------------------|--------------|
| `pro_monthly`, `pro_yearly` | `pro` | `pro` |
| `premium_monthly`, `premium_yearly`, `lifetime` | `premium` | `premium` |

---

## Phase 1 — External checkout links (fastest)

No webhook required for redirect, but **plans unlock only after Phase 2**.

### 1. Create products

Create hosted checkout links in Stripe, Lemon Squeezy, or Paddle for each plan.

### 2. Configure redirects in provider dashboard

| Event | URL |
|-------|-----|
| Success | `https://your-domain.com/dashboard?payment=success` |
| Cancel | `https://your-domain.com/pricing?payment=cancelled` |

### 3. Frontend `.env`

```env
VITE_ENABLE_PAYMENTS=true
VITE_PAYMENT_MODE=external_links
VITE_PAYMENT_PROVIDER=stripe
VITE_PAYMENT_MONTHLY_URL=https://buy.stripe.com/...
VITE_PAYMENT_YEARLY_URL=https://buy.stripe.com/...
VITE_PAYMENT_PREMIUM_MONTHLY_URL=https://buy.stripe.com/...
VITE_PAYMENT_PREMIUM_YEARLY_URL=https://buy.stripe.com/...
VITE_PAYMENT_LIFETIME_URL=https://buy.stripe.com/...
VITE_PAYMENT_CREDITS_URL=https://buy.stripe.com/...
```

Redeploy. Pricing, Upgrade modal, and paywalls open real checkout URLs.

---

## Phase 2 — Webhooks (required for automatic unlock)

### 1. Run migration

```bash
supabase db push
```

Applies `payment_events`, plan guard trigger, and `sync_credit_wallet_for_plan`.

### 2. Deploy edge functions

```bash
supabase functions deploy payments-webhook
supabase functions deploy create-checkout
supabase functions deploy refresh-payment-status
```

### 3. Set server secrets

**Stripe**

```bash
supabase secrets set PAYMENT_PROVIDER=stripe
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PRO_YEARLY=price_...
supabase secrets set STRIPE_PRICE_PREMIUM_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PREMIUM_YEARLY=price_...
supabase secrets set STRIPE_PRICE_LIFETIME=price_...
```

**Webhook URL in Stripe Dashboard**

```
https://<PROJECT_REF>.supabase.co/functions/v1/payments-webhook?provider=stripe
```

Events to enable:
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Lemon Squeezy**

```bash
supabase secrets set PAYMENT_PROVIDER=lemonsqueezy
supabase secrets set LEMON_WEBHOOK_SECRET=...
supabase secrets set LEMON_VARIANT_PRO_MONTHLY=123456
# ... other variant IDs
```

Webhook URL:

```
https://<PROJECT_REF>.supabase.co/functions/v1/payments-webhook?provider=lemonsqueezy
```

Pass custom data in checkout (`supabase_user_id`, `scriptora_plan`) for reliable matching.

**Paddle**

```
https://<PROJECT_REF>.supabase.co/functions/v1/payments-webhook?provider=paddle
```

Use `passthrough` JSON: `{ "supabase_user_id": "...", "scriptora_plan": "pro_monthly" }`.

### 4. Security

- Clients **cannot** self-upgrade `user_plans` (DB trigger blocks paid tier writes).
- Only webhooks (service role) and beta activation can grant paid plans.
- Users may downgrade to `free` (e.g. exit beta).

---

## Phase 3 — Provider SDK mode (Stripe Checkout API)

Creates sessions server-side with user metadata embedded.

```env
VITE_ENABLE_PAYMENTS=true
VITE_PAYMENT_MODE=provider_sdk
VITE_PAYMENT_PROVIDER=stripe
```

Requires `STRIPE_SECRET_KEY` + price ID secrets (same as Phase 2).

Success redirect includes `session_id` → Dashboard polls `refresh-payment-status` until plan updates.

---

## Credit purchases

Set `VITE_PAYMENT_CREDITS_URL` (or `VITE_PAYMENT_CREDITS_URL_<amount>`).

Webhook credit fulfillment: extend `payments-webhook` with your credit pack price IDs when ready.

---

## Verification checklist

- [ ] `/pricing` shows live CTAs (not Coming Soon modal)
- [ ] Checkout opens and returns to Dashboard with success toast
- [ ] `user_plans.plan` updates to `pro` or `premium` within ~30s
- [ ] Export / Dominate unlock without dev mode
- [ ] `credit_wallets` balance reflects new tier
- [ ] Cancelling subscription downgrades to `free` via webhook

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Paid but still Free | Webhook not deployed or price IDs mismatch |
| Checkout 503 | Missing `STRIPE_SECRET_KEY` or price env |
| Plan stuck pending | Check Stripe webhook logs + `payment_events` table |
| User matched wrong | Ensure checkout email = Supabase auth email, or pass `client_reference_id` |
