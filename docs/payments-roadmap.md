# Scriptora — Payments Roadmap

## Phase 0 — Shipped (current default)

- Pricing page, Upgrade modal, paywall hooks — production-ready UI
- `coming_soon` mode: no checkout, no SDKs, no secrets required
- Full backend plumbing **implemented** (webhook, checkout, plan guard) — deploy when ready

## Phase 1 — External checkout links

Set `VITE_PAYMENT_MODE=external_links` + checkout URLs.  
See [payments-setup.md](./payments-setup.md).

## Phase 2 — Webhooks & automatic unlock

Deploy `payments-webhook` + provider secrets.  
Plans and credits sync server-side.

## Phase 3 — Provider SDK

`VITE_PAYMENT_MODE=provider_sdk` → `create-checkout` edge function.

## Phase 4 — Billing dashboard (future)

- Customer portal link
- Invoice history
- Dunning / failed payment recovery

## Contracts (do not break)

- `paymentsConfig` — plan metadata
- `resolvePlanAction()` / `executePlanAction()` — CTA behaviour
- `usePlan()` / `useSubscription()` — tier detection
