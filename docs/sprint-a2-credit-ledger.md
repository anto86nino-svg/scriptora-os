# Sprint A2 — Credit Ledger Server-Side

Server-side credit wallet and ledger for Scriptora. **Enforcement remains off** until Sprint A3+ testing.

## Schema

### `public.user_credit_wallets`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `user_id` | uuid FK → auth.users | unique |
| `balance` | integer ≥ 0 | authoritative spendable balance |
| `monthly_grant` | integer ≥ 0 | plan allowance snapshot |
| `lifetime_purchased` | integer ≥ 0 | future Stripe top-ups |
| `lifetime_used` | integer ≥ 0 | committed usage total |
| `last_monthly_grant_at` | timestamptz | |
| `created_at` / `updated_at` | timestamptz | |

### `public.user_credit_ledger`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | ledger row id |
| `user_id` | uuid FK | |
| `wallet_id` | uuid FK | |
| `operation` | text | e.g. `chapter_generation_standard` |
| `credits_delta` | integer | negative on reserve |
| `balance_after` | integer | wallet balance after move |
| `status` | text | `pending` \| `committed` \| `refunded` \| `failed` |
| `provider` | text | optional AI provider |
| `reference_id` | text | optional client correlation id |
| `metadata` | jsonb | |
| `created_at` / `committed_at` / `refunded_at` | timestamptz | |

### RLS

- **authenticated**: `SELECT` own rows only on wallet + ledger
- **authenticated**: no direct `INSERT` / `UPDATE` / `DELETE`
- **service_role**: writes via Edge Functions calling SECURITY DEFINER RPCs

### RPC pattern (reserve → commit / refund)

1. **`credit_wallet_reserve`** — debits balance immediately, inserts `pending` ledger row
2. **`credit_wallet_commit`** — marks `committed`, increments `lifetime_used` (idempotent)
3. **`credit_wallet_refund`** — restores balance, marks `refunded` (idempotent; works from `pending` or `committed`)

Migration: `supabase/migrations/20260529210000_user_credit_ledger.sql`

## Edge Functions

| Function | Purpose |
|----------|---------|
| `get-credit-wallet` | Auth user → get/create wallet with plan-based initial grant |
| `reserve-credits` | Reserve credits for an operation |
| `commit-credit-usage` | Commit a pending reservation |
| `refund-credit-usage` | Refund after AI failure |

Shared helpers: `supabase/functions/_shared/credit-ledger.ts`

## Frontend

| Module | Role |
|--------|------|
| `src/lib/billing/creditWalletServer.ts` | Remote wallet fetch |
| `src/lib/billing/creditWallet.ts` | `loadCreditWallet()` — remote first, local fallback |
| `src/lib/billing/creditReservation.ts` | `prepareCreditReservation`, `commitCreditReservation`, `refundCreditReservation` |

UI reads real balance when `source === "remote"`. Fallback shows *Saldo locale stimato* microcopy.

**Not wired yet:** AI generation/export/diagnosis do not call reserve/commit automatically.

## Environment

Existing Supabase env (no new Vite flags):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY`

Edge (Supabase dashboard / CLI secrets):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Keep off:**

```env
VITE_SCRIPTORA_CREDIT_ENFORCEMENT=false
```

## Deploy

```bash
supabase db push
supabase functions deploy get-credit-wallet
supabase functions deploy reserve-credits
supabase functions deploy commit-credit-usage
supabase functions deploy refund-credit-usage
vercel --prod   # after frontend commit
```

## How to test

### 1. Wallet read (logged-in user)

Open dashboard → credits card should show synced balance after edge deploy.

Browser console (should succeed read-only via RLS on direct select, or via function):

```js
const { data } = await supabase.functions.invoke("get-credit-wallet", { body: {} });
console.log(data);
```

### 2. Client cannot write wallet

```js
await supabase.from("user_credit_wallets").update({ balance: 99999 }).eq("user_id", "<YOUR_UUID>");
// Must fail — no UPDATE policy for authenticated
```

### 3. Reserve / commit / refund (manual, service path)

Use edge functions from authenticated session; verify ledger rows in Supabase table editor.

### 4. Frontend fallback

Disable Supabase env locally → UI shows estimated local balance without crash.

### 5. Regression

```bash
npm test -- creditPolicy
npm test -- creditWallet
npm run typecheck
npm run build
npm run scriptora:doctor:smoke
```

## What stays off

- `VITE_SCRIPTORA_CREDIT_ENFORCEMENT` — no UI hard-blocks
- Automatic debit on AI flows
- Stripe billing / credit packs purchase
- Monthly grant cron (future sprint)

## When to enable enforcement

1. Deploy A2 edge functions to production
2. Wire `prepareCreditReservation` → AI call → `commitCreditReservation` / `refundCreditReservation` on each billable operation
3. Run staging soak tests with real users
4. Set `VITE_SCRIPTORA_CREDIT_ENFORCEMENT=true` only after server parity is verified
5. Sprint A3 connects Stripe for plan upgrades and credit pack purchases

## Risks (residual)

- Monthly grant refresh not automated yet — initial grant on wallet create only
- `creditPolicy.ts` costs must stay aligned with `_shared/credit-ledger.ts` plan grants
- Reserve debits immediately — callers must refund on failure or credits are lost
- No rate limiting on reserve endpoint yet
