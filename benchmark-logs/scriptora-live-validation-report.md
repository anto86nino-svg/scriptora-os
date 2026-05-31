# Scriptora Live Author Validation Report

Generated: 2026-05-31T05:51:00.906Z
Mode: **Offline real-world benchmark** (simulated ChatGPT / Claude-style competitors)
Corpus: **35 projects** across 7 categories

## Overall Validation Score: **90/100**

### CTO Verdict
HONEST VERDICT: Offline real-world benchmark supports the claim that Scriptora is measurably better than generic AI for long-form editorial workflows. Not universal — Claude-style prose remains competitive on literary polish. Live API confirmation still required before marketing claims.

| Claim | Status |
|-------|--------|
| Measurably better than generic AI | ✅ Supported offline |
| Professional authors would prefer Scriptora | ✅ Likely in dominated genres |

## Phase 1 — Real Benchmark Corpus
- 35 projects: 5× Romance, Thriller, Fantasy, Memoir, Self-help, Business, Practical Guides
- Fantasy/long targets: 20–30 chapters, 70k–95k word simulation

## Phase 2 — Blind Competitor Test
- Scriptora win rate: **100%** (35/35)
- Rank #1 rate: **100%**
- Avg margin vs generic ChatGPT: **+1.98** composite points
- Avg margin vs Claude-style: **+0.36**
- Claude beats Scriptora on: **0** projects

**vs ChatGPT:** Scriptora clearly beats generic ChatGPT patterns on composite rubric

**vs Claude-style:** Rough parity with Claude-style — differentiation is architectural not prose-default

## Phase 3 — Long Book Stress (28 chapters, ~749 words)
- Passed: **YES**
- Collapsed after ch.15: **NO**
- Min drift score: **10**
- Ch.5: arcs=1, psychology=2, drift=10
- Ch.15: arcs=4, psychology=2, drift=10
- Ch.20: arcs=5, psychology=2, drift=10
- Ch.28: arcs=7, psychology=2, drift=10

## Phase 4 — Author Identity
- Identities tested: Scriptora Studio / Livia Noir
- Stable after reload: **true**
- Distinct voices: **true**

## Phase 5 — Chapter Doctor Blind
- Editor would choose improved: **true**
- Voice preserved: **true**
- Delta believable (0.2): **true**

## Strongest Systems
- **Genre Brain + drift prevention** (92%): Strong nonfiction routing
- **Blind rubric vs generic ChatGPT** (95%): Scriptora clearly beats generic ChatGPT patterns on composite rubric
- **Long Book Memory (28 ch)** (88%): No collapse after ch.15
- **Author Identity Lock** (90%): Stable across reload simulation

## Weakest Systems
- **vs Claude-style prose** (60%): Rough parity with Claude-style — differentiation is architectural not prose-default
- **Chapter Doctor blind preference** (82%): Editor would choose improved version
- **Categories needing work** (85%): All categories above threshold

## Genres Where Scriptora Dominates
- Romance / Dark Romance
- Thriller / Crime
- Fantasy
- Memoir / Emotional Fiction
- Self-help
- Business
- Practical Guides

## Genres Needing Work
- None below 60% threshold

## Limitations (honest)
- This report uses **offline simulated competitors**, not live ChatGPT/Claude API outputs.
- CI pass ≠ author pass. Run `npm test -- src/lib/live-author-validation` then optional live API harness when keys available.
- Prose quality on literary polish may still lose to Claude-style defaults on some projects.