# Supabase Production Schema Report (C4)

**Project ref:** `pwdcqnrclhetgxiqnjtr`  
**Date:** 2026-05-29  
**Action:** Read-only audit — migrations NOT applied automatically

---

## Expected tables (from repo migrations)

| Table | Migration | Purpose |
|-------|-----------|---------|
| `projects` | `20260414191532` | Cloud book sync, books/month quota |
| `user_plans` | `20260419184549` + alters | Plan tier per user |
| `auto_bestseller_runs` | `20260418194342` | Auto-Bestseller recovery |
| `ai_usage_logs` | `20260419174656` | Token/cost tracking |
| `scene_image_cache` | `20260520170000` | Scene image dedup + limits |
| `user_sessions` | `20260419193655` | Beta anti-abuse |

Later migrations (`20260420143007`, `20260420143025`, `20260420202948`) tighten RLS to `auth.uid()` and reject sandbox user IDs.

---

## Production symptoms (pre-fix)

| Query target | HTTP | Frontend fallback |
|--------------|------|-------------------|
| `projects` | 404 | `localStorage` via `storageService` |
| `user_plans` | 404 | `nexora_plan_cache_v1` in localStorage |
| `auto_bestseller_runs` | 404 | Session/local run state only |

`supabase-cloud-capabilities.ts` probes these tables and sets `cloudSyncAvailable: false` when missing — reduces console noise for anonymous users.

---

## Root cause

Production Supabase project has **partial schema**: `ai_usage_logs` likely exists (usage works intermittently) but **core app tables were never migrated** or were dropped.

All 13 migration files in `supabase/migrations/` must be applied in timestamp order on production.

---

## Queries generating 404

```typescript
// plan.ts
supabase.from("user_plans").select("plan").eq("user_id", userId)

// plan.ts — books this month
supabase.from("projects").select("*", { count: "exact", head: true })

// useAutoBestseller / InProgressSection
supabase.from("auto_bestseller_runs").select(...)

// edge-guard.ts (server-side, after deploy)
admin.from("user_plans") ...
admin.from("projects") ...
admin.from("ai_usage_logs") ...
```

Until migrations run, edge-guard falls back to plan `"free"` when `user_plans` query fails — **authenticated Pro users may be blocked server-side**.

---

## Recommended actions (manual)

1. `supabase link --project-ref pwdcqnrclhetgxiqnjtr`
2. `supabase db push` (or apply migrations via Dashboard SQL)
3. Verify: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('projects','user_plans','auto_bestseller_runs');`
4. Re-deploy edge functions with `edge-guard.ts`
5. Smoke test: login → Dashboard → confirm no 404 on `user_plans`

---

## RLS note

After RLS migrations, clients need authenticated JWT matching `user_id` column (UUID string from `auth.users.id`). Sandbox IDs like `local-user-free` are rejected by triggers.
