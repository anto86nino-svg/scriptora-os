# Limit System Unification Proposal (H1)

**Status:** Proposal only — NOT implemented in Sprint V1  
**Date:** 2026-05-29

---

## Current dual system

| Layer | File | Units | Used by |
|-------|------|-------|---------|
| Token economy v0 | `plan.ts` | `total_tokens` per project, books/month | Quota badges, export/dominate flags, edge-guard |
| Feature gates v2 | `subscription.ts` | Feature keys, words/book, scene images/month | PaywallGuard, ProtectedRoute, UI locks |

Both read `PlanTier` from `user_plans` but define **different limits** for the same tier:

- Free: 10k **tokens** (plan.ts) vs 10k **words** (subscription.ts)
- Pro: 10 books/month (plan.ts) vs `booksPerMonth: 10` (subscription.ts) — aligned
- Premium: dominate in plan.ts `canDominate` vs subscription `dominate_mode` feature key

---

## Duplications

1. **Export permission** — `PLAN_LIMITS.canExport` and `PLAN_LIMITS_V2.canExport` + `export_epub` feature
2. **Dominate** — `canDominate` vs `dominate_mode` feature vs edge `minTier: premium`
3. **Books/month** — `getBooksThisMonth()` vs `PLAN_LIMITS_V2.booksPerMonth`
4. **Dev override** — `dev-plan-override.ts` only affects `plan.ts` path; subscription reads override indirectly via `usePlan`
5. **Scene images** — subscription `sceneImagesPerMonth`; edge `generate-scene-image` monthly count on cache table

---

## Proposed single module: `src/lib/entitlements.ts`

```typescript
export interface UserEntitlements {
  tier: NormalizedTier;
  features: Set<FeatureKey>;
  limits: {
    maxTokensPerBook: number | null;
    maxWordsPerBook: number;
    booksPerMonth: number | null;
    sceneImagesPerMonth: number | null;
    liveResearchPerMonth: number;
  };
}

export async function resolveEntitlements(userId: string): Promise<UserEntitlements>;
export function canAccessFeature(ent: UserEntitlements, key: FeatureKey): boolean;
export async function assertEdgeEntitlement(userId: string, key: FeatureKey, projectId?: string): Promise<void>;
```

### Migration path (future sprint)

1. **Phase A** — `entitlements.ts` wraps both files; `plan.ts` + `subscription.ts` re-export (no UI change)
2. **Phase B** — Replace `canUseFeature` + `getQuotaForProject` call sites with `resolveEntitlements`
3. **Phase C** — Align token vs word limits using Token Economy V1 audit (`docs/token-economy-v1-executive-plan.md`)
4. **Phase D** — Remove duplicate constants; edge-guard imports entitlements map

---

## Token economy integration points

| Action | Current gate | Future ST debit |
|--------|--------------|-----------------|
| Chapter generation | token cap / project | `generate-book` edge |
| Chapter doctor | pro feature | `analyze-chapter` + ST |
| Auto-Bestseller | premium feature | `auto-bestseller-engine` + ST bundle |
| Scene image | pro + monthly count | `generate-scene-image` + ST |
| Market tools | pro features | per-engine ST table |

---

## Recommendation

Do **not** merge in Sprint V1. Edge-guard now enforces server-side tier + token/book caps from `plan.ts` semantics. Unification should follow Token Economy calibration (usage audit script) to avoid breaking Free tier UX.
