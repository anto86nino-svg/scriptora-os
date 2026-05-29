# Scriptora — Author Brain V5 Report

Generated: 2026-05-29  
Sprint: **Passive Author Intelligence** — Step 5 only  
Scope: Soft, invisible personalization. No writing engine changes. STOP after this step.

---

## Goal

Scriptora already knows **who** the author is (V1–V3A) and **how** they want to be perceived (V4).

Step 5 activates that knowledge **passively** — not to write the book, but to improve:

- brand consistency
- author feeling
- premium personalization

Target user reaction:

> *"Why does this already feel like me?"*

**Not:** *"The AI changed everything."*

---

## Readiness: **Step 5 complete**

| Criterion | Status |
|-----------|--------|
| Passive intelligence module | ✅ |
| Bio expand soft voice memory (Phase 1) | ✅ |
| About the Author cadence (Phase 2) | ✅ |
| Other Books / Follow tone (Phase 3) | ✅ |
| KDP / Radar market copy tone (Phase 4) | ✅ |
| Passive UI micro-moments (Phase 5) | ✅ |
| Safety guardrails + cliché strip (Phase 6) | ✅ |
| Chapter generation unchanged | ✅ |
| Editorial diagnostics unchanged | ✅ |
| Export structure unchanged | ✅ |
| Author Brain V1–V4 preserved | ✅ |
| `npm run typecheck` | ✅ |
| `npm run build` | ✅ |

---

## Files Touched

| File | Change |
|------|--------|
| `src/lib/author-brain/passive-intelligence.ts` | **New** — tone resolver, cadence helpers, market copy nudge, cliché strip |
| `src/lib/author-brain/index.ts` | Export passive-intelligence API |
| `src/lib/author-brain/expand-bio.ts` | `expandAuthorBioFromIdentity()` passes voice memory + tone directive |
| `src/lib/author-brain/injection.ts` | About cadence, passive Other Books / Follow headings |
| `supabase/functions/expand-author-bio/index.ts` | Accepts `authorPresence`, `readerEmotionalGoals`, `authorMessage`, `toneDirective` |
| `src/lib/publishing-intelligence/index.ts` | Optional `authorIdentity` on radar intel; soft market copy tone |
| `src/pages/BestsellerRadarPage.tsx` | Passes selected author identity to radar analysis |
| `src/components/AuthorIdentityDialog.tsx` | Passive expand success toast when voice memory exists |
| `src/components/AuthorVoiceMemoryPanel.tsx` | Passive memory note (chapters never affected) |
| `src/components/EditorPanel.tsx` | "Aligned with your author identity" hint when signal present |
| `src/lib/i18n.ts` | Passive UI strings (en/it/es/fr/de) |

**Not touched:** `generation.ts` chapter prompts, Story Bible, editorial diagnostics, export engines, identity lock fingerprint logic.

---

## Architecture: Passive Author Intelligence

### Core module — `passive-intelligence.ts`

```typescript
PASSIVE_INFLUENCE_CAP = 0.15  // documented cap; under-influence when uncertain

resolvePassiveAuthorTone(identity) → {
  hasSignal, warmth, clarity, depth, energy, directive
}
```

**Signal gate:** requires `hasAuthorVoiceMemory()` **and** at least one of presence / goals / message.

**Tone axes** (each resolves to `neutral` unless ≥2 consistent hits):

| Axis | Values | Driven by |
|------|--------|-----------|
| warmth | neutral / warm / cool | emotional, poetic vs professional, premium |
| clarity | neutral / sharp / soft | direct, minimalist vs emotional, spiritual |
| depth | neutral / introspective / light | psychological, dark vs direct, inspirational |
| energy | neutral / inspirational / atmospheric | inspirational goals vs dark, mystery |

**Contradictory signals:** axis stays neutral → directive may be empty → full fallback.

**Directive format:** capped human-readable prompt clause with explicit ≤15% rule, no cliché, no hype.

---

## Personalization Points (by Phase)

### Phase 1 — Bio Expand (P0)

**Entry:** `expandAuthorBioFromIdentity()` → `buildExpandBioPassiveContext()`

**Inputs to edge function:**
- `authorPresence[]`
- `readerEmotionalGoals[]`
- `authorMessage` (intent only, truncated)
- `toneDirective` (≤600 chars)

**Edge prompt rules:**
- Voice memory may nudge cadence by **at most 10–15%**
- Never caricature, never cliché
- Weak/conflicting signals → neutral professional bio
- Seed content preserved; no fake credentials

**Examples (behavioral, not hard-coded):**

| Author signal | Expected bio tone nudge |
|---------------|-------------------------|
| emotional + psychological + premium | slightly deeper, elegant, emotionally intelligent |
| direct + inspirational | clearer, quietly empowering |
| weak / empty voice memory | identical to V1 expand behavior |

---

### Phase 2 — About the Author (P0)

**Entry:** `buildAboutAuthorInjection()` in `injection.ts`

**Changes:**
- Biography body **never rewritten** — only cadence + cliché strip
- `applyAboutAuthorCadence()`: warm/soft → `Pen Name — bio`; cool/sharp → `Pen Name. bio`
- Skips prefix if bio already starts with pen name
- `stripAuthorBrainCliches()` when signal present

**Preserved:** full biography text, no hallucination, no new facts.

---

### Phase 3 — Other Books / Follow (P1)

**Entry:** `buildPassiveOtherBooksHeading()`, `buildPassiveFollowHeading()`

**Micro-copy variants (EN / IT):**

| Tone | Other Books | Follow |
|------|-------------|--------|
| warm | Continue the journey with… / Continua il viaggio con… | Follow …'s journey / Segui il percorso di… |
| inspirational | Explore more from… / Scopri altri libri di… | Stay connected with… / Resta connesso con… |
| sharp / cool | More books by… / Altri libri di… | Follow … / Segui … |
| neutral (fallback) | Other Books by… / Altri libri di… | Follow … / Segui … |

**Scope:** heading line only — book list, links, descriptions unchanged.

---

### Phase 4 — KDP / Market Copy (P1)

**Entry:** `applyPassiveMarketCopyTone()` in `analyzeRadarPublishingIntel()`

**Applied to:**
- `positioningMap.commentary`
- `readerPersona`

**Behavior:** appends **one** soft clause max when tone matches:

| Tone | Nudge |
|------|-------|
| introspective | "Copy may lean slightly introspective… keep claims factual." |
| sharp / cool (non-inspirational) | "Positioning language can stay crisp and premium… avoid hype." |
| inspirational | "Tone may feel quietly empowering — never exaggerated." |

**Not affected:** scores, tiers, trust notes, competitive analysis truthfulness.

**Wiring:** `BestsellerRadarPage` passes `getSelectedAuthorIdentity()` — optional; null identity = neutral.

---

### Phase 5 — Passive UI (P0)

| Location | Copy key | When shown |
|----------|----------|------------|
| Author Identity → expand success | `author_brain_expand_success_passive` | Voice memory has signal |
| Author Voice Memory panel | `author_brain_passive_memory_note` | Always (explains soft scope) |
| EditorPanel author injection hint | `author_brain_passive_aligned` | `hasPassiveAuthorIntelligence(project.config.authorIdentity)` |

**Design:** minimal, elegant, no spam. Never on chapter UI or generation controls.

---

### Phase 6 — Safety Guardrails (Critical)

**Built-in protections:**

1. **Signal threshold** — no voice memory → zero passive behavior
2. **Axis majority rule** — need ≥2 hits per axis; ties → neutral
3. **Cliché strip** — bestselling author, world-class, game-changer, unleash your potential, journey of a lifetime, passionate storyteller
4. **Directive cap** — presence ≤4, goals ≤3, message ≤160 chars in directive
5. **Under-influence default** — uncertain → neutral copy path
6. **Additive only** — no overwrite of user-authored biography facts

**Explicitly prevented:**
- exaggerated tone shifts
- personality stereotypes
- repetitive marketing wording
- forced emotional language
- cringe copy

---

## Influence Boundaries

| Surface | Max influence | Can change facts? | Fallback |
|---------|---------------|-------------------|----------|
| Bio expand | 10–15% cadence | No | Neutral professional bio |
| About the Author | Prefix + cliché strip | No | Raw biography |
| Other Books / Follow headings | Wording only | No | Default headings |
| Radar positioning copy | One trailing clause | No | Original commentary |
| Chapter generation | **0%** | — | Unchanged |
| Editorial diagnostics | **0%** | — | Unchanged |
| Export PDF/EPUB/DOCX | Injection V3 only | No | V3 behavior |
| Identity lock fingerprint | **0%** | — | Voice fields still excluded |

---

## Edge Cases Tested (Logical / Code Review)

| Scenario | Expected behavior |
|----------|-------------------|
| **Minimal profile** (no voice memory) | All passive paths inert; V1–V4 behavior identical |
| **Medium profile** (2–3 presence chips) | Partial axes activate; conservative headings |
| **Full profile** (presence + goals + message) | Full directive; all passive surfaces eligible |
| **Contradictory signals** (warm + cool both ≥2) | Axes stay neutral; no forced tone |
| **Empty biography** | About injection returns ""; no cadence applied |
| **Bio already prefixed with pen name** | No duplicate prefix |
| **Radar without author identity** | Market copy unchanged |
| **Non-EN language** | IT headings for Other Books / Follow; bio expand uses identity language |

---

## Regressions Checked

| System | Verified |
|--------|----------|
| `generation.ts` chapter prompts | No passive imports or prompt changes |
| `analyze-chapter` / editorial diagnostics | Untouched |
| Story Bible | Untouched |
| Export engines (EPUB/PDF/DOCX) | Structure unchanged; injection V3 + passive headings only |
| Market analysis scores / tiers | Untouched; only commentary strings soft-nudged |
| Author Brain V1 seed + expand | Preserved; V5 extends via optional fields |
| Author Brain V2 ecosystem | Preserved |
| Author Brain V3A injection | Preserved; cadence layered on top |
| Author Brain V4 voice memory UI/data | Preserved |
| Author Identity lock | Fingerprint logic unchanged |
| TypeScript compile | ✅ pass |
| Production build | ✅ pass |

---

## Premium Perception Improvements

1. **Bio expand** feels author-specific without rewriting the author's story
2. **About the Author** reads with subtle brand cadence — em dash vs period signals warmth vs professionalism
3. **Back matter headings** stop sounding template-generic for authors with voice memory
4. **Radar commentary** acknowledges author brand without inflating claims
5. **UI whispers** ("Aligned with your author identity") reinforce recognition without AI theatrics
6. **Explicit scope note** in Voice Memory panel builds trust: *soft for bio/sections, never chapters*

---

## Perceived Impact vs Risk

| Dimension | Assessment |
|-----------|------------|
| User perception lift | **High** — "Scriptora knows me" without invasion |
| Core writing risk | **Zero** — generation engine untouched |
| Data integrity risk | **Low** — biography facts preserved |
| Over-personalization risk | **Mitigated** — 15% cap, neutral fallback, cliché strip |
| Maintenance | **Low** — single module, clear exports |

---

## STOP — Awaiting Step 6 Approval

Step 5 is complete. No feature expansion. No strong behavior changes. No generation engine modifications.

**Next step (not started):** await explicit approval before Author Brain Step 6.
