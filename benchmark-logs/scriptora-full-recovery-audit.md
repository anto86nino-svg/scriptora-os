# SCRIPTORA — Full Recovery + State Audit

**Generated:** 2026-05-29  
**Mode:** READ-ONLY audit — no code changes, no refactors  
**Branch audited:** `ui-premium-upgrade` / `main` (post boot-fix deploy)  
**Production:** https://scriptora-os.vercel.app — **verified loading** (landing + dashboard in DEV)

---

## Executive summary

Scriptora is **not a greenfield project**. It is a **mature, multi-layer author OS** with:

- **12 live routes**, 27 Supabase edge functions, dual generation pipelines (Writer Engine + Auto Bestseller Architect)
- **Production-grade** Chapter Doctor, Blueprint Integrity, Author Identity/Brain, client-side exports, KDP stack
- **Heuristic + AI hybrid** editorial intelligence (local detectors + DeepSeek edge functions)
- **Recent survival:** Production V2 sprint (honest chapter deltas, editorial dashboard, market premium scores), UI consistency sprint (86 desktop / 81 mobile GO), mobile hardening, landing V3, Book Architect localization, boot/blank-screen fixes

**Do NOT rebuild.** The correct posture is **surgical recovery**: fix regressions, wire orphans, unify duplicate limit systems, and fill partial gaps — without touching auth, Supabase schema, or generation architecture.

---

## 1. FULL STATUS — System by system

Legend: ✅ COMPLETE · 🟡 PARTIAL · 🔴 MISSING · ⚠️ BROKEN · ♻️ REGRESSION

### Core shell & routing

| System | Status | Evidence |
|--------|--------|----------|
| App routing (`App.tsx`) | ✅ | 12 routes + 404; lazy pages behind `Suspense` |
| Auth (Supabase) | ✅ | `useAuth.tsx`, `Auth.tsx`, OAuth + email |
| Legal consent gate | ✅ | `legal-consent.ts`, Home dialog |
| ProtectedRoute + plan gates | ✅ | `ProtectedRoute.tsx`, `canUseFeature` |
| Boot gate (`ScriptoraBootGate`) | 🟡 | Fixed Suspense deadlock (2026-05-29); 12s safety timeout; still cinematic overlay |
| Boot env check | ✅ | `main.tsx` → `bootstrap.tsx`; lazy Supabase client |
| AppErrorBoundary | ✅ | Visible error UI instead of silent crash |
| `/install` route | 🟡 | Registered but **no in-app links** (orphan) |

### Public & dashboard

| System | Status | Evidence |
|--------|--------|----------|
| Public Home / Landing V3 | ✅ | `ScriptoraLanding.tsx`, `landing-v3-data.ts`, EN/IT/ES/FR/DE |
| Dashboard Launchpad OS | ✅ | `Dashboard.tsx` (~1500 lines), OS cards, library/drafts modals |
| ScriptoraStepGuide | ✅ | Route + dialog-aware contextual steps |
| DevModeBadge / GlobalCuriosity | 🔴 | Mount globally but **return `null`** (dead stubs) |
| Usage page (dev) | ✅ | `UsagePage.tsx`, AI cost tracking |

### Writer OS (Editor)

| System | Status | Evidence |
|--------|--------|----------|
| Editor `/app` | ✅ | `Index.tsx`, `useBookEngine.ts`, sidebar, focus mode |
| EditorPanel | ✅ | Chapter editing, generation UX |
| Project recovery | ✅ | sessionStorage handoff, `storageService.ts` |
| GuidedProjectFlow | 🔴 | Imported in Index, **never rendered** |
| ChatPanel | 🔴 | **Never imported** (dead) |

### Generation pipeline

| System | Status | Evidence |
|--------|--------|----------|
| Book engine (blueprint → chapters) | ✅ | `useBookEngine.ts`, `generation.ts` |
| Chunked chapter generation | ✅ | `generateChapterChunked`, progress callbacks |
| “Streaming” to UI | 🟡 | Chunk progress + **cosmetic typewriter** (`usePerceivedStream.ts`); not live LLM tokens |
| Auto Bestseller Architect | ✅ | `AutoBestsellerPage.tsx`, orchestrator, handoff pack |
| Auto Bestseller true SSE | ✅ | `autoBestsellerService.ts`, `auto-bestseller-engine` |
| Long-book memory (main path) | 🟡 | Regex/heuristic `long-book-memory/` — not AI summaries |
| AB memory (architect path) | ✅ | AI summaries in `auto-bestseller-engine` |
| Dominate / patch chapter | ✅ | `DominationContext`, edge functions |
| Target word count | ✅ | `subscription.ts` `maxWordsPerBook`, engine checks |
| Auto expand | 🟡 | Exists in generation paths; not unified UX label |

### Editorial intelligence (Phase 2A)

| Detector / capability | Status | File |
|---------------------|--------|------|
| emotional redundancy | 🟡 | `EditorialIntelligence.ts` — heuristic, IT-biased |
| dialogue perfection | 🟡 | same |
| weak subtext | 🟡 | same |
| climax oversaturation | 🟡 | detector exists; **`climaxDensityScore` always 0** ⚠️ |
| overwritten endings | 🟡 | detected; weak score penalty wiring |
| emotional predictability | 🟡 | mapped via dialogue_perfection |
| tonal repetition | 🟡 | via repetitive_symbolism |
| emotional pacing | 🟡 | via climax_oversaturation |
| behavioral expression deficit | 🟡 | via weak_subtext |
| emotional convenience | 🟡 | via dialogue_perfection |
| repetitive scene purpose | 🟡 | via emotional_redundancy |
| breathing imbalance | 🟡 | via weak_subtext |
| conflict collapse | 🟡 | detected only, no score penalty |
| character flattening | 🟡 | detected only |
| AI paragraph diagnostics | ✅ | `analyze-chapter` edge function |

**Engine-level issues (do not rewrite — patch):**
- ♻️ `analyzeNovel()` runs detectors **twice** (inflated warnings)
- ♻️ Score penalties ignore several warning types
- 🟡 EN/ES/FR books get weak local detector coverage

### Editorial scores (Phase 2B)

| Score | Status | Where |
|-------|--------|-------|
| emotional realism | 🟡 | Heuristic 0–100; AI 1–10 in analyze-chapter |
| dialogue humanity | 🟡 | same |
| subtext strength | 🟡 | same |
| pacing balance | 🟡 | same |
| character depth | 🟡 | same |
| commercial readability | ✅ | `editorial-dashboard-pro`, V2 sprint |
| Chapter Doctor delta (honest) | ✅ | `score-calibration.ts`, `delta-engine.spec.ts` |

### Chapter Doctor / Rewrite / Diagnostics

| System | Status | Evidence |
|--------|--------|----------|
| Chapter Doctor Pro (Surgical Edit) | ✅ | `chapter-doctor-pro/*`, `ChapterIntelligencePanel.tsx` |
| FixChapterComparisonModal | ✅ | Word diff, metric deltas, credibility stats |
| EditorialCompareView | 🔴 | **Orphaned** — superseded, zero imports |
| Manuscript Lab (book scan) | ✅ | `ManuscriptAnalyzerDialog.tsx` |
| Rewrite Studio | 🟡 | Dashboard card → `/app?mode=rewrite` (not separate dialog) |
| Book Editorial Dashboard | ✅ | Heatmap, tension, drop-risk (≥2 chapters) |
| Surgical Edit Engine V1 (local) | 🟡 | Regex preview only; **production = AI patch-chapter** |
| Revert / apply patch | ✅ | DominationContext flow |

### Blueprint & canon (Phase 2C–D)

| System | Status | Evidence |
|--------|--------|----------|
| Blueprint Integrity Engine | ✅ | `BlueprintIntegrityEngine.ts`, wired in generation + patch |
| Blueprint (AI) | ✅ | `generateBlueprint`, `generate-blueprint-fast` |
| Book Architect blueprint UI | ✅ | `ArchitectFlow.tsx`, localized copy (recent) |
| Story Bible Lock | 🟡 | `StoryBibleLock.ts` (~1070 lines) — **post-process only** via Humanizer |
| Canon in surgical edit | 🔴 | Story Bible **not** in patch-chapter prompts |
| Story Bible UI toggle | 🔴 | env/localStorage only |

### Author Brain / Identity (Phase 2E)

| System | Status | Evidence |
|--------|--------|----------|
| Author Identity CRUD | ✅ | `author-identity.ts`, `AuthorIdentityDialog.tsx` |
| Pen name / voice lock | ✅ | `enforceAuthorIdentityLock`, NewBook, TopBar |
| Author Brain V1–V6 | ✅ | `author-brain/*` — **FROZEN** |
| Front/back matter injection | ✅ | `author-brain/injection.ts` |
| Multi-author isolation | ✅ | hardening-suite 32 assertions |
| Published books / platform (V2+) | 🟡 | Data model exists; limited auto-injection per V6 report |

### Studios

| Studio | Status | Evidence |
|--------|--------|----------|
| Cover Studio | ✅ | `CoverGenerator.tsx`, canvas KDP specs, readiness score |
| Cover external AI providers | 🔴 | `provider-registry.ts` — stubs only |
| Voice Studio | ✅ | `VoiceStudioDialog.tsx`, Web Speech API |
| Voice Studio mobile TTS | 🟡 | iOS pause flaky per V2 report |
| ReadAloudModal | 🔴 | Orphaned duplicate of Voice Studio |
| Character Studio | ✅ | `CharacterStudioDialog.tsx`, edge functions |
| Export Studio | ✅ | EPUB/PDF/DOCX client-side, `HomeExportDialog.tsx` |
| Notepad | ✅ | `NotepadDialog.tsx` |

### KDP & market

| System | Status | Evidence |
|--------|--------|----------|
| KDP Launch wizard | ✅ | `KdpLaunchPage.tsx`, `money-engine.ts` |
| Keyword Gold | ✅ | `KeywordGoldPage.tsx` |
| Bestseller Radar | 🟡 | Live API + **static sample data before first search** |
| Title Intelligence | ✅ | `TitleIntelligenceDialog.tsx`, edge + fallback |
| KdpEditorialMapDialog | 🔴 | **Never imported** |
| Market premium scores | ✅ | `market-intelligence-premium.ts`, V2 sprint |
| Go/no-go engine | ✅ | edge function exists |

### Paywall & plans

| System | Status | Evidence |
|--------|--------|----------|
| Feature gating (routes/dialogs) | ✅ | `subscription.ts`, `PaywallGuard`, `ProtectedRoute` |
| Word limits per book | ✅ | `PLAN_LIMITS_V2.maxWordsPerBook` |
| Token limits (legacy) | ✅ | `plan.ts` `maxTokensPerBook` |
| Dual limit systems | ⚠️ | **plan.ts vs subscription.ts can disagree** (beta/pro) |
| Stripe / live payments | 🔴 | `payments.ts` default `coming_soon` |
| Beta activation | ✅ | `activate-beta` edge function |
| Free 10k words | ✅ | enforced in engine |
| Export gating (free blocked) | ✅ | `canExport` |

### Storage & library

| System | Status | Evidence |
|--------|--------|----------|
| Local storage + IndexedDB | ✅ | `storage.ts` |
| Cloud sync (`projects`) | ✅ | `storageService.ts` |
| Library / drafts UI | ✅ | `LibrarySection`, Dashboard modals |
| Molly sidecar storage | ✅ | Separate from book library (intentional) |

### Mobile & UI

| System | Status | Evidence |
|--------|--------|----------|
| Mobile hardening CSS | ✅ | `mobile-hardening.css`, overflow fixes |
| Feature page shell | ✅ | `.scriptora-feature-page`, modal shell |
| UI consistency sprint | ✅ | GO 86/81/84 (benchmark report) |
| Book Architect mobile wizard | ✅ | Single-screen steps, `useIsMobile.ts` |
| Blank / boot screen | ♻️ | **Fixed 2026-05-29** (was blocking lazy routes) |
| Modal positioning | 🟡 | Improved; some dialogs still pre-shell pattern |
| Half-screen / black zones | 🟡 | Reduced; Editor generation preview patched |

### Auth & Supabase

| System | Status | Evidence |
|--------|--------|----------|
| Supabase client | ✅ | Lazy init, env guard |
| 27 edge functions | ✅ | `supabase/functions/` |
| Migrations | ✅ | projects, user_plans, ai_usage_logs, scene cache |
| Local `.env` | ⚠️ | Requires `VITE_SUPABASE_*`; `vercel env pull` may return empty keys locally |

### Placeholder / coming soon (intentional)

| Area | Status |
|------|--------|
| Payments checkout | Infrastructure only |
| Native downloads | Infrastructure only |
| Landing testimonials | “Coming soon” slots |
| Cover AI providers | Registry placeholders |
| Some atmosphere profiles | “Coming soon” tiles |

---

## 2. WHAT SURVIVED (do not touch)

These systems are **working, wired, and recently validated**. Recovery must **preserve** them:

| Area | Key files | Why fragile to refactor |
|------|-----------|-------------------------|
| Book generation core | `useBookEngine.ts`, `generation.ts`, `generate-book` | Production path; handoff from Architect |
| Chapter Doctor + comparison | `chapter-doctor-pro/`, `FixChapterComparisonModal.tsx`, `score-calibration.ts` | V2 trust fix; tested deltas |
| Blueprint Integrity | `BlueprintIntegrityEngine.ts` | Injected in generation + patch |
| Author Identity + Brain | `author-identity.ts`, `author-brain/*` | FROZEN modules with hardening tests |
| Auto Bestseller Architect | `auto-bestseller-architect/*`, `AutoBestsellerPage.tsx` | Mobile wizard + localization just shipped |
| Export pipeline | `epub.ts`, `docx-export.ts`, `pdf-export.ts` | Client-only, no server dependency |
| Cover canvas engine | `CoverGenerator.tsx`, `cover-studio/*` | Real KDP output |
| KDP money engine | `kdp/money-engine.ts`, `kdp-money-engine` | Market wizard dependency |
| Storage sync | `storageService.ts`, `storage.ts` | User data path |
| Auth + consent | `useAuth.tsx`, `legal-consent.ts` | Gate for all protected routes |
| UI shell utilities | `index.css` scriptora-feature-* | Cross-page consistency |
| Boot fix | `ScriptoraBootGate.tsx`, `main.tsx`, `bootstrap.tsx` | Fixes white screen regression |

---

## 3. WHAT IS PARTIAL / MISSING / BROKEN

### Partial (restore incrementally)

1. **Editorial Intelligence local engine** — detectors exist but scoring gaps, IT bias, duplicate pass
2. **Story Bible Lock** — rich logic, only Humanizer post-process; not in Chapter Doctor
3. **Streaming UX** — user sees typewriter; not true token stream on main engine
4. **Long-book memory** — heuristic only on main path vs AI memory on Auto Bestseller
5. **Rewrite Studio** — routes to editor mode, not standalone studio
6. **Voice Studio iOS** — pause/resume edge cases
7. **Bestseller Radar** — demo samples until first search
8. **Author Brain ecosystem fields** — collected, not fully auto-injected everywhere
9. **Boot overlay** — works but adds latency; safety timeout masks lazy chunk failures

### Missing (orphans / never wired)

- `EditorialCompareView.tsx`
- `ReadAloudModal.tsx`
- `KdpEditorialMapDialog.tsx`
- `ChatPanel.tsx`
- `GuidedProjectFlow.tsx`
- `DevModeBadge`, `GlobalCuriosity` (stubs)
- Cover external AI providers
- Live Stripe checkout
- Story Bible UI toggle
- `/install` navigation links

### Broken / regression

| Issue | Severity | Location |
|-------|----------|----------|
| Dual plan limit systems (words vs tokens) | Medium | `plan.ts` + `subscription.ts` |
| `analyzeNovel` double detector pass | Low | `EditorialIntelligence.ts` |
| `climaxDensityScore` always 0 | Low | `EditorialIntelligence.ts` |
| Local `.env` empty keys after vercel pull | Medium | dev experience |
| Live API author pass blocked without keys | Low | benchmark only |
| ManuscriptAnalyzer `.backup` file clutter | Low | `src/components/` |

### Recently fixed (monitor, do not revert)

- ♻️ White / blank screen on boot (Suspense + env deferral) — **2026-05-29**
- ♻️ Mobile overflow, sidebar overlap — mobile hardening commit
- ♻️ Book Architect language mix — localized-copy module

---

## 4. DUPLICATE LOGIC MAP (do not add a third copy)

| Concern | Copy A | Copy B | Recommendation |
|---------|--------|--------|----------------|
| Plan limits | `plan.ts` (tokens, export, dominate) | `subscription.ts` (words, features) | **Unify read path** — single `getEffectiveLimits()` |
| Chapter memory | `long-book-memory/` | Auto Bestseller summaries | Keep separate; document; optional future bridge |
| Surgical edit | AI `patch-chapter` | Local `surgical-edit-engine` regex | Keep both; local = test/benchmark only |
| TTS | `VoiceStudioDialog` | `ReadAloudModal` | Delete or archive ReadAloudModal |
| Comparison UI | `FixChapterComparisonModal` | `EditorialCompareView` | Delete orphan |
| Character bible | Character Studio UI | Auto Bestseller auto-bible | Keep both; share edge function where possible |
| Payments UI | `PricingPage` | Landing `#pricing` | Intentional; landing is marketing-only |

---

## 5. SAFE RECOVERY ROADMAP (prioritized — DO NOT IMPLEMENT YET)

### P0 — Stability & trust (smallest risk, highest user impact)

| # | Action | Files involved | Risk |
|---|--------|----------------|------|
| 1 | Verify boot + lazy routes on real devices (iOS Safari, Android Chrome) | `ScriptoraBootGate.tsx`, `App.tsx` | Low |
| 2 | Document/fix local `.env` setup (anon key from Supabase dashboard) | `.env.example`, README | None |
| 3 | Fix `analyzeNovel` duplicate detector pass | `EditorialIntelligence.ts` | Low |
| 4 | Wire `climaxDensityScore` from existing detector | `EditorialIntelligence.ts` | Low |

### P1 — Consistency without architecture change

| # | Action | Files involved | Risk |
|---|--------|----------------|------|
| 5 | Unify plan limit **read** surface (words authoritative; tokens legacy display or aligned) | `plan.ts`, `subscription.ts`, `useBookEngine.ts`, `Index.tsx` | Medium — test all tiers |
| 6 | Remove or archive dead components | `EditorialCompareView.tsx`, `ReadAloudModal.tsx`, `ChatPanel.tsx`, `GuidedProjectFlow` import | Low if delete only |
| 7 | Wire `/install` from Downloads or footer | `DownloadsPage.tsx`, `ScriptoraLanding.tsx` | Low |
| 8 | Migrate remaining modals to `.scriptora-modal-*` shell | Any dialog still on `max-h-[85vh]` whole-scroll | Low–medium |

### P2 — Complete partial systems (additive)

| # | Action | Files involved | Risk |
|---|--------|----------------|------|
| 9 | Inject Story Bible block into `patch-chapter` / DominationContext (mirror Blueprint Integrity) | `StoryBibleLock.ts`, `DominationContext.tsx`, `patch-chapter/index.ts` | Medium |
| 10 | Story Bible toggle in Settings (localStorage, like Blueprint Integrity) | `SettingsPanel.tsx` or Advanced Appearance | Low |
| 11 | Wire `KdpEditorialMapDialog` from KDP Launch or Dashboard | `KdpLaunchPage.tsx`, `KdpEditorialMapDialog.tsx` | Low |
| 12 | Bestseller Radar: hide samples until first search OR label “demo” | `BestsellerRadarPage.tsx` | Low |
| 13 | Extend EI detector phrase lists for EN (minimal) | `EditorialIntelligence.ts` | Low |

### P3 — Premium polish (only after P0–P2 stable)

| # | Action | Files involved | Risk |
|---|--------|----------------|------|
| 14 | True token streaming on main engine (optional) | `generate-book/index.ts`, `generation.ts` | **High** — do last |
| 15 | Unify long-book memory with AB summaries | `long-book-memory/`, architect handoff | High |
| 16 | Configure cover external provider (one) | `cover-studio/provider-registry.ts` | Medium |
| 17 | Enable payments when Stripe ready | `payments.ts`, `PricingPage.tsx` | Business decision |
| 18 | Implement DevModeBadge / GlobalCuriosity or remove mounts | `DevModeBadge.tsx`, `GlobalCuriosity.tsx`, `App.tsx` | Low |

---

## 6. RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Refactoring generation.ts | Medium if touched | **Critical** | **Forbidden** in recovery — additive prompts only |
| Breaking Chapter Doctor deltas | Low if calibration untouched | High | Keep `score-calibration.spec.ts` green |
| Plan limit unification breaks free tier | Medium | High | Test free/pro/premium/beta matrix before ship |
| Story Bible in patch over-constrains AI | Medium | Medium | Feature flag + default off |
| Deleting “dead” files that are dynamically imported | Low | Medium | Grep + build before delete |
| Supabase migration changes | Low if avoided | Critical | **No schema changes** in recovery |
| Mobile regressions from modal migration | Medium | Medium | Test 390px on Dashboard, Editor, Architect |
| Local dev blank screen | High without `.env` key | Medium | Config screen now visible (fixed) |

---

## 7. PRODUCTION READINESS SCORECARD (audit-derived)

| Area | Score | Verdict |
|------|-------|---------|
| Core Writer OS | **88** | ✅ Production-ready |
| Chapter Doctor / diagnostics | **90** | ✅ Trust restored (V2) |
| Auto Bestseller Architect | **85** | ✅ Recent mobile + i18n |
| Dashboard / navigation | **86** | ✅ |
| Mobile UX | **81** | 🟡 GO with monitoring |
| Editorial local engine | **65** | 🟡 Heuristic gaps |
| Story Bible / canon UX | **55** | 🟡 Backend-only |
| Payments / billing | **40** | 🔴 Coming soon |
| Code hygiene (dead files) | **60** | 🟡 Clutter, not blocking |

**Overall recovery posture:** **CONTINUE FROM CURRENT STATE** — not rebuild.  
**Soft launch:** ✅ GO  
**€99/mo premium claim:** ⚠️ Conditional (payments + live API proof gaps)  
**Enterprise:** ❌ NO GO

---

## 8. FILES TO TOUCH FIRST (when approved)

**P0 only:**
- `src/lib/EditorialIntelligence.ts`
- `src/components/ScriptoraBootGate.tsx` (verification only)
- `.env.example` (+ docs note for local anon key)

**P1:**
- `src/lib/plan.ts`, `src/lib/subscription.ts`
- `src/components/EditorialCompareView.tsx` (delete candidate)
- `src/components/ReadAloudModal.tsx` (delete candidate)
- `src/pages/Index.tsx` (remove GuidedProjectFlow import)

**Do NOT touch in recovery sprint:**
- `supabase/migrations/*`
- `useAuth.tsx` / auth flow
- `generate-book` streaming protocol (until P3)
- `author-brain/*` (FROZEN)
- `BlueprintIntegrityEngine.ts` (working)

---

## 9. WAITING FOR APPROVAL

No implementation has been performed in this audit.  
**Next step:** User selects priority band (P0 / P1 / P2) or specific items from the roadmap.

---

*Audit method: full codebase exploration via routes, lib modules, edge functions, benchmark-logs, and production smoke checks. No destructive commands run.*
