# Scriptora Validation Suite — Report Comparativo

Generato: 2026-05-31T19:43:16.936Z

## Corpus
- 10 capitoli Romance
- 10 capitoli Thriller
- 10 capitoli Fantasy
- 10 capitoli Self Help
- **40 capitoli totali**

## Confronto pipeline
| Pipeline | Descrizione |
|---|---|
| **Baseline (pre A+B+C+D)** | Humanize only — nessun pre-delivery gate |
| **Corrente (A+B+C+D+E+F)** | Humanize + Orchestrator + Greatness + Masterpiece Pass |

## Metriche aggregate (40 capitoli)

| Metrica | Baseline | Corrente | Δ |
|---|---:|---:|---:|
| Supreme Editorial Score (avg) | 66 | 87 | **+21** |
| Greatness Score (avg) | 68 | 91 | **+23** |
| Narrative Magic Score (avg) | 73 | 96 | **+23** |
| Wonder (avg) | 41 | 40 | +-1 |
| Quote Potential (avg) | 44 | 60 | +16 |
| Memorability (avg) | 79 | 99 | +20 |
| Bingeability (avg) | 45 | 80 | +35 |
| Hook Intensity (avg) | 56 | 77 | +21 |
| Chapter Doctor Score (avg) | 7 | 7 | **+0** |
| Critical issues (totale) | 23 | 0 | **-23** (100% miglioramento) |
| Pre-delivery pass rate | 60% | 100% | **+40pp** |
| Reader Curiosity (avg) | 46 | 82 | +36 |
| Reader Retention (avg) | 59 | 72 | +13 |
| Character Consistency (avg) | 99 | 100 | +1 |
| Narrative Memory Health (avg) | 100 | 100 | **+0** |
| Cliché Density score (avg) | 49 | 86 | +37 |
| Canon Protection pass rate | 98% | 100% | +2pp |

## Problemi editoriali (conteggio totale — più basso è meglio)

| Problema | Baseline | Corrente | Riduzione |
|---|---:|---:|---:|
| Payoff mancanti | 0 | 0 | 0 |
| Cliché rilevati | 52 | 12 | 40 |
| Emozioni spiegate | 6 | 0 | 6 |
| Incoerenze personaggi | 1 | 0 | 1 |
| Promesse dimenticate (open) | 0 | 0 | 0 |
| Dialoghi artificiali | 4 | 4 | 0 |

## Per genere

### romance
- Supreme Score: 73 → **92** (+19)
- Greatness Score: 73 → **89** (+16)
- Narrative Magic: 76 → **98** (+22)
- Critical issues: 10 → **0** (-10)
- Pre-delivery pass: 50% → **100%**
- Cliché hits: 0 → **0**

### thriller
- Supreme Score: 67 → **89** (+22)
- Greatness Score: 67 → **91** (+24)
- Narrative Magic: 83 → **100** (+17)
- Critical issues: 0 → **0** (-0)
- Pre-delivery pass: 100% → **100%**
- Cliché hits: 10 → **1**

### fantasy
- Supreme Score: 66 → **86** (+20)
- Greatness Score: 68 → **92** (+24)
- Narrative Magic: 68 → **94** (+26)
- Critical issues: 1 → **0** (-1)
- Pre-delivery pass: 90% → **100%**
- Cliché hits: 11 → **1**

### self-help
- Supreme Score: 60 → **83** (+23)
- Greatness Score: 65 → **91** (+26)
- Narrative Magic: 67 → **93** (+26)
- Critical issues: 12 → **0** (-12)
- Pre-delivery pass: 0% → **100%**
- Cliché hits: 31 → **10**

## Conclusione

Scriptora con orchestrator A+B+C+D+E+F produce testo misurabilmente superiore: **+21** Supreme, **Greatness 91**, **Magic 96**, **100%** meno issue critici.