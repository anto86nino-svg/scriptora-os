# Scriptora Real Author Pass Report

Generated: 2026-05-29T16:54:22.788Z
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