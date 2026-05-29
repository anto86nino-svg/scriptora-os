# Scriptora — Real Author Validation Pass V1

Generated: 2026-05-29  
Scope: **Surgical Edit Engine V1 trust validation only**  
Mode: Validation pass — no feature work, no tuning, engine frozen

---

## Executive Verdict: **PARTIAL TRUST — HUMAN GATE BLOCKING**

| Layer | Status |
|-------|--------|
| Live human study (N=10–20) | ❌ **Not executed** |
| Automated corpus proxy (N=35) | ✅ Complete |
| Surgical hardening suite | ✅ 20/20 assertions |
| Chapter Doctor blind (offline) | ✅ Editor prefers improved |
| Live AI patch-chapter (`patch-chapter`) | ⚠️ **Not run** — API keys missing |

**Bottom line:** Engineering signals are **promising but insufficient** to claim authors would pay or fully trust this on a real manuscript. **Do not ship paywall or marketing claims until the human gate passes.**

This is not a failure of the engine — it is the honest state of validation.

---

## Primary Question

> Does Scriptora make authors feel *"It improved MY writing"* instead of *"It rewrote my book"*?

| Evidence type | Answer |
|---------------|--------|
| Human authors (target test) | **Unknown — study not run** |
| Offline proxy (problem text) | **Likely yes** — voice preserved, measurable improvement |
| Offline proxy (strong text) | **N/A — engine correctly abstains** (no false rewrites) |
| Production AI patch path | **Unknown — requires live sessions** |

---

## 1. Participant Breakdown

### Human study (mandatory for GREEN LIGHT)

| Segment | Target | Actual |
|---------|--------|--------|
| Total authors | 10–20 | **0** |
| Romance / dark romance | 2–4 | 0 |
| Fantasy | 2–3 | 0 |
| Thriller | 2–3 | 0 |
| Self-help / nonfiction | 2–3 | 0 |
| Emotional fiction / memoir | 1–2 | 0 |
| Beginner | mix | 0 |
| Intermediate | mix | 0 |
| Advanced / published | mix | 0 |

**Status:** Recruitment + session protocol defined below. **No human responses collected.**

### Automated proxy corpus (substitute — NOT equivalent to humans)

| Segment | N | Notes |
|---------|---|-------|
| Romance / dark romance | 5 | Real-world benchmark titles |
| Thriller | 5 | |
| Fantasy | 5 | |
| Memoir / emotional fiction | 5 | |
| Self-help | 5 | |
| Business nonfiction | 5 | |
| Practical / horticultural | 5 | |
| **Total** | **35** | Offline fixtures — simulated author skill = "strong baseline prose" |

Data: `benchmark-logs/scriptora-real-author-validation-v1-proxy.json`

---

## 2. Trust Score

### Human metrics (GREEN LIGHT thresholds)

| Metric | Target | Actual | Pass? |
|--------|--------|--------|-------|
| "Still feels like my writing" (≥8/10) | ≥80% | **N/A** | ❌ |
| Prefer improved version | ≥75% | **N/A** | ❌ |
| Trust for real manuscript (YES) | ≥70% | **N/A** | ❌ |
| Willing to pay (YES) | ≥50% | **N/A** | ❌ |

### Proxy trust indicators (offline only — do not substitute for humans)

| Indicator | Result | Interpretation |
|-----------|--------|----------------|
| Voice guard never breached on corpus | 100% (35/35) | Safe on strong + problem text |
| Apply on **strong** polished corpus | 0% (0/35) | **Under-edits** clean prose — good for trust, bad if users expect visible change |
| Apply on **problem-injected** corpus | 100% (35/35) | Intervenes when AI-tell patterns present |
| Chapter Doctor blind — editor chooses improved | **YES** | Offline romance fixture |
| Delta believable | **YES** (+0.2, ≤1.0) | No score inflation |

**Proxy trust score (engineering only):** **72/100** — safe but unproven with real authors.

---

## 3. Voice Preservation Score

| Test | Score | Detail |
|------|-------|--------|
| Voice guard (modification ≤25%) | **10/10** | 35/35 corpus samples |
| Sentence/dialogue drift rejection | **Pass** | Hardening suite |
| Strong text left untouched | **Pass** | 0% false-positive apply |
| Chapter Doctor blind voice check | **Pass** | `voicePreserved: true` |
| Human "still my writing" (1–10) | **N/A** | Requires live study |

**Voice preservation (proxy):** **Strong**  
**Voice preservation (human-confirmed):** **Unverified**

---

## 4. Apply vs Reject Rate

### Production flow (intended)

Authors review **Before / After diff** → **Apply changes** or **Keep original**.

| Scenario | Proxy apply rate | Notes |
|----------|------------------|-------|
| Strong published-quality corpus | **0%** | Local engine + strong fixtures = no spurious edits |
| Same corpus + injected AI-tell problems | **100%** | Dialogue/emotion/ending patterns triggered |
| Chapter Doctor fixture (weak → improved) | **Apply** (offline editor choice) | 12% modification, believable delta |

**Risk signal:** Authors with **already strong chapters** may see **"not enough change"** unless AI `patch-chapter` path finds improvable segments. This must be tested live — proxy cannot simulate DeepSeek patch quality.

**Risk signal:** Authors with **weak/over-explained** prose should see useful change — proxy supports this; human confirmation pending.

---

## 5. Pay Willingness

| Source | YES | MAYBE | NO |
|--------|-----|-------|-----|
| Human study | — | — | — |
| Engineering estimate | **Do not estimate** | — | — |

**Rule:** No pay/pricing claims until Question 7 is answered by ≥10 real authors.

Suggested price discovery range to test in human sessions (not validated):
- Indie authors: €9–19/month add-on or €2–5/chapter surgical pass
- Published authors: €29–49/month if trust is high

---

## 6. Strongest Genre Fit (proxy)

| Genre | Proxy signal | Why |
|-------|--------------|-----|
| **Romance / dark romance** | **Strongest** | Chapter Doctor blind passed on romance fixture; slow-burn action; emotional trimming aligns with genre pain |
| **Thriller** | **Good** | Dialogue roughening + pacing compression triggered on problem text |
| **Memoir / emotional fiction** | **Good** | Emotional over-telling is common failure mode |

---

## 7. Weakest Genre Fit (proxy)

| Genre | Proxy signal | Why |
|-------|--------------|-----|
| **Self-help / business / horticultural** | **Weakest** | V1 actions tuned for fiction patterns; strong nonfiction corpus showed 0% apply on clean text |
| **Fantasy (polished)** | **Uncertain** | Voice-safe but may under-edit; canon-sensitive edits need human trust test |
| **Already-strong literary prose** | **Under-edit risk** | 0% apply on strong corpus — authors may say "nothing happened" |

---

## 8. Recurring Complaints (predicted — from proxy + architecture)

*Not yet observed from humans. These are **hypothesis warnings** to watch in live sessions:*

| Complaint | Likelihood | Evidence |
|-----------|------------|----------|
| "Not enough change" | **High** on strong chapters | 0% apply on polished corpus |
| "Feels rewritten" | Medium | Only if AI patch exceeds voice guard — mitigated by 25% cap + diff review |
| "Lost emotion / colder" | Medium | Emotional trimming action — must monitor romance authors |
| "Too subtle" | High (beginners) | By design — 25% cap |
| "Too AI / polished" | Medium | If patch-chapter over-smooths dialogue |
| "Confusing what changed" | Low | Side-by-side diff exists; explanations present |

---

## 9. Recurring Praise (predicted — watch in live sessions)

| Praise | Supported by |
|--------|--------------|
| "Subtle but useful" | Voice guard + low modification |
| "It understood the issue" | Developmental explanations in modal |
| "Didn't destroy my voice" | 100% voice preservation proxy |
| "I stayed in control" | Apply / Keep original flow |
| "Dialogue feels more real" | Roughening action on AI-tell patterns |

---

## 10. Recommended V2 Adjustments (ONLY after human gate)

**Do not implement until human results reviewed.**

| Priority | Adjustment | Trigger |
|----------|------------|---------|
| P0 | Run human study (10–20 authors) | Blocking everything |
| P0 | Live `patch-chapter` sessions with diff review | Validate production path ≠ local engine |
| P1 | **Detect subtle issues in strong prose** | If >40% say "not enough change" |
| P1 | **Nonfiction action profile** | If business/self-help trust <60% |
| P1 | **Romance emotional temperature guard** | If "emotionally colder" repeats |
| P2 | Per-action toggle in UI | If authors want single intervention only |
| P2 | Show modification % before apply | If trust barrier = fear of rewrite |

**If humans love it:** double down on trust UX (explanations, diff, voice cap) — not more aggression.

**If humans don't trust it:** fix trust FIRST — reduce visibility of scores, increase "why" copy, lower default patch intensity — **not** new features.

---

## Human Study Protocol (ready to execute)

### Test flow (Surgical Edit ONLY)

1. Paste real chapter (1,500–4,000 words)
2. Run **Surgical Edit** (not Dominate, not full generation)
3. Optional: note which issue they expected (dialogue / emotion / pacing / ending / tension)
4. Review Before / After diff
5. Choose **Apply** or **Keep original**
6. Complete 10-question survey (below)

### Mandatory questions (copy-ready)

1. Did this still feel like YOUR writing? (1–10)
2. Did the change actually improve the scene? (1–10)
3. Did anything feel rewritten or artificial? (open)
4. What improved the most? (dialogue / emotional depth / pacing / tension / readability / nothing)
5. What felt wrong? (too aggressive / too weak / changed voice / emotionally colder / too subtle / confusing / nothing)
6. Would you trust this on a real manuscript? YES / MAYBE / NO — why?
7. Would you pay for this? YES / MAYBE / NO — price expectation?
8. Which did you keep? Original / Improved — why?
9. What scared you most? (open)
10. What surprised you positively? (open)

### Recruitment criteria

- Minimum 10, target 20
- At least 2 published authors
- At least 3 romance/dark romance
- At least 2 fantasy, 2 thriller, 2 nonfiction
- Mix beginner / intermediate / advanced

### Session operator rules

- **No defending Scriptora** during session
- **No tuning** engine mid-study
- **Freeze** Surgical Edit V1 build for study duration
- Record: genre, word count, apply/reject, all 10 answers
- Store anonymized rows in spreadsheet → update this report as **V1.1**

---

## Genre Comparison (Romance vs Fantasy vs Thriller)

| Dimension | Romance | Fantasy | Thriller |
|-----------|---------|---------|----------|
| Proxy apply (problem text) | 100% | 100% | 100% |
| Proxy apply (strong text) | 0% | 0% | 0% |
| Voice preserved | 100% | 100% | 100% |
| Offline blind preference | ✅ (fixture) | Not run | Not run |
| Human trust | **Unknown** | **Unknown** | **Unknown** |

**Romance** has the only offline blind win. **Fantasy/thriller** need dedicated human chapters with canon-sensitive names/places.

---

## Success Metrics vs Actual

| GREEN LIGHT criterion | Required | Actual | Status |
|-----------------------|----------|--------|--------|
| Feels like my writing | ≥80% @ ≥8/10 | N/A | ❌ Blocked |
| Prefer improved | ≥75% | N/A | ❌ Blocked |
| Trust manuscript | ≥70% YES | N/A | ❌ Blocked |
| Willing to pay | ≥50% YES | N/A | ❌ Blocked |

| WARNING signal | Watch for | Proxy hint |
|----------------|-----------|------------|
| "Feels rewritten" | Monitor | Mitigated by diff + cap |
| "Too AI" | Monitor | patch-chapter untested live |
| "Lost emotion" | Monitor | Trim action risk in romance |
| "Too polished" | Monitor | Roughening may be insufficient live |
| "Not enough change" | **Likely on strong text** | 0% apply strong corpus |

---

## What Was Tested (frozen V1)

- ✅ `src/lib/surgical-edit-engine/` — local actions + voice guard
- ✅ `validateSurgicalPatchOutput()` — client cap
- ✅ Side-by-side trust modal — Apply / Keep original
- ✅ Developmental explanations — intervention catalog
- ✅ Hardening suite — 20/20
- ✅ 35-project corpus proxy
- ❌ Live human authors
- ❌ Live DeepSeek patch-chapter on author manuscripts

---

## Verdict Matrix

| Verdict | When | **This pass** |
|---------|------|---------------|
| **NO TRUST** | Human metrics fail or study not run for pay claims | Pay/marketing blocked |
| **PARTIAL TRUST** | Engineering safe; human gate pending | **← CURRENT** |
| **STRONG TRUST** | ≥80% voice + ≥75% prefer + ≥70% trust | Not met |
| **PRODUCT DIFFERENTIATOR** | Above + ≥50% pay + repeated "subtle but useful" | Not met |

---

## Honest CTO Read

**What we know:**
- The engine is **safe** — it does not mangle strong text or breach voice caps in offline tests.
- When prose has obvious AI-tell patterns, interventions apply and preserve voice in proxy runs.
- Chapter Doctor blind offline suggests improved version is editorially credible.

**What we do not know:**
- Whether **real authors** feel ownership after AI `patch-chapter` (production path).
- Whether subtle improvement reads as **useful** or **invisible**.
- Whether romance authors feel **emotionally colder**.
- Whether anyone would **pay**.

**Next action (only action):**
Run the human study. No V2. No tuning. Collect truth.

---

## Artifacts

| File | Purpose |
|------|---------|
| `benchmark-logs/scriptora-real-author-validation-v1.md` | This report |
| `benchmark-logs/scriptora-real-author-validation-v1-proxy.json` | 35-project proxy data |
| `benchmark-logs/scriptora-surgical-edit-engine-v1-hardening.json` | Engine hardening |
| `benchmark-logs/scriptora-live-validation-report.md` | Broader offline validation (not surgical-only) |

---

## END OF VALIDATION PASS V1

**Surgical Edit Engine V1 remains FROZEN.**

**No V2 until human results are reviewed.**

If authors don't trust it → fix trust first.  
If authors love it → double down.
