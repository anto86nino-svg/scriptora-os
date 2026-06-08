# Scriptora Consistency Audit

Date: 2026-05-29  
Scope: Blueprint → Chapters → Export → Mobile Writer

## Fixed in this pass

| Area | Issue | Resolution |
|------|-------|------------|
| Chapter titles | Repeated book-title fragments (`Roma e Antica`) | `isBookTitleFragment` + quality scoring in `chapter-title-engine-v2.ts` |
| Subchapters | Generic beat placeholders | `subchapter-titles.ts` derives titles from chapter summary |
| Subchapters OFF | Export/normalize still carried subchapter arrays | `export-cleanup.ts` strips subs when disabled |
| Export | Front/back matter falsely blocked EPUB | `validateEpubStructure` no longer hard-requires them |
| Export | No navigation from errors | `export-readiness.ts` + `ExportIssuesDialog` with one-tap fixes |
| Mobile | Heavy panels mounted during writing | Lazy `GenreCoachPanel`, `AICoachPanel`, `SettingsPanel`, `DominationTray` |
| Sidebar | Long chapter lists slow mobile | `NavigationTree` renders first 24 chapters, expandable |

## Reachability map

| Problem detected | Fix entry point |
|------------------|-----------------|
| Missing blueprint | Export dialog → Apri Blueprint → `/app` blueprint section |
| Missing chapter | Export dialog → Genera capitolo → chapter generator |
| Missing subchapter (only if enabled) | Export dialog → Genera sottocapitolo |
| Missing cover (warning) | Export dialog → Apri Cover Studio |
| Missing front/back matter (warning) | Export dialog → Genera premessa/postfazione |
| Token/plan export lock | `UpgradeModal` from TopBar export |
| Chapter title quality | Auto-normalized in `normalizeBlueprint()` |

## Remaining gaps (non-blocking)

1. **Blueprint regenerate** from export fix opens blueprint UI but does not auto-trigger generation — intentional, avoids surprise API spend.

## Success criteria status

- [x] Chapter titles content-driven, no book-title reuse
- [x] Subchapters coherent when ON, ignored when OFF
- [x] Export validates only enabled features
- [x] Export blockers include fix buttons
- [x] Mobile chapter view loads lighter module set
- [x] Full parity export UX: `/app`, `HomeExportDialog`, `PublishPanel`, `BookPreview`

## Export entry points (unified)

| Surface | Engine | Fix navigation |
|---------|--------|----------------|
| `/app` TopBar | `analyzeExportReadiness` | `ExportIssuesDialog` |
| Dashboard `HomeExportDialog` | `analyzeExportReadiness` | `ExportIssuesDialog` → `/app` |
| `PublishPanel` | `analyzeExportReadiness` | `ExportIssuesDialog` → `onExportFix` |
| `BookPreview` | `analyzeExportReadiness` | toast (legacy preview surface) |
