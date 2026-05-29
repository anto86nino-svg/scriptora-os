# Scriptora — Author Brain V3 Report

Generated: 2026-05-29  
Sprint: **Author Brain Step 3A** — Elegant auto-injection (Lite Premium)  
Scope: Front/back matter only. No aggressive automation. STOP after this step.

---

## Goal

When Author Identity has ecosystem data, Scriptora **prepares** (not hijacks):

1. **About the Author** — from `biography` only
2. **Other Books by the Author** — from `publishedBooks[]`
3. **Follow the Author** — from `authorPlatform` (only if links exist)

Must feel: *"Scriptora already understands my author brand."*

---

## Readiness: **Step 3A complete**

| Criterion | Status |
|-----------|--------|
| About the Author soft prefill | ✅ |
| Other Books injection (≥1 book) | ✅ |
| Follow the Author (links only) | ✅ |
| No hallucination / no fake bio | ✅ |
| Always editable + regenerable | ✅ |
| Soft fill only (no overwrite) | ✅ |
| Export support (EPUB/PDF/DOCX) | ✅ |
| V1 + V2 preserved | ✅ |
| typecheck + build | ✅ |

---

## Injection Locations (ONLY these)

| Location | Fields | Mode |
|----------|--------|------|
| **Front matter** → `aboutAuthor` | Biography | Soft on generate/normalize; explicit regenerate button |
| **Back matter** → `otherBooks` | Published catalogue | Soft when empty |
| **Back matter** → `followAuthor` | Platform links | Soft when empty + only if links exist |
| **Export** EPUB / PDF / DOCX | Same fields | Renders if non-empty |

**NOT injected:**
- Chapter body / generation prompts (beyond existing identity lock)
- Manuscript Analyzer, Radar, KDP tools, diagnostics
- `callToAction`, `reviewRequest`, `conclusion`, `authorNote` (unless user edits manually)

---

## Files Touched

| File | Change |
|------|--------|
| `src/lib/author-brain/injection.ts` | **New** — build + apply injection (soft/regenerate) |
| `src/lib/author-brain/index.ts` | Export injection API |
| `src/types/book.ts` | Optional `followAuthor` on `BackMatter` |
| `src/lib/generation.ts` | `normalizeFrontMatter` / `normalizeBackMatter` soft injection |
| `src/lib/export-cleanup.ts` | `followAuthor` export label + merge keys |
| `src/lib/epub.ts` | Follow section + clickable URLs in EPUB |
| `src/lib/pdf-export.ts` | Follow section |
| `src/lib/docx-export.ts` | Follow section |
| `src/hooks/useBookEngine.ts` | `applyAuthorBrainFrontMatter` / `applyAuthorBrainBackMatter` |
| `src/components/EditorPanel.tsx` | Premium hint + prepare buttons + field labels |
| `src/pages/Index.tsx` | Wire apply callbacks |
| `src/lib/i18n.ts` | Author Brain injection copy |

---

## Behavior Rules

### Soft injection (`mode: "soft"`)
- Runs inside `normalizeFrontMatter` / `normalizeBackMatter` after AI generation
- **Only fills empty fields** — never overwrites user or AI content
- No biography → no About the Author prefill
- No published books → no Other Books block
- No platform links → no Follow block (field omitted entirely)

### Explicit regenerate (`mode: "regenerate"`)
- User clicks **Prepare About the Author** or **Prepare author sections**
- Overwrites **only** Author Brain fields (aboutAuthor / otherBooks / followAuthor)
- Does not touch conclusion, CTA, review, author note

### Formatting
- **About the Author:** `{penName}. {biography}` (skips duplicate pen name prefix)
- **Other Books:** heading + bullet list; genre in parentheses; description indented; links Amazon → Kobo → Goodreads → Apple → Website
- **Follow:** heading + one line per platform (only populated links)
- **Current book excluded** from catalogue via normalized title match

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Empty author / no biography | No About injection; button hidden |
| Partial ecosystem (bio only) | Only About prefills |
| Full ecosystem | All three sections when data exists |
| Current title matches catalogue entry | Excluded from Other Books |
| User clears injected field manually | Stays empty until regenerate |
| Author switch on project | Matter content unchanged (project-scoped edits preserved) |
| AI generates otherBooks placeholder | Preserved — soft inject skips non-empty |
| Regenerate with no platform links | followAuthor not created |

---

## Author Switching Validation

| Scenario | Result |
|----------|--------|
| Switch global author in vault | Existing project front/back matter **unchanged** ✅ |
| New project + generate front matter | Uses **embedded** `config.authorIdentity` at generation time ✅ |
| Prepare from Author Brain button | Uses current project `config.authorIdentity` ✅ |

---

## Regressions Checked

| Area | Result |
|------|--------|
| Export EPUB/PDF/DOCX | ✅ Builds; followAuthor optional section |
| Front matter generation | ✅ AI first, then soft Author Brain fill for gaps |
| Back matter generation | ✅ Same |
| `biography` field contract | ✅ Unchanged |
| Author Identity V1 expand | ✅ Unchanged |
| Author Ecosystem V2 UI | ✅ Unchanged |
| Generation identity lock block | ✅ Not modified |
| Empty followAuthor in exports | ✅ Skipped (no empty section) |

---

## Premium UX

- Subtle fuchsia hint in Front/Back Matter editor:
  - *"Scriptora can prepare author sections from your Author Brain profile."*
  - *"Using your Author Brain profile."*
- **Prepare** buttons with wand icon — explicit user control
- Human-readable field labels (About the Author, Other Books, Follow the Author)
- Toast on successful prepare: *"edit freely"*

---

## Build Verification

```bash
npm run typecheck   # ✅ pass
npm run build       # ✅ pass
```

---

## STOP

Step 3A complete. **Do not proceed** to Step 4 (broader automation, KDP sync, CTA intelligence) until explicit approval.

---

## One-Line Summary

Author Brain V3A activates elegant, opt-in author section injection — About, Other Books, Follow — only in front/back matter and exports, soft-fill by default, always editable, zero spam.
