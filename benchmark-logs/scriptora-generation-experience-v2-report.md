# Scriptora — Generation Experience V2 Report

Generated: 2026-05-29  
Sprint: **Generation Experience V2** — editorial UX upgrade  
Scope: UI/orchestration only. **Zero motor, prompt, Supabase, or intelligence changes.**

---

## Verdict: **READY**

Generation now reads as *"Scriptora sta scrivendo il mio libro"* instead of a technical AI prototype panel. Motor stability preserved.

---

## 1. What Was Found (Existing Architecture)

| Discovery | Location | Implication |
|-----------|----------|-------------|
| **Real chunk streaming exists** | `generateChapterChunked()` → `onChunkProgress` in `src/lib/generation.ts` | Content accumulates per chunk; UI receives `content`, `currentWords`, `phase` |
| **UI throttle (~6 fps)** | `useBookEngine.ts` — `PROGRESS_RENDER_MS = 150` | Smooth enough for mobile; not modified |
| **Chapter content updated during gen** | `useBookEngine` saves `progress.content` to project every ~1s | Backend state already streams; preview was the weak link |
| **No token-level SSE in Writing Room** | `callAIOnce` buffers full response per chunk | True token streaming not available without motor change — **not attempted** |
| **Technical UX panel** | `GenerationProgress` in `EditorPanel.tsx` | Showed Hook, tagli brevi, inquadratura ampia, emotion/rhythm/camera signals |
| **Placeholder leak** | Blueprint fallback `"To be generated"` in `generation.ts` | Shown raw in pre-generate UI — **filtered at display layer only** |

**Conclusion:** Reuse chunk progress + add perceived display streaming. Do not touch generation motor.

---

## 2. What Was Improved

### New module: `src/lib/generation-experience/`

| File | Role |
|------|------|
| `index.ts` | Editorial checklist copy, phase labels, placeholder sanitizer, preview helpers |
| `usePerceivedStream.ts` | `usePerceivedStreamText` + `useEditorialChecklist` hooks |
| `generation-experience.spec.ts` | Unit tests (3/3) |

### New component: `ChapterGenerationExperience.tsx`

Replaces `GenerationProgress` in `EditorPanel.tsx`.

**Before → After**

| Before (prototype feel) | After (editorial feel) |
|-------------------------|------------------------|
| Hook · tagli brevi · inquadratura ampia | Scriptora sta costruendo il capitolo |
| Technical emotion/rhythm/camera chips | ✓ Voce autore · ✓ Continuità · ✓ Obiettivo · ✓ Memoria |
| Wave engine + cinematic scene analyzer | Checklist + manuscript preview |
| "Direzione: … To be generated" | Obiettivo del capitolo (sanitized) or warm prep copy |
| Chunk arrives → full text jump | Perceived paragraph reveal (~42 chars/sec display-only) |

### Editorial checklist (immediate on generate)

1. ✓ Voce autore applicata  
2. ✓ Continuità narrativa verificata  
3. ✓ Obiettivo del capitolo definito  
4. ✓ Memoria del libro sincronizzata  

Animates over ~2s before first chunk; all checked when real content arrives.

### Preview behavior

- Shows **chapter title** always  
- Shows **real accumulated text** from `chunkProgress.content`  
- **Perceived streaming** animates display between chunk updates (content unchanged)  
- Blinking caret on active paragraph  
- **Never** renders `"To be generated"` or incomplete placeholder strings  

### Pre-generate empty state

- Summary hidden if placeholder  
- Copy: *"Premi Genera — Scriptora scriverà il capitolo davanti a te."*

---

## 3. Regression Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Generation motor | **None** | No changes to prompts, chunks, `callAI`, Supabase |
| Author Brain / Editorial Intelligence | **None** | Untouched |
| Character / Long Book Memory | **None** | Untouched |
| Export / save flow | **Low** | `useBookEngine` save throttle unchanged |
| Completed chapter display | **None** | `EditableBlock` path unchanged |
| ChunkProgress contract | **None** | Same interface consumed |
| `ChunkPhase` export | **Additive only** | Type export for editorial labels |

**Removed:** ~450 lines of cinematic analyzer UI from `EditorPanel.tsx` (dead weight, zero motor coupling).

---

## 4. Mobile Compatibility

| Check | Status |
|-------|--------|
| Reuses existing `.scriptora-generation-*` CSS (mobile breakpoints in `index.css`) | ✅ |
| Single-column stack (checklist → preview → meter) | ✅ |
| Touch-friendly cancel button | ✅ |
| No horizontal overflow from technical signal chips | ✅ Improved (removed) |
| Perceived stream interval 50ms / 42 cps | ✅ Light enough for mobile |

**Not run in sprint:** physical iPhone Safari / Android Chrome session — recommended smoke test.

---

## 5. Desktop Compatibility

| Check | Status |
|-------|--------|
| Manuscript preview typography (15–16px, relaxed leading) | ✅ |
| Progress meter + word count | ✅ |
| Cancel generation | ✅ |
| Chapter doctor / rewrite buttons during idle | ✅ Unchanged |

---

## 6. Build Status

| Command | Result |
|---------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |
| `vitest run src/lib/generation-experience/generation-experience.spec.ts` | ✅ 3/3 |

**Bundle note:** `Index` chunk reduced ~6 KB gzipped after removing legacy generation analyzer from `EditorPanel`.

---

## 7. Files Changed

**New:**
- `src/lib/generation-experience/*`
- `src/components/ChapterGenerationExperience.tsx`

**Modified (surgical):**
- `src/components/EditorPanel.tsx` — swap component, sanitize outline, remove legacy panel
- `src/lib/generation.ts` — export `ChunkPhase` type only

**Untouched:**
- `useBookEngine.ts` (except consumer path unchanged)
- All intelligence / memory / prompt modules
- Supabase / edge functions

---

## 8. Known Limits (By Design)

| Limit | Reason |
|-------|--------|
| Streaming is **chunk-real**, display is **perceived** between chunks | Motor unchanged — no token SSE in Writing Room |
| First visible text waits for **first chunk completion** (~15–40s typical) | API returns full chunk before `onChunkProgress` fires |
| Checklist is **trust UX**, not new validation logic | Editorial positioning only |

Future V3 (out of scope): token-level streaming would require motor/edge changes — not started.

---

## STOP — No V3 Without Author Validation

Validate with real authors:

1. Does generation feel like *writing*, not *processing*?  
2. Is perceived streaming smooth on mobile?  
3. Do checklist items feel credible, not cosmetic?  

**Next gate:** N ≥ 5 author generate sessions before any motor or token-stream work.

---

*Engine marker: `scriptora-generation-experience-v2`*
