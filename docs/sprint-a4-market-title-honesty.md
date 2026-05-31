# Sprint A4 — Market / Title Intelligence Honesty

Every market, title, KDP, and niche tool now declares its data status explicitly. Premium feel preserved; trust increased.

## Data status system

| Status | Label (IT) | When used |
|--------|------------|-----------|
| `live` | Verifica live | Edge function + external grounding (Brave, etc.) |
| `estimated` | Analisi stimata | Editorial heuristics, AI-only, or API fallback |
| `example` | Esempi editoriali | Pre-search samples, dashed cards |
| `unavailable` | Verifica live non disponibile in questa sessione | Scan failed, no results |

**Utility:** `src/lib/market-intelligence/marketDataStatus.ts`  
**UI:** `src/components/market-intelligence/MarketDataStatusBadge.tsx`

## Areas updated

| Area | Before | After |
|------|--------|-------|
| Title Intelligence | Fallback looked like live Amazon analysis | Badge `Analisi stimata` + microcopy |
| Bestseller Radar | Sample data near live results | Empty state + dashed `Esempi editoriali` section |
| Niche Trending Playlist | "Live · Brave", "Analisi base", dev fallback toast | Unified badges + honest copy |
| KDP Launch | "Dati di mercato in tempo reale" | `MarketDataStatusBadge` per step |
| KDP Title Domination | Mixed grounding pill copy | Live / estimated badges |
| Keyword Gold | "Brave live", "Analisi base" | Live / estimated badges |
| Market Intelligence Premium | Unlabeled heuristics | `Analisi stimata` badge |

## Fallbacks found & labeled

- `useTitleIntelligence` local fallback → `dataStatus: "estimated"`
- `NicheTrendingPlaylist` dev/API miss → estimated notice
- `BestsellerRadarPage` `sampleByGenre` → example section only before search
- KDP money-engine `fallbackReason` fields → estimated notices

## Copy removed / replaced

- "trend reali", "in tempo reale", "Analisi base", "Brave live"
- "Fallback dev attivo", "Errore durante l'analisi", "Keyword Gold fallito"
- Destructive red error boxes on market tools → soft `unavailable` notices

## Manual testing

1. **Title Intelligence** — disconnect edge / force failure → results show `Analisi stimata`, not live framing.
2. **Bestseller Radar** — before search: only dashed editorial examples. After search with results: `Verifica live` banner.
3. **Bestseller Radar** — failed search: `Verifica live non disponibile` (no red error).
4. **Niche playlist** — load without Brave: `Analisi stimata` badge.
5. **KDP Launch** — market step shows grounding badge; premium block shows estimated.
6. **Mobile** — badges wrap on narrow cards without covering CTAs.

## Residual risks

- Landing page still uses "demo" section IDs (marketing, not product tools).
- `ScriptoraBookMockup` uses internal `cc_mock_*` i18n keys (console preview only).
- Edge functions may still return optimistic copy in JSON — UI now overrides with badges.
- Radar live results remain synthesized public signals, not official Amazon API.

## Regression

```bash
npm test -- creditPolicy creditWallet stripeCheckout marketDataStatus
npm run typecheck
npm run build
npm run scriptora:doctor:smoke
```

## Unchanged

- Credit enforcement: **false**
- Stripe / checkout: untouched
- Auth, generation, export: untouched
- `creditPolicy.ts`: untouched
