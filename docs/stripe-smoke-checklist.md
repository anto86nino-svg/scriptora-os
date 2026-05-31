# Scriptora — Stripe Smoke Test Checklist

Founder checklist to verify **“beautiful app, broken payment”** cannot happen.

**Last updated:** Sprint A7 — Launch Preparation

---

## Prerequisites

- [ ] Supabase Edge secrets set: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs in `stripe-config`
- [ ] Stripe Dashboard → Test mode ON
- [ ] Test card: `4242 4242 4242 4242`, any future expiry, any CVC
- [ ] Webhook endpoint deployed: `stripe-webhook` function URL registered in Stripe
- [ ] App env: payments enabled, user authenticated

---

## 1. Pricing page (`/pricing`)

- [ ] Page loads commercial plans (Free, Pro, Studio)
- [ ] Current plan badge correct for logged-in user
- [ ] Pro “Upgrade” → redirects to Stripe Checkout (test)
- [ ] Studio “Upgrade” → redirects to Stripe Checkout (test)
- [ ] Credit pack purchase → redirects to Stripe Checkout
- [ ] If Stripe not configured → `PremiumActivationNoticeDialog` (not crash)

---

## 2. Upgrade modal (in-app paywall)

- [ ] Trigger from export lock / dominate / book limit
- [ ] Modal scrolls on mobile
- [ ] Pro / Studio CTAs start checkout
- [ ] Busy state disables double-click

---

## 3. Checkout session creation

Edge function: `create-stripe-checkout-session`

- [ ] Authenticated user receives `{ ok: true, url }`
- [ ] Unauthenticated → 401 / friendly error
- [ ] Invalid plan → controlled error (no 500 leak)
- [ ] `checkout_not_configured` → soft fallback in UI

---

## 4. Return flow

- [ ] **Success:** `/pricing?checkout=success` → green banner, dismissible
- [ ] **Cancel:** `/pricing?checkout=cancelled` → neutral banner
- [ ] Analytics event `checkout_completed` fires on success (if analytics enabled)

---

## 5. Webhook processing

Function: `stripe-webhook`

- [ ] `checkout.session.completed` → plan or credits applied
- [ ] `customer.subscription.updated` → plan sync
- [ ] `customer.subscription.deleted` → downgrade to free
- [ ] **Idempotency:** replay same `event.id` → `{ ok: true, idempotent: true }`, no double grant

Verify in Supabase:
- [ ] User plan row updated
- [ ] Credit wallet reflects purchase (pack or subscription credits)
- [ ] `stripe_events` (or equivalent) marks event processed

---

## 6. Credit wallet UI

- [ ] `/dashboard` credits badge refreshes after purchase
- [ ] `ScriptoraCreditsCard` shows remote balance (not permanent local fallback)
- [ ] Usage page reflects plan tier

---

## 7. Failure scenarios

- [ ] Decline card `4000 0000 0000 0002` → Stripe shows decline, app unchanged
- [ ] Close checkout tab → cancel URL or manual return OK
- [ ] Webhook secret wrong → 400 in Stripe dashboard, no partial grant in app

---

## 8. Production cutover (when leaving test mode)

- [ ] Replace test keys with live keys in Supabase secrets
- [ ] Update Stripe webhook to production URL
- [ ] Re-run steps 1–6 once with live mode + real card (refund after)
- [ ] Monitor Sentry / monitoring queue for `checkout` area errors (24h)

---

## Sign-off

| Tester | Date | Mode (test/live) | Result |
|--------|------|------------------|--------|
| | | | |

**Launch gate:** Full subscription + credit pack smoke pass in Stripe **test mode** with webhook idempotency verified.
