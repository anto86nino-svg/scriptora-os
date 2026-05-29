# Scriptora — Reading Session Pro V1 Report

Generated: 2026-05-29  
Sprint: **Reading Session Pro V1** — professional manuscript listening  
Scope: Orchestration only. Reuse Voice Studio TTS, playback, voice persistence, chapter reader. **STOP after V1 — validate with authors first.**

---

## Verdict: **V1 COMPLETE — READY FOR AUTHOR VALIDATION**

Voice Studio is now positioned as **Reading Session Pro**: editorial listening for manuscript revision — not an audiobook player.

---

## Product Principle

| Scriptora is NOT | Scriptora IS |
|------------------|--------------|
| AI audiobook maker | Professional listening mode for revision |
| Audio player UX | Editorial workflow — hear what reading misses |
| New TTS architecture | Orchestration on existing Voice Studio foundations |

**Target author reaction:** *"I heard problems I didn't see while reading."*

---

## Non-Negotiable Rules — Compliance

| Rule | Status |
|------|--------|
| Zero destructive refactor | ✅ Additive orchestration layer only |
| Zero TTS rewrite | ✅ `speechSynthesis`, chunks, karaoke unchanged |
| Zero playback engine replacement | ✅ `handlePlayPause`, pause/resume, mobile karaoke fallback preserved |
| Preserve Voice Studio | ✅ Same dialog entry points (Dashboard, Writing Room) |
| Preserve mobile compatibility | ✅ Background pause + session persist on `visibilitychange` |
| Additive only | ✅ New module + UI overlays; no generation engine touch |
| `npm run typecheck` | ✅ Pass |
| `npm run build` | ✅ Pass |

---

## Architecture — Orchestration Layer

**New module:** `src/lib/reading-session/`

| File | Role |
|------|------|
| `types.ts` | Session modes, flow modes, note types, snapshots |
| `constants.ts` | Note labels, storage keys, premium copy maps |
| `paragraph-map.ts` | Sentence → paragraph index for author notes |
| `storage.ts` | localStorage: session snapshot + listening notes (cap 500) |
| `useReadingSessionOrchestration.ts` | React hook — modes, flow, notes, presets, resume |
| `index.ts` | Public exports |

**New components:**

| Component | Role |
|-----------|------|
| `ReadingSessionQuickNotes.tsx` | One-tap listening notes (no playback interrupt) |
| `ReadingSessionInsights.tsx` | Post-session review grouped by chapter |

**Integration surface:** `VoiceStudioDialog.tsx` — rebranded UI + hook wiring. TTS/playback internals untouched.

---

## Phase 1 — Reading Session Mode (P0) ✅

Three orchestration modes via session mode selector:

| Mode | Behavior |
|------|----------|
| **Reader Mode** | Clean listening — no quick-note chrome |
| **Editor Mode** | Listening + one-tap quick notes during playback |
| **Immersion Mode** | Fullscreen minimal — hides project/flow chrome; exit control preserved |

Immersive layout reuses existing `immersiveMode` + karaoke reader — no new reader component.

---

## Phase 2 — Auto Chapter Flow (P0) ✅

**Chapter flow selector:**

| Flow | Behavior on chapter end |
|------|-------------------------|
| Single chapter | Stop → show Session Insights |
| Chapter queue | Auto-advance to next playable chapter |
| Continue book | Same auto-advance through manuscript |

**Preserved across transitions:** selected voice, speed, style (tone), session snapshot.

**Implementation:** `handleChapterPlaybackComplete()` → `setChapterIndex(next)` → deferred `handlePlayPause()` via `autoContinuePlay` flag. Chapter-change stop effect skips when playback already ended for auto-continue.

---

## Phase 3 — Quick Listening Notes (P0) ✅

Six one-tap author observations (Editor Mode only):

| Type | Label |
|------|-------|
| ⚠ | Dialogue feels artificial |
| ⚠ | Emotion over-explained |
| ⚠ | Pacing slow |
| ⚠ | This sounds repetitive |
| ★ | Strong moment |
| ★ | Emotional impact |

**Saved per note:** timestamp, paragraph index, chapter, sentence index, excerpt, session ID, note type.

**Behavior:** Append to localStorage — playback continues uninterrupted. Flash confirmation only.

---

## Phase 4 — Reading Review Panel (P0) ✅

**Reading Session Insights** overlay after session end or via "Session insights" button.

- Grouped by chapter
- Author observations only — **no AI analysis**
- Optional **Open in Editor** → navigates to `chapter-{n}` in Writing Room

Wired in:
- `Index.tsx` — `setActiveSection(\`chapter-${idx}\`)`
- `Dashboard.tsx` — `goApp({ projectId, section })`

---

## Phase 5 — Session Memory (P1) ✅

**localStorage key:** `scriptora-reading-session-v1`

**Persisted:** project, chapter, sentence index, progress, voice, speed, style, mode, flow, session ID.

**Resume banner:** *"Continue listening from Chapter N?"* — restores voice/speed/mode settings on accept.

Persist triggers: progress updates, visibility hidden, session end.

---

## Phase 6 — Premium Experience (P1) ✅

**Session presets:**

| Preset | Behavior |
|--------|----------|
| 15 min session | Timer → insights panel |
| 30 min session | Timer → insights panel |
| Full chapter | Single-chapter flow + start listening |
| Continue book | Continue-book flow + start listening |

**Copy pass (examples):**

| Before | After |
|--------|-------|
| Play Narration | Start listening |
| Pause Narration | Pause listening |
| Full chapter complete | Reading session complete — review your listening notes |
| Human reading… | Reading session in progress… |
| Immersive Player | Manuscript listening |

Dialog title: **Reading Session Pro** — subtitle emphasizes revision listening.

---

## Phase 7 — Mobile Reliability (CRITICAL) ✅

| Scenario | Handling |
|----------|----------|
| Background / tab hidden | Auto-pause speech; persist session snapshot |
| Return to tab | Resume via existing pause/resume (no silent state loss) |
| Chapter transitions | Auto-continue deferred 450ms after chapter index update |
| Voice persistence | Unchanged manual/auto voice selection + snapshot restore |
| Karaoke on mobile | Existing manual fallback timer preserved |

**Note:** Physical device QA (iPhone Safari, Android Chrome) recommended before wide release — logic is implemented; human device pass not run in this sprint.

---

## Regressions Checked

| Area | Result |
|------|--------|
| Voice Studio TTS pipeline | Unchanged |
| Pause / resume (real, not cancel) | Unchanged |
| Test Voice button | Preserved (hidden in immersion minimal UI) |
| Project/chapter/voice/speed selectors | Preserved (hidden in immersion minimal UI) |
| Karaoke scroll + detach | Unchanged |
| Open In Writing Room | Unchanged |
| Chapter generation engine | Not touched |
| Surgical Edit Engine V1 | Not touched |
| Author Brain V6 (frozen) | Not touched |

---

## Tests

```
npx vitest run src/lib/reading-session/reading-session.spec.ts
✓ maps sentences to paragraph indices
✓ groups notes by chapter
2/2 passed
```

---

## Files Changed (Summary)

**New:**
- `src/lib/reading-session/*`
- `src/components/ReadingSessionQuickNotes.tsx`
- `src/components/ReadingSessionInsights.tsx`

**Modified (surgical):**
- `src/components/VoiceStudioDialog.tsx` — orchestration + premium UX
- `src/pages/Index.tsx` — `onOpenChapterInEditor`
- `src/pages/Dashboard.tsx` — `onOpenChapterInEditor`

---

## Success Criteria — Sprint Assessment

| Criterion | V1 Status |
|-----------|-----------|
| Feel like editorial workflow, not audio player | ✅ Copy + modes + insights panel |
| Hear issues missed on the page | ✅ Quick notes + chapter-grouped review |
| Experience book like a reader | ✅ Immersion + continue-book flow |
| Professional / premium feel | ✅ Session presets + revision language |
| Reuse existing foundations | ✅ Zero TTS/playback rewrite |

---

## STOP — No V2

Reading Session Pro V1 is **feature-complete for author validation**.

**Do not proceed to V2** until real authors confirm:
1. Quick notes feel effortless during listening
2. Insights panel drives revision (Open in Editor used)
3. Auto chapter flow feels natural on mobile
4. Resume banner feels seamless, not intrusive

**Next gate:** Human author listening sessions (N ≥ 5 recommended).

---

*Engine marker: `scriptora-reading-session-pro-v1`*
