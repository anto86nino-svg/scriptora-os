# Scriptora — Closed Beta Launch Plan

**Sprint A8 — Soft Launch / Closed Beta / Conversion Readiness**

Goal: validate with **10–20 real authors** before scaling.

---

## Target beta audience

| Segment | Why | What to watch |
|---------|-----|---------------|
| **Indie authors** | Core ICP — already publishing or trying to | Activation, export, paywall |
| **Romance authors** | High volume genre, strong Voice Studio fit | Generation speed, character continuity |
| **Fantasy authors** | Long-form, blueprint + canon stress test | Blueprint clarity, Dominate usage |
| **Self-help authors** | Non-fiction pipeline, KDP tools | Market Intelligence, export |
| **Anti-AI authors (diagnostics only)** | Trust-sensitive — may reject generation | Manuscript Lab, Diagnostics, honesty badges |

**Ideal cohort:** 3 romance, 3 fantasy/thriller, 2 self-help, 2 general indie, up to 5 wildcard.

**Avoid for v1 beta:** users who need team collaboration, API access, or white-label.

---

## Founder workflow

### Week 0 — Pre-invite (1–2 days)

- [ ] Complete `docs/launch-device-qa-checklist.md` on iPhone + desktop
- [ ] Complete `docs/stripe-smoke-checklist.md` in Stripe test mode
- [ ] Set prod env: `VITE_SENTRY_DSN`, optional `VITE_ANALYTICS_ENDPOINT`
- [ ] Prepare invite list (10–20 emails)
- [ ] Prepare beta code (if using editorial preview) or Free tier access

### Week 1 — Invite & onboard

1. **Invite users** — personal email, not mass blast. Template:

   > Subject: You're invited to Scriptora closed beta  
   > Body: One paragraph on what Scriptora is (author OS, not generic AI writer). Link to `/auth`. Ask them to complete first book + one chapter in first session.

2. **Track signup** — analytics: `signup_completed`, `first_project_created`

3. **Day-1 check-in** — if no `book_generation_started` within 48h, send nudge email

### Week 2–4 — Feedback loop

3. **Feedback collection** — send template below after 3–7 days of use

4. **Bug triage** — Sentry + user reports. Label: `beta-blocker` | `beta-polish` | `post-beta`

5. **Weekly review** (30 min every Friday):
   - Signups vs activations
   - Paywall opens vs checkout starts
   - Top 3 confusion themes from feedback
   - One micro-fix shipped (copy/UX only — no feature creep)

6. **Retention tracking** — return visits within 7 days (analytics queue or manual spreadsheet)

7. **Conversion tracking** — `paywall_opened` → `checkout_started` → `checkout_completed`

---

## Beta feedback template

Send to each beta user (Google Form, Typeform, or email reply):

```text
SCRIPTORA CLOSED BETA — FEEDBACK (5 min)

1. What confused you the first time you opened Scriptora?
   [ free text ]

2. What impressed you most?
   [ free text ]

3. Where did you stop or hesitate? (step name if you remember)
   [ free text ]

4. Would you pay for Scriptora today?
   [ ] Yes  [ ] Maybe  [ ] No

5. Why / why not?
   [ free text ]

6. What would make you recommend Scriptora to another author?
   [ free text ]

Optional: screenshot or screen recording link
```

---

## Core activation event (A7 analytics)

**Primary activation:** `book_generation_started` with `phase: chapter`

**Wow moment hypothesis:** user sees **streaming chapter text** in Writer OS within 10 minutes of signup.

**Secondary activations:**

| Event | Meaning |
|-------|---------|
| `first_project_created` | Intent — created book shell |
| `book_generation_completed` | Deep engagement — finished pipeline |
| `voice_studio_opened` | Premium differentiation felt |
| `market_tool_opened` | Commercial author path |
| Diagnostics usage | Trust / anti-AI path (track manually if no event yet) |

---

## Key metrics (keep simple)

| Metric | Target (beta) | Source |
|--------|---------------|--------|
| Signup rate | N/A (invite-only) | Supabase auth |
| Project creation rate | **>70%** of signups | `first_project_created` |
| Chapter generation rate | **>50%** of projects | `book_generation_started` |
| Diagnostics usage | **>20%** of active users | Manual / future event |
| Voice Studio usage | **>15%** of active users | `voice_studio_opened` |
| Paywall open rate | Track baseline | `paywall_opened` |
| Checkout start rate | **>30%** of paywall opens | `checkout_started` |
| Checkout completion | **>60%** of starts | `checkout_completed` |

**North star for beta:** % of invited users who generate **≥1 chapter** within 7 days.

---

## Success criteria for closing beta

Beta graduates to open access when:

- [ ] ≥8/10 invited users complete first chapter OR documented blocker fixed
- [ ] Zero `beta-blocker` bugs open
- [ ] Stripe smoke pass in production test mode
- [ ] Paywall → checkout funnel understood (even if conversion is low)
- [ ] Founder can explain **why users convert or don't** in one page

---

## Rollback / pause triggers

Pause invites if:

- Sentry error rate spikes (>10 unique users hit same crash)
- Checkout broken in prod
- Generation failure rate >25% on first chapter
- Multiple users report "don't understand what Scriptora is"

---

## Sign-off

| Milestone | Date | Notes |
|-----------|------|-------|
| Beta invite sent | | |
| First 5 activations | | |
| Feedback round 1 | | |
| Beta graduation decision | | |
