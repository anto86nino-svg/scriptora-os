# Scriptora — Launch Device QA Checklist

Founder manual QA before real users. Run on **real devices** — simulators miss Safari safe-area, keyboard, and scroll quirks.

**Last updated:** Sprint A7 — Launch Preparation

---

## Devices & viewports

| Device / browser | Viewport | Priority |
|------------------|----------|----------|
| iPhone Safari | 390×844 (also spot-check 320, 375, 414) | P0 |
| Android Chrome | 360×800 (also 390) | P0 |
| Desktop Chrome | 1280×800 | P1 |
| Desktop Safari | 1440×900 | P1 |

**Global checks (every flow):**

- [ ] No crash / white screen
- [ ] No modal drift (modal stays anchored, backdrop covers viewport)
- [ ] No cutoff (CTA, footer, last paragraph visible)
- [ ] No hidden CTA (sticky bars not covered by keyboard or home indicator)
- [ ] Mobile safe-area respected (`env(safe-area-inset-*)`)
- [ ] No awkward spacing (giant dead zones, double padding)
- [ ] Premium feel maintained (calm errors, consistent radius/spacing)

---

## Flow checklist

### 1. Login
- [ ] Email/password sign-in succeeds
- [ ] Wrong password → calm message, no raw Supabase string
- [ ] Google OAuth round-trip works
- [ ] Session persists after refresh

### 2. Signup
- [ ] Email signup + verification email sent
- [ ] Duplicate email → friendly redirect to sign-in
- [ ] Password validation clear (min 8 chars)

### 3. Dashboard open
- [ ] Library loads without flash / empty state stuck
- [ ] Lazy panels show loading veil (not blank)
- [ ] Scroll smooth on mobile

### 4. Open project
- [ ] Project opens Writer OS (`/app`) without layout shift
- [ ] No half-rendered panels

### 5. Generate chapter
- [ ] Generation starts immediately after trigger
- [ ] Progress visible in pipeline / chat
- [ ] No duplicate “generating” state

### 6. Streaming generation
- [ ] Text streams incrementally (chunked chapters)
- [ ] UI remains responsive during stream
- [ ] Cancel / error states recover cleanly

### 7. Voice Studio
- [ ] Modal opens/closes smoothly
- [ ] Play / pause / resume / restart work
- [ ] Mobile footer controls fixed above safe-area
- [ ] Keyboard does not cover play bar when editing bookmark label

### 8. Background reading
- [ ] Audio continues when scrolling modal body
- [ ] Tab switch / minimize behavior acceptable (Safari limits noted)

### 9. Bookmark save & resume
- [ ] Save bookmark → toast success
- [ ] Reopen chapter → resumes from bookmark position

### 10. Diagnostics → Fix chapter
- [ ] Diagnostics panel opens, no overflow
- [ ] Fix flow stable, before/after readable
- [ ] Apply CTA reachable on mobile (bottom padding)

### 11. Cover Studio
- [ ] Preview loads
- [ ] Controls usable on narrow screen
- [ ] Export/save CTA always reachable (sticky bar)

### 12. Character Studio
- [ ] Long textarea scrolls
- [ ] Save CTA visible
- [ ] Create → attach to new book flow works

### 13. Market Intelligence
- [ ] Honesty badge visible (demo / limited / live)
- [ ] Confidence + explainability cards readable
- [ ] No fake-live copy
- [ ] Mobile badge wrapping OK

### 14. KDP tools
- [ ] Title Domination, Keyword Gold, Niche Trending, KDP Launch each open
- [ ] Premium notices on limits
- [ ] No destructive empty states

### 15. Export
- [ ] Export modal opens
- [ ] Loading state during EPUB/PDF/DOCX
- [ ] Paywall if Free plan (upgrade modal, not crash)

### 16. Paywall
- [ ] Locked feature → upgrade modal (not silent fail)
- [ ] Copy premium, CTA visible

### 17. Upgrade modal
- [ ] Scroll internal body on small screens
- [ ] Pro / Studio cards tappable
- [ ] Checkout pending notice visible

### 18. Stripe checkout start
- [ ] Redirect to Stripe Checkout (test mode)
- [ ] Cancel returns to `/pricing?checkout=cancelled`
- [ ] Success returns to `/pricing?checkout=success`

### 19. Logout / login restore
- [ ] Sign out clears session
- [ ] Re-login restores projects from cloud

### 20. Session persistence
- [ ] Close tab, reopen → still logged in
- [ ] Reading position / draft preserved where expected

---

## Sign-off

| Tester | Date | Devices | Blockers found |
|--------|------|---------|----------------|
| | | | |

**Launch gate:** All P0 flows pass on iPhone Safari + Android Chrome with zero crash-level blockers.
