# Scriptora Mobile Navigation Recalibration — Audit Report

**Date:** 2026-05-29  
**Scope:** viewport mobile, z-index, stacking context, overflow, position, height, safe-area, dialog/modal/sheet/drawer/workspace  
**Out of scope:** business logic, Supabase, AI, routing, auth, aesthetics, new features

---

## Executive summary

Two overlay systems coexist:

1. **Radix-portaled** (`Dialog`, `AlertDialog`, `Sheet`, `Drawer`) → render on `document.body`.
2. **Inline** `.scriptora-modal-overlay` divs → render inside `.scriptora-feature-page` / `.scriptora-ios-screen` (`isolation: isolate`, `overflow-hidden`).

**Root cause (P0):** Dashboard sticky header uses `z-index: 100` (`Dashboard.tsx:723`, `device-view.css:34`). Most inline modals use `z-50` via `.scriptora-modal-overlay` (`index.css:80`). Modals inside the isolated page shell stack **below** the header on mobile.

Some features patched this ad hoc with `z-[9999]`, causing inconsistent behavior across the same page.

---

## Z-index hierarchy (recommended)

| Tier | Value | Usage |
|------|-------|--------|
| Base chrome | 0–40 | Editor sticky bars, mobile nav sidebar/backdrop |
| Page header | 100 | Dashboard / feature-page sticky headers |
| Modal / workspace | **110** | All modal overlays (inline + Radix) |
| Floating dev/tools | 105–120 | Dev badge, lazy fallback, debug panel |
| Toolbar dropdowns | 200 | Portaled menu content |
| Toast | 130 | Above modals |
| Guided tour | 10050+ | Unchanged |
| Surgical fullscreen | 10060 | Chapter compare, editorial compare |

---

## Findings by priority

### P0 — Dashboard header covers modals

| File | Line | Issue |
|------|------|-------|
| `src/index.css` | 80 | `.scriptora-modal-overlay` defaults to `z-50` |
| `src/pages/Dashboard.tsx` | 723 | Header `z-[100] isolate` |
| `src/styles/device-view.css` | 34 | `.scriptora-feature-page > header { z-index: 100 }` |

**Affected (under header):** New Book, Export, Cover Studio, Character Studio, Title Intelligence, Launch Book, Library modal, Settings (inline path).

**Works only via ad hoc patch:** Notepad, Author Identity, Advanced Appearance (`z-[9999]`).

### P0 — Inconsistent per-file z-index patches

| File | z-index |
|------|---------|
| `NotepadDialog.tsx:181` | `z-[9999]` |
| `AuthorIdentityDialog.tsx:209` | `z-[9999]` |
| `AdvancedAppearanceDialog.tsx:203` | `z-[9999]` |
| `CoverBeforeExportDialog.tsx:25` | `z-[70]` |
| `CoverGenerator.tsx:1185` | redundant `z-50` |
| `LaunchBookModal.tsx:65` | `z-50` |
| `PublishPanel.tsx:92,290,584` | `z-50` / `z-[60]` |
| `ChapterIntelligencePanel.tsx:513` | `z-50` |
| `FixChapterComparisonModal.tsx:273` | `z-[99999]` |
| `EditorialCompareView.tsx:24` | `z-[99999]` |
| `KdpEditorialMapDialog.tsx:75` | `z-[9999]` |
| `CuriosityPanel.tsx:24` | `z-[9999]` |

### P1 — Index mobile nav competes with modals

| File | Line | Issue |
|------|------|-------|
| `Index.tsx:581` | Nav toggle `z-50` — same tier as modals |
| `Index.tsx` | No `body.scriptora-mobile-overlay-open` when overlays open |

### P1 — Stacking context trap

| File | Line | Issue |
|------|------|-------|
| `index.css:5295` | `.scriptora-ios-screen { isolation: isolate }` scopes inline `fixed` overlays |

Raising modal tier to 110 fixes inline overlays without portaling.

### P2 — Viewport height on iOS

| File | Line | Issue |
|------|------|-------|
| `EditorialCompareView.tsx:29` | `h-screen` → should use `100dvh` |

### P2 — Bottom sheet safe-area

| File | Line | Issue |
|------|------|-------|
| `LaunchBookModal.tsx:69` | Bottom sheet panel missing `pb-safe` |
| `ui/drawer.tsx:34` | Drawer content missing `pb-safe` |

### P2 — Toast vs modals

| File | Line | Issue |
|------|------|-------|
| `ui/toast.tsx:17` | `z-[100]` can appear under `z-[9999]` modals inconsistently |

### P3 — Radix primitives default `z-50`

| File | Issue |
|------|-------|
| `ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` | Portaled dialogs at `z-50`; normalize to `z-[110]` |

---

## Feature opening matrix

| Feature | Component | Portal | Pre-fix mobile status |
|---------|-----------|--------|------------------------|
| Dashboard | `Dashboard.tsx` | — | Header blocks `z-50` modals |
| New Book | `NewBookDialog.tsx` | No | Under header on Dashboard |
| New Bestseller | `LaunchBookModal.tsx` | No | Under header; safe-area gap |
| Cover Studio | `CoverGenerator.tsx` | No | Under header on Dashboard |
| Export | `HomeExportDialog.tsx` | No | Under header on Dashboard |
| Settings | `SettingsPanel.tsx` | No | OK on Index; toggle overlap at `z-50` |
| Author Identity | `AuthorIdentityDialog.tsx` | No | Patched `z-[9999]` |
| Voice Studio | `VoiceStudioDialog.tsx` | Yes | OK (body portal) |
| Character Studio | `CharacterStudioDialog.tsx` | No | Under header |
| Market Intelligence | Page routes | — | Header `z-100`; page scroll OK |
| Manuscript Lab | `ManuscriptAnalyzerDialog.tsx` | Yes | OK |
| Notepad | `NotepadDialog.tsx` | No | Patched `z-[9999]` |
| Chapter Doctor | `ChapterIntelligencePanel.tsx` | No | `z-50`; OK on Index only |
| Editor | `Index.tsx` | — | Nav toggle / no body lock |

---

## Planned fixes (minimal, CSS/class only)

1. Raise `.scriptora-modal-overlay` to `z-[110]` in `index.css`.
2. Normalize Radix UI overlay/content to `z-[110]`.
3. Remove ad hoc `z-[9999]` / `z-[70]` overrides; set inline workspaces to `z-[110]`.
4. Surgical fullscreen modals → `z-[10060]`; `h-screen` → `h-[100dvh]`.
5. Index: nav toggle `z-40`; body scroll lock when overlays open.
6. Launch Book + Drawer: `pb-safe` on bottom sheets.
7. Toast → `z-[130]`; LazyPanelFallback → `z-[105]` (below modals).

---

## Files to modify

- `src/index.css`
- `src/styles/mobile-hardening.css`
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/drawer.tsx`
- `src/components/ui/toast.tsx`
- `src/pages/Index.tsx`
- `src/components/LaunchBookModal.tsx`
- `src/components/PublishPanel.tsx`
- `src/components/ChapterIntelligencePanel.tsx`
- `src/components/CoverGenerator.tsx`
- `src/components/CoverBeforeExportDialog.tsx`
- `src/components/NotepadDialog.tsx`
- `src/components/AuthorIdentityDialog.tsx`
- `src/components/AdvancedAppearanceDialog.tsx`
- `src/components/FixChapterComparisonModal.tsx`
- `src/components/EditorialCompareView.tsx`
- `src/components/KdpEditorialMapDialog.tsx`
- `src/components/curiosity/CuriosityPanel.tsx`
- `src/components/LazyPanelFallback.tsx`

---

## Applied fixes (2026-05-29)

| Fix | Files |
|-----|-------|
| Raise global modal tier `z-50` → `z-[110]` | `index.css`, `mobile-hardening.css` |
| Normalize Radix overlay/content to `z-[110]` | `ui/dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `drawer.tsx` |
| Remove ad hoc `z-[9999]` / `z-[70]` / redundant `z-50` | `NotepadDialog`, `AuthorIdentityDialog`, `AdvancedAppearanceDialog`, `CoverBeforeExportDialog`, `CoverGenerator` |
| Inline workspace overlays → `z-[110]` + safe-area padding | `LaunchBookModal`, `PublishPanel`, `ChapterIntelligencePanel`, `KdpEditorialMapDialog`, `CuriosityPanel` |
| Surgical fullscreen tier `z-[10060]` + `100dvh` | `FixChapterComparisonModal`, `EditorialCompareView` |
| Index mobile nav toggle `z-50` → `z-40` | `Index.tsx` |
| Index body scroll lock (`scriptora-mobile-overlay-open`) | `Index.tsx` |
| Toast above modals `z-[130]` + `100dvh` | `ui/toast.tsx` |
| Lazy fallback below modals `z-[105]` | `LazyPanelFallback.tsx` |
| Drawer / Launch Book bottom safe-area | `ui/drawer.tsx`, `LaunchBookModal.tsx` |

**Build:** `npm run build` ✅ GREEN
