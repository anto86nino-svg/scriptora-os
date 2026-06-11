#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Scriptora — Export readiness verifier (READ-ONLY)
# Non modifica nulla. Solo controlla.
#
# Exit codes:
#   0 = tutto PASS (eventuali WARNING non bloccanti)
#   1 = almeno un FAIL → export non sicuro
# ─────────────────────────────────────────────────────────────
set -u

PROJECT_REF="lesxmntzrwjaooacvpko"
OLD_REF="abdvbytjxglwcmfsixgr"
EXPECTED_FUNCS=18
EXPECTED_MIGS=10

PASS_COUNT=0; FAIL_COUNT=0; WARN_COUNT=0

green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
hr()     { printf "\033[90m────────────────────────────────────────────────────────\033[0m\n"; }

pass() { green "✅ PASS  $*"; PASS_COUNT=$((PASS_COUNT+1)); }
fail() { red   "❌ FAIL  $*"; FAIL_COUNT=$((FAIL_COUNT+1)); }
warn() { yellow "⚠️  WARN  $*"; WARN_COUNT=$((WARN_COUNT+1)); }

hr; bold "▶ Scriptora export verifier"; hr

# ── 1. setup.sh exists ───────────────────────────────────────
if [[ -f setup.sh ]]; then pass "setup.sh esiste"
else fail "setup.sh mancante"; fi

# ── 2. setup.sh is valid bash ────────────────────────────────
if [[ -f setup.sh ]] && bash -n setup.sh 2>/dev/null; then
  pass "setup.sh sintassi bash valida"
else
  fail "setup.sh ha errori di sintassi bash"
fi

# ── 3. .env.example ──────────────────────────────────────────
[[ -f .env.example ]] && pass ".env.example esiste" || fail ".env.example mancante"

# ── 4. client.ts.template ────────────────────────────────────
[[ -f client.ts.template ]] && pass "client.ts.template esiste" || fail "client.ts.template mancante"

# ── 5. README_EXPORT.md ──────────────────────────────────────
[[ -f README_EXPORT.md ]] && pass "README_EXPORT.md esiste" || fail "README_EXPORT.md mancante"

# ── 6. supabase/functions ────────────────────────────────────
[[ -d supabase/functions ]] && pass "supabase/functions/ esiste" || fail "supabase/functions/ mancante"

# ── 7. supabase/migrations ───────────────────────────────────
[[ -d supabase/migrations ]] && pass "supabase/migrations/ esiste" || fail "supabase/migrations/ mancante"

# ── 8. Edge Functions count ──────────────────────────────────
if [[ -d supabase/functions ]]; then
  FUNC_COUNT=$(find supabase/functions -mindepth 1 -maxdepth 1 -type d ! -name "_shared" | wc -l | tr -d ' ')
  if [[ "$FUNC_COUNT" -eq "$EXPECTED_FUNCS" ]]; then
    pass "Edge Functions: $FUNC_COUNT (atteso $EXPECTED_FUNCS)"
  elif [[ "$FUNC_COUNT" -gt "$EXPECTED_FUNCS" ]]; then
    warn "Edge Functions: $FUNC_COUNT (più del previsto $EXPECTED_FUNCS — nuove aggiunte?)"
  else
    fail "Edge Functions: $FUNC_COUNT (atteso $EXPECTED_FUNCS — alcune mancanti)"
  fi
fi

# ── 9. Migrations count ──────────────────────────────────────
if [[ -d supabase/migrations ]]; then
  MIG_COUNT=$(find supabase/migrations -name "*.sql" | wc -l | tr -d ' ')
  if [[ "$MIG_COUNT" -eq "$EXPECTED_MIGS" ]]; then
    pass "Migrations: $MIG_COUNT (atteso $EXPECTED_MIGS)"
  elif [[ "$MIG_COUNT" -gt "$EXPECTED_MIGS" ]]; then
    warn "Migrations: $MIG_COUNT (più del previsto $EXPECTED_MIGS)"
  else
    fail "Migrations: $MIG_COUNT (atteso $EXPECTED_MIGS — alcune mancanti)"
  fi
fi

# ── 10. invoke("...") ↔ edge function name match ─────────────
if [[ -d supabase/functions && -d src ]]; then
  INVOKED=$(grep -rhoE 'supabase\.functions\.invoke\(\s*["'\''`]([a-zA-Z0-9_-]+)["'\''`]' src/ 2>/dev/null \
    | sed -E 's/.*invoke\(\s*["'\''`]([^"'\''`]+).*/\1/' | sort -u)
  AVAILABLE=$(find supabase/functions -mindepth 1 -maxdepth 1 -type d ! -name "_shared" -exec basename {} \; | sort -u)
  MISSING=""
  for fn in $INVOKED; do
    if ! echo "$AVAILABLE" | grep -qx "$fn"; then
      MISSING="$MISSING $fn"
    fi
  done
  if [[ -z "$MISSING" ]]; then
    INVOKE_COUNT=$(echo "$INVOKED" | grep -c . || echo 0)
    pass "invoke() ↔ Edge Functions: tutti $INVOKE_COUNT match"
  else
    fail "invoke() senza Edge Function corrispondente:$MISSING"
  fi
fi

# ── 11. NO server-side secrets in frontend ───────────────────
SECRETS_TO_CHECK=(DEEPSEEK_API_KEY BRAVE_SEARCH_API_KEY GOOGLE_CLIENT_SECRET SUPABASE_SERVICE_ROLE_KEY)
LEAK_FOUND=0
for sec in "${SECRETS_TO_CHECK[@]}"; do
  # Cerca SOLO usi reali (non commenti). Filtra righe che iniziano con // * o #
  RAW=$(grep -rIn "$sec" src/ 2>/dev/null | grep -v 'node_modules' || true)
  HITS=$(echo "$RAW" | grep -vE ':[[:space:]]*(//|\*|#)' | grep -v '^$' || true)
  ENV_HITS=""
  if [[ -f .env ]]; then
    ENV_HITS=$(grep -nE "^[[:space:]]*${sec}=" .env 2>/dev/null || true)
  fi
  if [[ -n "$HITS" || -n "$ENV_HITS" ]]; then
    fail "Secret '$sec' trovato nel frontend/.env (uso reale, non commento):"
    [[ -n "$HITS" ]] && echo "$HITS" | sed 's/^/    /'
    [[ -n "$ENV_HITS" ]] && echo "$ENV_HITS" | sed 's/^/    .env: /'
    LEAK_FOUND=1
  fi
done
[[ "$LEAK_FOUND" -eq 0 ]] && pass "Nessun secret server-side nel frontend o .env"

# ── 12. NO runtime hardcoded refs to old Supabase ────────────
RUNTIME_HITS=$(grep -rIn "$OLD_REF" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' --include='*.json' \
  src/ supabase/functions/ 2>/dev/null \
  | grep -v 'node_modules' | grep -v '\.bak\.' || true)

if [[ -z "$RUNTIME_HITS" ]]; then
  pass "Nessun riferimento hardcoded al vecchio progetto $OLD_REF nel codice"
else
  fail "Riferimenti hardcoded al vecchio progetto $OLD_REF nel codice:"
  echo "$RUNTIME_HITS" | sed 's/^/    /'
fi

# .env locale: in Lovable preview punta al vecchio ref (atteso); post-export setup.sh lo riscrive.
if [[ -f .env ]] && grep -q "$OLD_REF" .env 2>/dev/null; then
  warn ".env locale punta a $OLD_REF — normale in Lovable preview, setup.sh lo riscrive post-export"
fi

# ── 13. Documental refs to old project → WARNING only ────────
DOC_HITS=$(grep -rIln "$OLD_REF" \
  --include='*.md' --include='*.txt' --include='*.sh' \
  . 2>/dev/null | grep -v node_modules | grep -v '\.bak\.' || true)
if [[ -n "$DOC_HITS" ]]; then
  warn "Riferimenti documentali a $OLD_REF (innocui, solo info):"
  echo "$DOC_HITS" | sed 's/^/    /'
fi

# ── 14. client.ts.template uses import.meta.env ──────────────
if [[ -f client.ts.template ]]; then
  if grep -q "import.meta.env" client.ts.template; then
    pass "client.ts.template usa import.meta.env"
  else
    fail "client.ts.template NON usa import.meta.env"
  fi
fi

# ── 15. setup.sh contains required commands ─────────────────
if [[ -f setup.sh ]]; then
  REQUIRED=(
    "supabase link --project-ref \"\${PROJECT_REF}\"|supabase link --project-ref ${PROJECT_REF}|supabase link --project-ref \${PROJECT_REF}"
    "supabase db push"
    "supabase functions deploy"
    "supabase secrets set \"DEEPSEEK_API_KEY|supabase secrets set DEEPSEEK_API_KEY"
  )
  LABELS=(
    "supabase link --project-ref ${PROJECT_REF}"
    "supabase db push"
    "supabase functions deploy"
    "supabase secrets set DEEPSEEK_API_KEY"
  )
  i=0
  for pattern in "${REQUIRED[@]}"; do
    if grep -qE "$pattern" setup.sh; then
      pass "setup.sh contiene: ${LABELS[$i]}"
    else
      fail "setup.sh NON contiene: ${LABELS[$i]}"
    fi
    i=$((i+1))
  done
fi

# ── 16. README_EXPORT.md contains Google OAuth instructions ──
if [[ -f README_EXPORT.md ]]; then
  if grep -qiE "google.*oauth|oauth.*google|/auth/v1/callback" README_EXPORT.md; then
    pass "README_EXPORT.md contiene istruzioni Google OAuth"
  else
    fail "README_EXPORT.md NON contiene istruzioni Google OAuth"
  fi
fi

# ── Summary ──────────────────────────────────────────────────
hr
bold "Risultato: ${PASS_COUNT} PASS  •  ${WARN_COUNT} WARN  •  ${FAIL_COUNT} FAIL"
hr
if [[ "$FAIL_COUNT" -eq 0 ]]; then
  green "✅ EXPORT READY — puoi pushare su GitHub e clonare in Code Studio."
  [[ "$WARN_COUNT" -gt 0 ]] && yellow "   ($WARN_COUNT warning non bloccanti — controlla sopra)"
  exit 0
else
  red "❌ EXPORT NOT READY — risolvi i FAIL prima di esportare."
  exit 1
fi
