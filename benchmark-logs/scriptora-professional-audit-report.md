# Scriptora Professional Audit Report

Generated: 2026-05-29  
Scope: PRO Audit & Polish Sprint — validation and safe fixes only (no architecture changes, no Supabase/Auth/core flow changes)

---

## Executive Summary

| Area | Score | Status |
|------|-------|--------|
| 1. Export Studio | **7.5/10** | Fixed critical EPUB validation bug; PDF/DOCX polish applied |
| 2. Manuscript Analyzer | **7/10** | Solid core; PDF/EPUB ingest not implemented (by design) |
| 3. Diagnostica Editoriale | **8.5/10** | Strong architecture; Dominate + error states fixed |
| 4. Voice Studio | **8/10** | Best-in-class Web Speech; manual voice bug fixed |
| 5. Cover Studio | **7.5/10** | Professional canvas; front/back tagline bug fixed |
| 6. Bestseller Radar | **6.5/10** | React state bugs fixed; still MVP data layer |
| 7. KDP Intelligence | **7/10** | Rich wizard; fragmented fallbacks remain |
| 8. Author Identity | **8/10** | Strong lock system; TopBar bypass remains |
| 9. Autopilot Bestseller | **6/10** | UI/copy mismatch with actual Writer OS flow |
| 10. Dashboard | **8/10** | Premium polish; delete bug fixed |

**Overall product readiness for professional authors: 7.4/10** — usable end-to-end with clear moats (Chapter Doctor, memory, identity). Gaps are mostly export edge cases, market-tool fragmentation, and Auto Bestseller messaging.

---

## 1. Export Studio

**Score: 7.5/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| EPUB validation ran on raw project → blocked Manuscript imports (null front/back matter) | **Critical** | ✅ Fixed |
| PDF reset `pageNum = 1` at chapter 1 → wrong footer numbering | **High** | ✅ Fixed |
| DOCX hardcoded `Capitolo N` regardless of language | **Medium** | ✅ Fixed |
| EPUB XHTML `xml:lang="en"` for all languages | **Medium** | ✅ Fixed |
| Default author fallback `"Antonino Campanella"` in exports | **Medium** | ✅ Fixed → `Unknown Author` |
| Cover MIME always JPEG regardless of PNG source | Low | Recommended |
| PDF no Unicode font embedding (CJK/emoji) | Low | Recommended |
| Export Studio Italian-only toasts | Low | Recommended |
| Silent export failures in Index/BookPreview | Medium | Recommended |
| Missing `dc:creator` richness in OPF | Low | Recommended |

### Improvements applied

- `validateEpubStructure()` now validates **normalized** project (same pipeline as `generateEpub`)
- Removed incorrect PDF page number reset at first chapter
- DOCX chapter labels use `exportLabel("chapter", language)`
- EPUB content files use correct `langCode`
- Generic author fallback instead of personal name

### Recommended (not applied — higher scope)

- Cover MIME detection from data-URL
- Shared export error toasts across Index/BookPreview/PublishPanel
- i18n for Export Studio strings
- Progress UI for 50+ chapter exports
- Unicode font embedding for PDF (requires font files)

### Regression risk

**Low** — fixes align validation with existing generation path.

---

## 2. Manuscript Analyzer

**Score: 7/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| Debug `console.log` in production analysis | Low | ✅ Fixed |
| No file size limit | **Medium** | ✅ Fixed (12 MB cap) |
| Manual analyze had no loading state | Medium | ✅ Fixed (`analyzing` spinner) |
| PDF/EPUB upload not supported | Info | Documented — not in scope |
| DOCX parser minimal (w:t only) | Medium | Recommended (mammoth) |
| Sync analysis freezes UI on long books | Medium | Recommended (chunked idle callback) |
| Import → EPUB blocked (via Export bug) | **High** | ✅ Fixed upstream |

### Improvements applied

- Removed debug logging
- 12 MB file size guard with i18n error
- Analyzing state on manual "Analyze" click

### Recommended

- Chunked analysis for 50+ chapters
- Richer DOCX extraction or explicit "simple DOCX only" disclaimer
- Pre-export hint when creating project from manuscript

### Regression risk

**Low**

---

## 3. Diagnostica Editoriale (Chapter Doctor)

**Score: 8.5/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| `runDominate` / `applyDominate` / `discardDominate` missing → ReferenceError | **Critical** | ✅ Fixed |
| Patch/Dominate error jobs showed idle UI | **High** | ✅ Fixed (error banner + retry) |
| `fixParagraph` used stale `chapter.content` as context | Medium | ✅ Fixed |
| Free tier could call `fix-section` without guard | Medium | ✅ Fixed |
| Sequential `fixAll` index drift after edits | Medium | Recommended |
| Auto-open comparison modal can feel abrupt | Low | Recommended |
| Mixed IT/EN copy | Low | Recommended |

### What's already excellent (unchanged)

- Layered local intel: Bestseller, Reader Emotion, Scene Purpose
- Surgical patch pipeline (15% cap, batched edge function)
- `FixChapterComparisonModal` with word-level diff
- `computeDevelopmentalEditReport` calibrated scoring
- Background jobs via `DominationContext`

### Regression risk

**Low** — restored handlers from known-good backup pattern.

---

## 4. Voice Studio

**Score: 8/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| Manual voice ignored during main Play (used `chooseBestVoice`) | **High** | ✅ Fixed |
| Pause/resume unreliable on iOS Safari | Medium | Known platform limit |
| Settings change during playback doesn't stop audio | Medium | Recommended |
| `characterProfiles` built but unused | Low | Future feature |
| Dashboard opens without chapter context | Low | Recommended |

### Improvements applied

- Main playback uses `chooseManualOrBestVoice` (same as Test Voice)

### What's already excellent

- Chunking (~820 chars) for long chapters
- Mobile karaoke timer fallback
- Session isolation via `playbackSessionRef`
- Narration preprocessing (markdown strip, breath pauses)
- Immersive mobile layout with `dvh`

### Regression risk

**Low**

---

## 5. Cover Studio

**Score: 7.5/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| `backTagline` ("Headline retro") rendered on **front** cover | **High** | ✅ Fixed |
| Template switch didn't reset text colors | Medium | ✅ Fixed |
| "AI Enhancement" label misleading (procedural art) | Medium | Recommended |
| Dashboard path download-only, no project attach | Medium | Recommended |
| Print wrap hard to inspect on mobile | Low | Recommended |

### Improvements applied

- Removed back tagline from front cover draw
- `selectTemplate()` syncs title/subtitle/author colors

### What's already excellent

- KDP/Lulu full-wrap with spine math
- 10 mood templates + procedural Scriptora backgrounds
- Responsive desktop/mobile layout
- Export gate integration

### Regression risk

**Low**

---

## 6. Bestseller Radar

**Score: 6.5/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| `useMemo` missing `searched`/`liveResults` deps → stale/wrong data | **High** | ✅ Fixed |
| `marketScore` NaN on empty results | Medium | ✅ Fixed |
| Stale `liveSummary` after error | Medium | ✅ Fixed |
| Sample data shown without "demo" label | Medium | ✅ Fixed |
| Repetitive AI insights | Medium | Recommended (prompt tuning) |
| No CTA to KDP Launch | Low | Recommended |

### Improvements applied

- Correct React dependencies
- NaN guard → `"—"`
- Clear demo vs live badges
- Clear summary on new search/error

### Regression risk

**Low**

---

## 7. KDP Intelligence

**Score: 7/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| Three title tools share identical self-help fallbacks | Medium | Recommended |
| Fallbacks ignore genre (romance → self-help titles) | Medium | Recommended |
| `analyzeMarket` no client fallback | Medium | Recommended |
| KdpTitleDomination duplicates wizard step 3 | Low | Recommended |
| Packaging fields read-only (no copy buttons) | Low | Recommended |
| Niche import skips Title Intelligence | Low | Recommended |

### What's already excellent

- KdpLaunchPage wizard flow (idea → market → titles → packaging)
- Grounding badges (live vs base AI)
- TitleIntelligenceDialog feature depth
- Plan gating layered correctly

### Regression risk

N/A — no code changes (already functional; consolidation is product work).

---

## 8. Author Identity

**Score: 8/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| TopBar identity switch can bypass `authorIdentityLock` | **High** | Recommended |
| Saving built-in preset forks duplicate custom identity | Medium | Recommended |
| localStorage only — no cloud sync | Info | By design |
| Hardcoded Italian in dialog | Low | Recommended |

### What's already excellent

- Identity lock + fingerprint v2
- Applied in generation prompts, new book, auto-bestseller conversion
- Dashboard global selector + vault
- Boot validation repairs orphaned IDs

### Regression risk

N/A for recommended fixes — lock bypass needs careful UX design.

---

## 9. Autopilot Bestseller

**Score: 6/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| Page redirects to Writer OS — never calls SSE `engine.start()` | **High** | Product decision needed |
| UI promises "Generate Bestseller" but configures brief only | **High** | Recommended copy fix |
| `createRunRow()` broken (select without insert) | **High** | Recommended if SSE restored |
| Genre/language clamping drops InputPanel options | Medium | Recommended |
| Word targets differ: client 50k vs edge 30k | Medium | Recommended alignment |
| Recent Runs panel mostly stale | Low | Recommended hide until restored |

### What's already excellent (SSE engine still in codebase)

- Rich edge orchestrator with chapter distribution
- `useAutoBestseller` hook with reconnect/stale detection
- `auto-bestseller-to-project.ts` applies identity + intelligence

### Recommended path

**Option A (minimal):** Rename UI to "Configure & open writing room"; hide dead SSE UI.  
**Option B:** Restore `engine.start()` + fix `createRunRow`.

### Regression risk

**High** if restoring SSE without fixing DB insert — requires dedicated sprint.

---

## 10. Dashboard

**Score: 8/10**

### Problems found

| Issue | Severity | Status |
|-------|----------|--------|
| `setLastProjectId` not imported → crash on delete last project | **Critical** | ✅ Fixed |
| Duplicate Settings cards | Low | Recommended |
| `activeRun` stale from sessionStorage | Low | Recommended |
| Nested `<button>` in drafts modal | Medium | Recommended |
| No projects loading skeleton | Low | Recommended |

### What's already excellent

- Glass/atmosphere visual system
- Lazy-loaded heavy dialogs
- LaunchBookModal one-click flows
- Intelligent preload hook
- Responsive launchpad grid

### Regression risk

**Low** for import fix.

---

## Fixes Applied This Sprint

| File | Change |
|------|--------|
| `src/lib/epub.ts` | Normalized validation, langCode in XHTML, author fallback |
| `src/lib/pdf-export.ts` | Removed wrong page reset |
| `src/lib/docx-export.ts` | Localized chapter labels |
| `src/lib/export-cleanup.ts` | Generic author fallback |
| `src/components/ChapterIntelligencePanel.tsx` | Dominate handlers, error UI, fixParagraph guard/context |
| `src/components/VoiceStudioDialog.tsx` | Manual voice on Play |
| `src/components/CoverGenerator.tsx` | Front tagline fix, template color sync |
| `src/pages/BestsellerRadarPage.tsx` | useMemo, NaN, demo/live badges |
| `src/components/ManuscriptAnalyzerDialog.tsx` | Debug log, file limit, analyzing state |
| `src/pages/Dashboard.tsx` | `setLastProjectId` import |
| `src/lib/i18n.ts` | `manuscript_file_too_large` |

**Verification:** `npm run typecheck` ✅ · `npm run build` ✅

---

## Priority Backlog (Recommended Next Sprint)

| P | Item | Area |
|---|------|------|
| P0 | Auto Bestseller: align UI copy with actual flow OR restore SSE | Autopilot |
| P1 | TopBar author switch respects identity lock | Author Identity |
| P1 | Unified genre-aware KDP/title fallbacks | KDP Intelligence |
| P1 | Export error toasts in Index/BookPreview | Export |
| P2 | Chunked manuscript analysis | Manuscript |
| P2 | iOS Voice Studio: chunk-based resume vs pause | Voice Studio |
| P2 | KdpLaunch packaging copy buttons | KDP |
| P3 | Export Studio i18n | Export |

---

## Verdict

**Scriptora is already a credible professional writing OS** for authors who work inside the Writer Room + Chapter Doctor loop. The strongest premium surfaces are **Diagnostica Editoriale**, **Author Identity**, and **Dashboard**.

The largest trust gaps for a pro author comparing to external tools:

1. **Export Studio** — now unblocked for manuscript imports; still needs Unicode PDF and richer KDP metadata
2. **Market OS fragmentation** — Radar, KDP Launch, Title Intelligence feel like separate MVPs
3. **Auto Bestseller messaging** — promises autopilot, delivers configured handoff to Writer OS

None of these require architectural rewrites. The fixes applied this sprint are surgical and regression-safe.

---

*Mindset: improve only what brings real author value. Areas scored 8+ were left structurally unchanged.*
