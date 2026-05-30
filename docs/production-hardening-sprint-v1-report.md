# Production Hardening Sprint V1 — Final Report

**Branch:** `mobile-overlay-fix-safe`  
**Date:** 2026-05-29  
**Scope:** C1–C5, H1 (proposal), H5, safe performance pass

---

## 1. Files modified

### Security — Edge Functions
- `supabase/functions/_shared/edge-guard.ts` **(new)** — centralized JWT + plan + quota
- All 24 `supabase/functions/*/index.ts` — guard at entry

### Security — Frontend
- `src/lib/app-environment.ts` **(new)**
- `src/lib/dev-mode.ts` — dev tools local-only
- `src/components/ProtectedRoute.tsx` — removed auth bypass; `ownerOnly` prop
- `src/hooks/useAuth.tsx` — owner dev auto-enable local only
- `src/lib/supabase-function-auth.ts` — removed anon JWT retry on 401
- `src/components/DevModeUnlockDialog.tsx` — hidden in production
- `src/pages/Dashboard.tsx` — logo dev unlock gated
- `src/App.tsx` — auto-bestseller + usage routes hardened

### Performance
- `src/App.tsx` — lazy Home, Auth, Pricing, Install, NotFound
- `src/components/EditorPanel.tsx` — lazy ChapterIntelligencePanel

### Tooling / Docs
- `scripts/scriptora-health.mjs` — service-role health ping
- `docs/production-hardening-supabase-report.md`
- `docs/limit-system-unification-proposal.md`
- `docs/production-hardening-sprint-v1-report.md` (this file)

---

## 2. Problems corrected

| ID | Fix |
|----|-----|
| **C1** | All 24 edge functions require authenticated JWT; plan from `user_plans`; token/book quotas server-side |
| **C2** | `isDevMode()` false in production; ProtectedRoute always requires auth |
| **C3** | Password unlock + sessionStorage bypass disabled outside localhost/vite dev |
| **C5** | `/auto-bestseller` → `requiredFeature="bestseller_prediction"`; edge `minTier: premium` |
| **H3** | Owner dev auto-enable only on local dev hosts |
| **H4** | Removed anon fallback on edge 401; server is source of truth |
| **H5** | Modal tier z-[110] preserved; Dashboard uses `scriptora-modal-overlay`; body scroll lock intact |

---

## 3. Problems still open

| ID | Status | Action required |
|----|--------|-----------------|
| **C4** | Open | Apply Supabase migrations on production (see supabase report) |
| **C1 deploy** | Open | `supabase functions deploy` all functions to production |
| **H1** | Open | Implement `entitlements.ts` (proposal only) |
| **H2** | Open | Payments still `coming_soon` — business decision |
| **H5 live** | Open | Vercel prod deploy for mobile fixes if not yet deployed |

**Note:** Until C4 migrations run, edge-guard may treat all users as `free` when `user_plans` 404s — Pro users could be blocked server-side after edge deploy.

---

## 4. Edge security audit

### Protected (24/24 in repo)

`activate-beta`, `ai-usage-summary`, `analyze-chapter`, `auto-bestseller-engine`, `bestseller-radar`, `detect-book-intent`, `dominate-chapter`, `expand-author-bio`, `fix-section`, `generate-blueprint-fast`, `generate-book`, `generate-scene-image`, `genre-coach`, `go-no-go-engine`, `kdp-money-engine`, `live-coach`, `market-validator`, `molly-chat`, `patch-chapter`, `publish-tools`, `scriptora-character-bible`, `scriptora-novel-idea`, `title-autofill`, `title-intelligence`

### Vulnerable until deploy

Production Supabase still runs **previous** edge code without guards until `supabase functions deploy`.

### Bypass paths eliminated (frontend)

- Dev Mode auth bypass
- Password unlock in production
- Anon JWT retry on edge 401
- Client-supplied `plan` on scene images (now server plan)
- Client-supplied `userIds` on usage summary (owner-only, self scope)

---

## 5. Build result

```
npm run build → ✅ GREEN (8.03s)
bootstrap chunk: 163.94 KB (was 275 KB) — landing lazy-loaded
Home chunk: 66.33 KB (split from bootstrap)
```

---

## 6. Test result

```
npm test → 58/59 pass (21/22 files)
FAIL: narrative-benchmark.live.spec.ts — network blocked (ENOTFOUND, pre-existing live test)
Unit tests including supabase-function-auth: ✅ pass
```

---

## 7. Dev mode bypass eliminated

| Bypass | Before | After |
|--------|--------|-------|
| `nexora_dev_mode` sessionStorage | Works in prod | Ignored unless localhost/vite dev |
| ProtectedRoute dev bypass | Skips auth | Always requires user |
| Password dialog | Works anywhere | Local only |
| Logo 3-tap (Dashboard) | Enabled dev in prod | Local only |
| Owner email auto-dev | Always | Local only |
| `/usage` | Any auth user | Owner email only |

Local dev (`npm run dev` / localhost): unchanged — dev tools still work.

---

## 8. Mobile result

- Global modal tier: `z-[110]` > header `z-[100]` > nav `z-40`
- `scriptora-mobile-overlay-open` body lock on Dashboard + Index
- `100dvh` / `pb-safe` on feature pages and modals
- Dashboard inline delete modal uses `scriptora-modal-overlay` class

---

## 9. Performance result

| Change | Impact |
|--------|--------|
| Lazy Home/Auth/Pricing/Install | bootstrap −111 KB |
| Lazy ChapterIntelligencePanel | Loaded only when diagnostica opened |
| export-engine / market-engine | Unchanged (already code-split); no logic changes |

---

## 10. Auto-Bestseller strategy (C5)

- **Route:** `ProtectedRoute requiredFeature="bestseller_prediction"` (Premium)
- **Edge:** `minTier: premium`, `checkBooksPerMonth: true`
- **Token economy hook:** debit ST bundle on `auto-bestseller-engine` POST/SSE start (future — see limit proposal)

Free users: redirected to `/pricing` at route; edge returns 403 if called directly.

---

## Next steps (manual)

1. Apply Supabase migrations (C4)
2. Deploy edge functions: `supabase functions deploy`
3. Deploy frontend: Vercel production
4. Verify logged-in Pro user can generate after migrations
5. Token Economy Phase 1 audit when ready
