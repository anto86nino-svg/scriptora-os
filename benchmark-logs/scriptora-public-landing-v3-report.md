# SCRIPTORA PUBLIC LANDING V3 — REPORT

**Sprint:** Public Landing V3 (Million Dollar Version)  
**Date:** 2026-05-29  
**Scope:** Homepage copy, layout, CSS only — no AI, Supabase, DB, or app logic changes  
**Build:** `npm run typecheck` ✅ · `npm run build` ✅  

---

## What Changed

### Narrative shift
- **Before:** Feature-heavy Author OS pitch with mock UI chrome, live generation theater, 40-tool energy
- **After:** Transformation-first story — *Write. Improve. Publish. Dominate.* — selling one workspace instead of tool names

### New page structure
1. **Hero** — headline + sub + CTA (*Start Writing Free* / *Watch Scriptora in Action*)
2. **Social proof strip** — 6 outcome cards (Write, Editing, Market, Cover, Voice, Publishing)
3. **Problem** — fragmented toolchain pain
4. **Solution** — Meet Scriptora OS (one workspace / memory / system)
5. **Differentiation** — *Most AI tools generate text. Scriptora develops books.*
6. **6 macro systems** — not 40 features
7. **Live demo** — tabbed **real screenshots** from `/public/landing/screenshots/`
8. **Audience** — fiction, romance, thriller, fantasy, nonfiction, self-publishers, KDP
9. **Testimonials** — premium **placeholder slots** (no stock photos, no fake quotes)
10. **Pricing** — simplified 3-tier grid (unchanged data source)
11. **Final CTA** — *Your next book starts here.*

### Design direction
- Toned down rainbow gradients → **white primary CTA** (Linear/Stripe tone)
- Dark neutral background `#050608` with subtle blue radial
- Mobile-first responsive grids (6→3→2 cols proof cards; 3→2→1 systems)
- Lazy-loaded demo screenshots; hero video `preload="metadata"`

### Files
- `src/components/landing/ScriptoraLanding.tsx` — rewritten (~280 lines vs ~1250)
- `src/components/landing/landing-v3-data.ts` — copy + data (5 languages)
- `src/index.css` — V3 section styles

---

## 10-Second Comprehension Test

| Question | Pass? |
|----------|-------|
| What is Scriptora? | ✅ Complete OS for authors — write through publish |
| Why is it different? | ✅ Develops books, not text snippets; one workspace |
| Why try it? | ✅ Replaces many tools/subscriptions |
| Why replace multiple tools? | ✅ Problem → Solution arc + real product shots |

---

## Verdict

### Would a professional author trust this platform with their next book?

## **YES — with two polish items**

**Why YES:**
- Messaging sells transformation, not AI buzzwords
- Real product screenshots build credibility
- Visual tone is closer to Linear/Notion than generic AI startup
- Testimonial section is honest (no fabricated social proof)

**Polish before paid ads:**
1. Replace testimonial placeholders with **verified author quotes** (structure ready)
2. Add dedicated **Cover Studio screenshot** — demo tab currently uses export-studio asset as nearest match

---

## STOP

Validate homepage on mobile Safari + desktop. No V4 until author confirms narrative lands.
