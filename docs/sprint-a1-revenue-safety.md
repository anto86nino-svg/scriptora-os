# Sprint A1 — Revenue Safety / Sicurezza Piani

**Status:** Client hardened · SQL migration ready · Edge function ready · **Deploy manuale Supabase richiesto**

## Rischi trovati (pre-fix)

| Rischio | Gravità | Dettaglio |
|---------|---------|-----------|
| RLS permissiva | **Critico** | Migration `20260420143007` permetteva INSERT/UPDATE su `user_plans` a utenti `authenticated` |
| Client upsert piano | **Alto** | `setPlan()` / `upsertUserPlan()` scrivevano direttamente su Supabase |
| Cache localStorage | **Medio** | `fetchPlan()` elevava il tier da `nexora_plan_cache_v1` se la query falliva |
| Dev override default | **Medio** | `getDevPlanOverride()` restituiva `"premium"` fuori dev mode |
| Paywall UI-only | **Noto** | `ProtectedRoute` / `PaywallGuard` leggono piano client — edge-guard già non si fida del frontend |

## Fix applicati (codice)

| Area | Fix |
|------|-----|
| `src/lib/plan.ts` | Rimosso upsert client; `fetchPlan()` non usa più cache come fallback privilegi; `setPlan(beta-exit)` chiama edge `exit-editorial-preview` |
| `src/lib/dev-plan-override.ts` | Default `"free"` fuori dev; `setDevPlanOverride` logga warning se dev off |
| `supabase/functions/exit-editorial-preview/` | Nuova edge: downgrade `beta` → `free` via service_role |
| `supabase/functions/_shared/edge-guard.ts` | Profilo guard per `exit-editorial-preview` |
| `supabase/migrations/20260529180000_user_plans_rls_revenue_safety.sql` | DROP policy INSERT/UPDATE/DELETE authenticated |
| `src/components/UpgradeModal.tsx` | Banner “Attivazione pagamento in arrivo” |
| `src/components/BetaActivationDialog.tsx` | Copy anteprima editoriale; niente scrittura cache client post-attivazione |
| `src/lib/i18n.ts` | Chiavi `upgrade_checkout_pending_*` + premium activation allineate |

## Migration SQL

File: `supabase/migrations/20260529180000_user_plans_rls_revenue_safety.sql`

```sql
DROP POLICY IF EXISTS "Users can insert own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can update own plan" ON public.user_plans;
DROP POLICY IF EXISTS "Users can delete own plan" ON public.user_plans;
```

**Policy che restano attive:**
- `Users can view own plan` — SELECT authenticated (proprio `user_id`)
- `Local dev read user_plans` — SELECT anon per `local-user-*` / `public-user`

**Scritture consentite solo via:**
- `service_role` (bypass RLS): `activate-beta`, `exit-editorial-preview`, futuro webhook Stripe
- Trigger `handle_new_user()` su signup (SECURITY DEFINER)

## Istruzioni deploy Supabase (manuale)

### 1. Applicare migration RLS

```bash
cd "/path/to/scriptora"
supabase db push
```

Oppure incolla il contenuto della migration in **Supabase Dashboard → SQL Editor → Run**.

### 2. Deploy edge function

```bash
supabase functions deploy exit-editorial-preview
```

Verifica che `activate-beta` sia già deployata (scrive piani via service_role).

### 3. Smoke test sicurezza

Da browser (utente autenticato non-owner), DevTools console:

```javascript
// Deve fallire con policy/permission error dopo migration:
await supabase.from('user_plans').update({ plan: 'premium' }).eq('user_id', '<your-uuid>')
```

Uscita anteprima editoriale: UI PlanBadge → “Torna al piano Free” deve chiamare `exit-editorial-preview` e funzionare.

### 4. Verifica edge-guard

```bash
npm run scriptora:doctor:smoke
```

## Percorsi piano autorizzati

| Percorso | Chi scrive | Note |
|----------|------------|------|
| Signup trigger | `handle_new_user()` | Piano `free` iniziale |
| `activate-beta` edge | service_role | Anteprima editoriale |
| `exit-editorial-preview` edge | service_role | Downgrade a free |
| Stripe webhook (A3) | service_role | Futuro |
| Client `setPlan()` | **Bloccato** | Solo invoke edge beta-exit |
| `setDevPlanOverride()` | sessionStorage | Solo `isDevMode()` + owner/local dev |

## Rischio residuo

| Rischio | Mitigazione futura |
|---------|-------------------|
| Paywall UI bypass via dev tools / cache DOM | Sprint A2–A3: enforcement server-side crediti + Stripe |
| Owner dev mode simula premium in UI | By design; edge-guard usa `user_plans` reale |
| Migration non applicata in prod | 404/permessi su `user_plans`; istruzioni sopra |
| `exit-editorial-preview` non deployata | Beta-exit fallisce con toast errore; nessun downgrade silenzioso |

## Conferme Sprint A1

- Stripe: **non aggiunto**
- Credit enforcement: **ancora false**
- Auth / generazione / export: **non modificati**
- `creditPolicy`: **non modificato**

## Prossimo sprint consigliato

**Sprint A2 — Credit Ledger server-side** (wallet + ledger, enforcement ancora off fino a test completi).
