# Scriptora — Author Brain V2 Report

Generated: 2026-05-29  
Sprint: **Author Ecosystem Lite** — Step 2 only  
Scope: Data collection. No automation. STOP after this step.

---

## Goal

Extend Author Identity with structured author memory:

- **Published Books** — catalogue with optional platform links
- **Author Platform** — social / web presence fields

**NOT implemented (by design):**
- Auto-injection into export / front matter / back matter
- CTA generation
- KDP sync
- External API sync

---

## Readiness: **Step 2 complete**

| Criterion | Status |
|-----------|--------|
| Published Books section | ✅ |
| Author Platform section | ✅ |
| Existing Author Brain V1 untouched | ✅ |
| `biography` contract unchanged | ✅ |
| localStorage persistence only | ✅ |
| Zero breaking changes | ✅ |
| typecheck + build | ✅ |

---

## Files Touched

| File | Change |
|------|--------|
| `src/types/book.ts` | `AuthorPublishedBook`, `AuthorPublishedBookLinks`, `AuthorPlatform` + fields on `AuthorIdentity` |
| `src/lib/author-brain/ecosystem.ts` | **New** — normalize, blank book factory, future snapshot helper |
| `src/lib/author-brain/types.ts` | Updated future stub (Step 3+ automation reserved) |
| `src/lib/author-brain/index.ts` | Export ecosystem helpers |
| `src/lib/author-identity.ts` | Persist + normalize `publishedBooks`, `authorPlatform` |
| `src/components/AuthorEcosystemPanel.tsx` | **New** — Published Books + Author Platform UI |
| `src/components/AuthorIdentityDialog.tsx` | Wire panel below About the Author |
| `src/lib/i18n.ts` | Ecosystem strings (en/it/es/fr/de) |

---

## Data Structure

Stored on existing `AuthorIdentity` in `scriptora-author-identities-v1`:

```typescript
publishedBooks?: {
  id: string;
  title: string;
  genre: string;
  description?: string;
  links?: {
    amazon?: string;
    kobo?: string;
    goodreads?: string;
    appleBooks?: string;
    website?: string;
  };
}[];

authorPlatform?: {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
  newsletter?: string;
  amazonAuthorPage?: string;
  goodreadsProfile?: string;
};
```

**Caps:** max 24 published books (normalize on save).  
**Empty books:** stripped on save (no title, genre, description, or links).

---

## Persistence Validation

| Scenario | Result |
|----------|--------|
| Save identity with books + platform | ✅ Serialized to localStorage |
| Switch author | ✅ Each identity loads its own ecosystem |
| Refresh | ✅ Persists |
| Old identities without V2 fields | ✅ Default `[]` / `{}` via normalize |
| Author Brain V1 seed + biography | ✅ Unchanged |
| Built-in presets | ✅ Unaffected (optional fields absent) |
| Generation / export / front matter | ✅ **Not wired** — no behavior change |

---

## UI Validation

**Placement:** Below "About the Author", above Voice DNA / archetype.

**Published Books:**
- Premium card layout per book
- Title + genre row
- Optional description (2 rows)
- Optional links grid (Amazon, Kobo, Goodreads, Apple Books, custom URL)
- Add Book / Remove Book
- Empty state with dashed border + copy

**Author Platform:**
- 7 optional fields in 2-column desktop grid
- No URL validation (per spec)
- Sky gradient section — distinct from Author Brain fuchsia

**Feel:** "Build your author universe" — not a bureaucratic form.

---

## Future Readiness (Step 3+ — NOT active)

| Data | Future use |
|------|------------|
| `publishedBooks` | "Other books by the author" back matter block |
| `authorPlatform` | "Follow the author" CTA block |
| `biography` | Auto About the Author (V1 already in place) |

Helper reserved: `authorEcosystemMemorySnapshot()` in `ecosystem.ts` — for future injection layer without touching V2 UI.

---

## Regressions Checked

| Area | Result |
|------|--------|
| Author Identity save/load | ✅ |
| Author switching | ✅ |
| AI bio expand (V1) | ✅ Unchanged |
| `buildAuthorIdentityBlock` (generation) | ✅ Still uses biography only |
| Export pipelines | ✅ No changes |
| Fingerprint / identity lock | ✅ Ecosystem excluded from fingerprint (voice-only) |
| NewBookDialog author apply | ✅ Full identity object spreads |

---

## Build Verification

```bash
npm run typecheck   # ✅ pass
npm run build       # ✅ pass
```

---

## STOP

Step 2 complete. **Do not proceed** to auto-injection, CTA generation, or export changes until explicit approval for Step 3.

---

## One-Line Summary

Author Brain V2 adds Author Ecosystem Lite — published catalogue + platform links — as structured memory inside Author Identity, with premium UI and zero automation or export changes.
