# Scriptora Real Author Pass Report

Generated: 2026-05-30T19:38:58.161Z
Mode: **OFFLINE BLOCKED** — live API keys not configured

## Status
Live API benchmark blocked. Set: DEEPSEEK_API_KEY (Scriptora stack), OPENAI_API_KEY (ChatGPT live), ANTHROPIC_API_KEY (Claude live)

| Key | Present |
|-----|---------|
| DEEPSEEK_API_KEY | ❌ |
| OPENAI_API_KEY | ❌ |
| ANTHROPIC_API_KEY | ❌ |

## How to run the real pass
```bash
export DEEPSEEK_API_KEY=...
export OPENAI_API_KEY=...
export ANTHROPIC_API_KEY=...
npm run benchmark:live
```

For full matrix (21 projects, 25-chapter long book):
```bash
LIVE_BENCHMARK_FULL=1 npm run benchmark:live
```

## Brutal verdict (pre-live)
Cannot prove or falsify superiority without live API outputs. Offline simulated validation exists in `benchmark-logs/scriptora-live-validation-report.md` — that is NOT this report.

## Author Blind Questions (framework — live pass required)
Outputs are shuffled A/B/C. Reviewers answer WITHOUT knowing which model produced which:

1. Which feels more human?
2. Which understands continuity better?
3. Which feels more emotionally realistic?
4. Which keeps characters more consistent?
5. Which feels more publishable?
6. Which would you actually use for a real book?

Mapped rubric dimensions: humanFeel, emotionalRealism, continuity, characterConsistency, readerEngagement, commercialStrength.

## Offline evidence (NOT live — reference only)
- Offline corpus: 35 projects (romance, thriller, fantasy, memoir, self-help, business, practical)
- Offline score: 90/100 — see scriptora-live-validation-report.md
- Chapter Doctor blind: editor would choose improved version (offline)
- Long-book survival: passed 28 chapters offline
- **Live API keys missing — run `npm run benchmark:live` before launch marketing claims**