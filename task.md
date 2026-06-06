# SCRIPTORA — ERROR INTELLIGENCE & BUG HUNT

## STATUS: IN PROGRESS

## PHASE 1 — AUDIT TARGETS
- [ ] src/lib/generation.ts — callAIOnce, callBlueprintFast, generateBlueprint, generateChapter
- [ ] src/hooks/useBookEngine.ts — catch blocks, error propagation, credit guards
- [ ] src/hooks/useAuth.tsx — session race, hydration
- [ ] src/lib/plan.ts / subscription.ts — fetchPlan, credit checks
- [ ] supabase/functions/generate-book — response contract
- [ ] supabase/functions/generate-blueprint-fast — response contract
- [ ] supabase/functions/kdp-money-engine — response contract
- [ ] src/lib/kdp/ — client side contract match
- [ ] src/lib/api-resilience.ts — circuit breaker
- [ ] src/components/AICoachPanel.tsx — auth header

## PHASE 2 — ScriptoraError type + structured errors
## PHASE 3 — Observability logging
## PHASE 4 — Safe fixes only
## PHASE 5 — Build green

## DECISIONS
- NO UI redesign, NO arch rewrite
- Only: error layer, observability, proven bug fixes
- New file: src/lib/scriptora-error.ts (ScriptoraError type + classifier)
- New file: src/lib/scriptora-logger.ts (lightweight [SCRIPTORA] logger)

## BUGS CONFIRMED SO FAR
- BUG#1 FIXED: callBlueprintFast anon key — committed 2632220
- BUG#2 STASHED: useAuth clearCorruptedSession race — excluded from commit, stash dropped
