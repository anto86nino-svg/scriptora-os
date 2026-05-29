# Scriptora — Author Brain V1 Report

Generated: 2026-05-29  
Sprint: **Author Brain Step 1** — Foundation only  
Scope: Additive. No architecture rewrite. STOP after this step.

---

## Goal

Create the safe foundation for Author Brain inside existing Author Identity:

- Short self-description (`authorBrainSeed`)
- AI expand → professional bio (`biography`)
- Always manually editable
- Persisted in existing localStorage Author Identity vault

**NOT implemented (by design):** auto-injection export, published books, social links, CTA, KDP integration.

---

## Readiness: **Step 1 complete**

| Criterion | Status |
|-----------|--------|
| New UI section "About the Author" | ✅ |
| Short seed field | ✅ |
| AI expand button | ✅ |
| Editable bio output | ✅ |
| Existing persistence reused | ✅ |
| Zero breaking changes | ✅ |
| typecheck + build | ✅ |

---

## Files Touched

| File | Change |
|------|--------|
| `src/types/book.ts` | Added optional `authorBrainSeed` on `AuthorIdentity` |
| `src/lib/author-identity.ts` | Persist + normalize `authorBrainSeed` |
| `src/lib/author-brain/types.ts` | **New** — foundation types + future stub |
| `src/lib/author-brain/expand-bio.ts` | **New** — client invoke + validation |
| `src/lib/author-brain/index.ts` | **New** — public exports |
| `src/components/AuthorIdentityDialog.tsx` | Author Brain section + expand flow |
| `src/lib/i18n.ts` | Author Brain strings (en/it/es/fr/de) |
| `supabase/functions/expand-author-bio/index.ts` | **New** — edge function for bio expansion |
| `supabase/config.toml` | Register `expand-author-bio` |

---

## Persistence Validation

**Storage:** Existing `scriptora-author-identities-v1` localStorage (no new table, no schema migration).

| Field | Key | Behavior |
|-------|-----|----------|
| Raw self-description | `authorBrainSeed` | Saved on "Salva e rendi attivo" |
| Professional bio | `biography` (existing) | Unchanged contract — used by generation, export, front matter |

**Switching authors:** `selectIdentity()` loads full identity including seed + bio from vault.

**Refresh:** Data in localStorage — survives refresh.

**Logout/login:** Custom identities in localStorage persist (same as existing Author Identity behavior).

**Built-in presets:** Unaffected — `authorBrainSeed` optional, defaults empty.

**Backward compatibility:** Old saved identities without `authorBrainSeed` → normalize to `""`. No parse errors.

---

## AI Generation Behavior

**Endpoint:** `expand-author-bio` (Supabase edge function, DeepSeek via `callDeepSeekTracked`)

**Input:**
- `seed` (min 12 chars)
- `penName`, `language`
- Optional context: `archetype`, `voice`, `recurringThemes`

**Output:** `{ biography: string }` — single professional paragraph

**Prompt rules enforced:**
- Human, professional, author-brand aligned
- No fake credentials / bestseller hype
- Third-person bio using pen name
- Genre/tone from existing identity fields when available

**UX:**
- Button: "Expand with Scriptora AI"
- Loading state with spinner
- Success toast — bio fills `biography` textarea, **never locked**
- User can rewrite, adjust, regenerate anytime

**Deploy note:** Edge function must be deployed to Supabase for live AI expand:
```bash
supabase functions deploy expand-author-bio
```

---

## Edge Cases Handled

| Case | Handling |
|------|----------|
| Seed too short (<12 chars) | Client validation + toast |
| Missing pen name | Toast before API call |
| Empty AI response | Error toast |
| API rate limit / unavailable | Error message from edge function |
| Regenerate over existing bio | Overwrites biography field; seed preserved |
| Built-in identity edit | Save creates custom copy (existing behavior) |
| Private browsing localStorage fail | Same as existing Author Identity (graceful) |

---

## Regressions Checked

| Area | Result |
|------|--------|
| Author Identity save/load | ✅ Unchanged flow |
| Author switching | ✅ Seed + bio per identity |
| Generation `buildAuthorIdentityBlock` | ✅ Still reads `biography` |
| Export / front matter bio | ✅ Still uses `biography` |
| NewBookDialog author apply | ✅ Spreads full identity object |
| Completeness score | ✅ Includes seed field |
| Auth / Supabase client | ✅ No auth logic changed |
| Existing biography on old profiles | ✅ Preserved |

---

## Readiness for Step 2

Foundation is clean for incremental add:

```
AuthorIdentity
├── authorBrainSeed     ← V1 (raw input)
├── biography           ← V1 output + manual edit
└── [future] publishedBooks, links, social, CTA  ← NOT built
```

**Recommended Step 2 (after approval):**
- Published books list (title + optional link)
- Amazon/Kobo URL fields
- Still no auto-injection until Step 3+

**Module location:** `src/lib/author-brain/` — extend types + UI section blocks without touching generation pipeline.

---

## Build Verification

```bash
npm run typecheck   # ✅ pass
npm run build       # ✅ pass
```

---

## STOP

Step 1 complete. **Do not proceed** to published books, links, or export auto-injection until explicit approval.

---

## One-Line Summary

Author Brain V1 adds a premium "About the Author" layer to Author Identity — short seed, AI expand to professional bio, always editable — on existing persistence with zero breaking changes.
