# Scriptora — Cover Studio Pro Max V1 Report

Generated: 2026-05-29  
Sprint: **Cover Studio Pro Max V1** — professional cover OS, future-ready  
Scope: Architecture + premium UX + commercial intelligence. **No image API integration.** STOP after V1 — validate with authors first.

---

## Verdict: **READY WITH POLISH**

Cover Studio now feels like a **professional cover strategy environment** — not an image playground. Core canvas/export pipeline is unchanged. Author validation recommended before image-provider wiring.

---

## Product Principle

| Scriptora is NOT | Scriptora IS |
|------------------|--------------|
| Random AI cover generator | Professional cover strategy + design environment |
| Image API dependent today | Future-ready Cover OS with built-in Scriptora system |
| Generic tips panel | Commercial cover strategist with human explanations |

**Target author reaction:** *"This actually helps me create a commercially strong cover."*

---

## Non-Negotiable Rules — Compliance

| Rule | Status |
|------|--------|
| Zero destructive refactor | ✅ Additive module + UI panels |
| Zero breaking changes | ✅ `CoverGenerator` props/signature preserved |
| Zero dependency on image APIs | ✅ Placeholder providers only |
| Preserve current Cover Studio | ✅ Canvas, TTS-style procedural bg, export paths intact |
| Preserve export compatibility | ✅ PNG download + EPUB JPEG flow unchanged |
| Additive only | ✅ |
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |

---

## 1. Systems Added

### New module: `src/lib/cover-studio/`

| File | Role |
|------|------|
| `types.ts` | `CoverProvider`, readiness tiers, direction suggestions, template families |
| `provider-registry.ts` | Built-in provider + 7 future placeholders (OpenAI, Ideogram, Flux, Stability, Fal, Replicate, Custom) |
| `art-direction.ts` | Genre inference (incl. dark romance, romantasy) — extracted from monolith |
| `cover-intelligence.ts` | Cover Direction Suggestions (mood, typography, composition, palette, BookTok) |
| `cover-readiness-score.ts` | Commercial Cover Readiness Score (5 factors, conservative scoring) |
| `template-families.ts` | 8 curated commercial template families |
| `audiobook-prep.ts` | Square safe crop + title safe zone metadata (foundation only) |
| `constants.ts` | Engine marker + tier labels |
| `index.ts` | Public exports |
| `cover-studio.spec.ts` | 6 unit tests |

### New component

| Component | Role |
|-----------|------|
| `CoverStudioIntelligencePanel.tsx` | Right column — readiness score, direction, family CTA, audiobook prep |

### Modified (surgical)

| File | Change |
|------|--------|
| `CoverGenerator.tsx` | 3-column desktop layout, provider wiring, intelligence memos, rAF canvas debounce, premium copy |
| `Index.tsx`, `BookPreview.tsx`, `Dashboard.tsx`, `HomeExportDialog.tsx` | Optional `projectGenre` prop for intelligence |

---

## 2. Architecture Future Readiness (Phase 1 — P0) ✅

**CoverProvider abstraction** — plug-and-play for future APIs:

```typescript
interface CoverProvider {
  id: string;
  label: string;
  kind: "builtin" | "external";
  available: boolean;
  capabilities: ["generate", "edit", "upscale"];
  generate(input): Promise<CoverProviderResult>;
  edit?(input): Promise<CoverProviderResult>;
  upscale?(input): Promise<CoverProviderResult>;
}
```

| Provider | Status |
|----------|--------|
| `scriptora-builtin` | **Active** — returns art direction + metadata (procedural canvas unchanged) |
| OpenAI Images, Ideogram, Flux, Stability, Fal, Replicate, Custom | **Registered, unavailable** — no UI, no API calls |

**One API key later → swap `getActiveCoverProvider()` — no CoverGenerator refactor required.**

---

## 3. Premium UX Improvements (Phases 2 & 7 — P0/P1) ✅

### Desktop layout (xl+)

| Column | Content |
|--------|---------|
| **Left** | Template families, format/layout, text, back matter, visual controls, export |
| **Center** | Large cover preview (creative studio focal point) |
| **Right** | Commercial intelligence panel |

Mobile/tablet: preview → controls → intelligence (stacked, no regression).

### Microcopy pass

| Before | After |
|--------|-------|
| Scriptora Cover Studio | Cover Studio Pro Max |
| Genera cover / Sfondo Scriptora | Build Cover Direction |
| Genere / atmosfera AI | Visual positioning brief |
| COVER STYLE | FORMAT & LAYOUT |
| Direzione AI | Visual direction (procedural) |

---

## 4. Commercial Intelligence Added (Phases 3 & 5 — P0) ✅

### Cover Direction Suggestions

Genre-aware strategist output:

- **Mood** (e.g. obsessive · dark luxury · emotional tension)
- **Typography** guidance
- **Composition** direction
- **Palette** bias
- **Market positioning** copy
- **BookTok intensity** (low / moderate / high) with human note

Subgenres supported: Dark Romance, Romantasy, Cozy, Literary, Thriller, Fantasy, Authority Nonfiction.

### Cover Readiness Score

Five evaluated factors (conservative, no inflated scores):

1. Genre clarity  
2. Thumbnail readability  
3. Title visibility  
4. Emotional signal  
5. Commercial positioning  

Tiers: **Weak · Developing · Strong · Highly Competitive** (cap 92/100).

Example explanations:
- *"Title loses readability at thumbnail size."*
- *"Strong emotional contrast supports dark romance expectations."*

---

## 5. Template Families (Phase 4 — P1) ✅

Eight curated families with typography, layout, emotional positioning, and visual hierarchy guidance:

- KDP Bestseller  
- BookTok Romance  
- Premium Literary  
- Dark Romance  
- Thriller Commercial  
- Fantasy Cinematic  
- Self-help Authority  
- Cozy Fiction  

One-click apply → template index + genre brief seed.

---

## 6. Audiobook-Ready Prep (Phase 6 — P1) ✅

Foundation metadata only — **no export**:

- Square safe crop coordinates  
- Title safe zone percentages  
- Typography spacing advisory  

Displayed in intelligence panel with explicit V1 scope note.

---

## 7. Performance & Hardening (Phase 8 — P0) ✅

| Check | Action |
|-------|--------|
| Large canvas redraw lag | `requestAnimationFrame` debounce on draw effect |
| Modal overflow | Per-column `overflow-y-auto` on xl; stacked scroll on mobile |
| Export regressions | `handleDownload` / `handleUseForEpub` untouched |
| Save state | No new persistence — existing in-memory EPUB flow preserved |
| Silent provider failures | `generateViaProvider` returns explicit `{ ok: false, error }` |

**Not run in sprint:** physical mobile device QA on large print specs (recommended pre-release).

---

## Tests

```
npx vitest run src/lib/cover-studio/cover-studio.spec.ts
✓ 6/6 passed
```

---

## Regressions Checked

| Area | Result |
|------|--------|
| Canvas rendering pipeline | Unchanged |
| EPUB / KDP / Lulu / Custom specs | Unchanged |
| PNG + JPEG export | Unchanged |
| Upload image + author photo | Unchanged |
| PaywallGuard on Dashboard | Unchanged |
| CoverBeforeExportDialog flow | Unchanged |

---

## Remaining Blockers

| Blocker | Severity | Notes |
|---------|----------|-------|
| No human author validation | Medium | N=0 — proxy tests only |
| Image providers not wired | Expected | By design for V1 |
| Cover not persisted on `BookProject` | Low | Pre-existing; EPUB flow uses parent state |
| Dashboard standalone mode still download-only | Low | Pre-existing |
| Large print canvas on low-end mobile | Low | rAF helps; device QA advised |

---

## Success Criteria — Sprint Assessment

| Criterion | V1 Status |
|-----------|-----------|
| Feel like publisher thinking tool | ✅ Readiness + direction panels |
| Commercially stronger cover decisions | ✅ Score + template families |
| Premium creative OS feel | ✅ 3-column studio layout |
| Actually usable without image APIs | ✅ Built-in system fully functional |
| Future-proof for providers | ✅ Registry + interface ready |

---

## STOP — No V2

Cover Studio Pro Max V1 is **complete for author validation**.

**Do not proceed to:**
- Image API integration UI  
- V2 scoring algorithms  
- Audiobook export  

**Next gate:** Real authors test template families + readiness score trust (N ≥ 5).

---

*Engine marker: `scriptora-cover-studio-pro-max-v1`*
