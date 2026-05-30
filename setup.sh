#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Nexora — One-command post-export setup
#
# Uso (dopo `git clone`):
#   chmod +x setup.sh && ./setup.sh
#
# Cosa fa (in ordine):
#  1. Crea/aggiorna .env (chiede la Supabase publishable key)
#  2. Riscrive src/integrations/supabase/client.ts (env-driven)
#  3. Aggiorna supabase/config.toml → project_id = lesxmntzrwjaooacvpko
#  4. npm install
#  5. Verifica Supabase CLI (e ti guida se manca)
#  6. supabase login (se serve)
#  7. supabase link --project-ref lesxmntzrwjaooacvpko
#  8. supabase db push  (applica le migrations)
#  9. supabase functions deploy --project-ref ... (deploya TUTTE le 18 functions)
# 10. Chiede DEEPSEEK_API_KEY → supabase secrets set
# 11. Chiede BRAVE_SEARCH_API_KEY (opzionale) → supabase secrets set
# 12. Stampa istruzioni Google OAuth (BYOK)
# 13. Verifica che NESSUN file di runtime referenzi il vecchio progetto
# 14. Avvia `npm run dev` (opzionale)
#
# REGOLE DI SICUREZZA (rispettate):
# - Nessun secret server-side viene scritto in .env / repo / frontend
# - DeepSeek / Brave / service_role / Google Client Secret → MAI nel codice
# - Solo la Supabase publishable key (anon) finisce in .env (è pubblica)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_REF="lesxmntzrwjaooacvpko"
PROJECT_URL="https://${PROJECT_REF}.supabase.co"
OLD_REF="abdvbytjxglwcmfsixgr"
TS="$(date +%Y%m%d-%H%M%S)"

# ── Colors ──────────────────────────────────────────────────
bold()   { printf "\033[1m%s\033[0m\n" "$*"; }
green()  { printf "\033[32m%s\033[0m\n" "$*"; }
red()    { printf "\033[31m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }
blue()   { printf "\033[34m%s\033[0m\n" "$*"; }
hr()     { printf "\033[90m────────────────────────────────────────────────────────\033[0m\n"; }

ask() {
  # ask "prompt" [default]  → echoes the answer
  local prompt="$1"; local default="${2:-}"
  local ans
  if [[ -n "$default" ]]; then
    read -r -p "$prompt [$default]: " ans
    echo "${ans:-$default}"
  else
    read -r -p "$prompt: " ans
    echo "$ans"
  fi
}

ask_secret() {
  # ask_secret "prompt"  → echoes (no terminal echo while typing)
  local prompt="$1"; local ans
  read -r -s -p "$prompt: " ans
  echo >&2
  echo "$ans"
}

confirm() {
  local prompt="$1"; local ans
  read -r -p "$prompt [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]]
}

# ─── 0. Sanity ───────────────────────────────────────────────
hr; bold "▶ Nexora setup → Supabase: ${PROJECT_REF}"; hr
[[ -f package.json ]] || { red "✗ Esegui dalla root del progetto (package.json non trovato)."; exit 1; }
[[ -d supabase/migrations ]] || { red "✗ Manca supabase/migrations/. Re-export da Lovable."; exit 1; }
[[ -d supabase/functions ]]  || { red "✗ Manca supabase/functions/. Re-export da Lovable."; exit 1; }

# Remove stale env files that break Vite production builds (never use these locally).
for stale in .env.production .env.vercel; do
  if [[ -f "$stale" ]]; then
    rm -f "$stale"
    yellow "  ⚠ Rimosso ${stale} — su Vercel usa Environment Variables, in locale usa .env.local"
  fi
done

MIG_COUNT=$(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l | tr -d ' ')
FUNC_LIST=$(find supabase/functions -mindepth 1 -maxdepth 1 -type d ! -name "_shared" -exec basename {} \; | sort)
FUNC_COUNT=$(echo "$FUNC_LIST" | grep -c . || true)
green "✓ ${MIG_COUNT} migration(s)  •  ${FUNC_COUNT} edge function(s)"

# ─── 1. .env.local (never .env.production) ───────────────────
hr; bold "▶ [1/14] Configurazione .env.local"
ENV_FILE=".env.local"
[[ -f "$ENV_FILE" ]] && cp "$ENV_FILE" "${ENV_FILE}.bak.${TS}" && green "  backup → ${ENV_FILE}.bak.${TS}"

EXISTING_KEY=""
EXISTING_ANON=""
if [[ -f "$ENV_FILE" ]]; then
  EXISTING_KEY=$(grep -E '^VITE_SUPABASE_PUBLISHABLE_KEY=' "$ENV_FILE" 2>/dev/null \
    | head -1 | sed -E 's/^[^=]+="?([^"]*)"?$/\1/' || true)
  EXISTING_ANON=$(grep -E '^VITE_SUPABASE_ANON_KEY=' "$ENV_FILE" 2>/dev/null \
    | head -1 | sed -E 's/^[^=]+="?([^"]*)"?$/\1/' || true)
  [[ "$EXISTING_KEY" == "INSERIRE_CHIAVE_PUBBLICABILE" || "$EXISTING_KEY" == "your-publishable-key" ]] && EXISTING_KEY=""
  [[ "$EXISTING_ANON" == "INSERIRE_CHIAVE_PUBBLICABILE" || "$EXISTING_ANON" == "your-legacy-anon-jwt" ]] && EXISTING_ANON=""
fi

if [[ -n "$EXISTING_KEY" ]]; then
  yellow "  Trovata Supabase publishable key esistente in ${ENV_FILE}."
  if confirm "  Vuoi sostituirla?"; then EXISTING_KEY=""; fi
fi

if [[ -z "$EXISTING_KEY" ]]; then
  echo
  blue "  La Supabase PUBLISHABLE KEY (pubblica) è sicura nel frontend."
  blue "  Trovala su: https://supabase.com/dashboard/project/${PROJECT_REF}/settings/api"
  blue "  → API Settings → Project API keys → publishable o anon public"
  echo
  PUB_KEY=$(ask_secret "  Incolla la tua Supabase publishable key (o anon JWT eyJ...)")
  [[ -z "$PUB_KEY" ]] && { red "✗ Chiave vuota. Annullo."; exit 1; }
else
  PUB_KEY="$EXISTING_KEY"
fi

ANON_JWT="$EXISTING_ANON"
if [[ "$PUB_KEY" == sb_publishable_* ]]; then
  yellow "  Publishable key rilevata — per AI/Edge Functions serve anche la anon JWT (eyJ...)."
  if [[ -z "$ANON_JWT" ]] && confirm "  Vuoi incollare VITE_SUPABASE_ANON_KEY ora?"; then
    ANON_JWT=$(ask_secret "  Incolla la anon JWT legacy (eyJ...)")
  fi
elif [[ "$PUB_KEY" == eyJ* ]]; then
  # Legacy anon JWT only — use for browser auth; do not duplicate into publishable slot.
  ANON_JWT="${ANON_JWT:-$PUB_KEY}"
  PUB_KEY=""
fi

{
  echo "VITE_SUPABASE_PROJECT_ID=\"${PROJECT_REF}\""
  echo "VITE_SUPABASE_URL=\"${PROJECT_URL}\""
  [[ -n "$PUB_KEY" ]] && echo "VITE_SUPABASE_PUBLISHABLE_KEY=\"${PUB_KEY}\""
  [[ -n "$ANON_JWT" ]] && echo "VITE_SUPABASE_ANON_KEY=\"${ANON_JWT}\""
} > "$ENV_FILE"
green "  ✓ ${ENV_FILE} scritto (mai .env.production)"

# ─── 2. client.ts ────────────────────────────────────────────
hr; bold "▶ [2/14] Verifica src/integrations/supabase/client.ts"
if grep -q "readSupabaseEnv" src/integrations/supabase/client.ts 2>/dev/null; then
  green "  ✓ client.ts già env-driven (skip riscrittura)"
else
cp src/integrations/supabase/client.ts "src/integrations/supabase/client.ts.bak.${TS}"
cat > src/integrations/supabase/client.ts <<'TS'
// Auto-generated by setup.sh — env-driven, no hardcoded values.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env.local. " +
    "Copy .env.example to .env.local and fill in your Supabase project credentials."
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
TS
green "  ✓ client.ts ora usa import.meta.env"
fi

# ─── 3. config.toml ──────────────────────────────────────────
hr; bold "▶ [3/14] Aggiornamento supabase/config.toml"
cp supabase/config.toml "supabase/config.toml.bak.${TS}"
echo "project_id = \"${PROJECT_REF}\"" > supabase/config.toml
green "  ✓ project_id = ${PROJECT_REF}"

# ─── 4. npm install ──────────────────────────────────────────
hr; bold "▶ [4/14] npm install"
npm install
green "  ✓ dipendenze installate"

# ─── 5. Supabase CLI ─────────────────────────────────────────
hr; bold "▶ [5/14] Verifica Supabase CLI"
if ! command -v supabase >/dev/null 2>&1; then
  red "  ✗ Supabase CLI non trovata."
  yellow "  Installa con uno di questi comandi e poi rilancia ./setup.sh :"
  echo "      macOS:   brew install supabase/tap/supabase"
  echo "      Linux:   curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz && sudo mv supabase /usr/local/bin/"
  echo "      Windows: scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase"
  echo "      Docs:    https://supabase.com/docs/guides/cli"
  exit 1
fi
green "  ✓ $(supabase --version)"

# ─── 6. supabase login ───────────────────────────────────────
hr; bold "▶ [6/14] supabase login"
if supabase projects list >/dev/null 2>&1; then
  green "  ✓ Già loggato"
else
  yellow "  Non sei loggato. Apro il browser per il login…"
  supabase login
fi

# ─── 7. supabase link ────────────────────────────────────────
hr; bold "▶ [7/14] supabase link --project-ref ${PROJECT_REF}"
if confirm "  Procedo con il link?"; then
  supabase link --project-ref "${PROJECT_REF}" || yellow "  ⚠ link fallito (forse già linkato). Continuo."
fi

# ─── 8. db push ──────────────────────────────────────────────
hr; bold "▶ [8/14] supabase db push  (${MIG_COUNT} migration)"
if confirm "  Applico le migrations sul tuo Supabase?"; then
  supabase db push || { red "  ✗ db push fallito. Risolvi e rilancia."; exit 1; }
  green "  ✓ migrations applicate"
fi

# ─── 9. functions deploy ─────────────────────────────────────
hr; bold "▶ [9/14] supabase functions deploy  (${FUNC_COUNT} functions)"
echo "$FUNC_LIST" | sed 's/^/    • /'
if confirm "  Deploy di TUTTE le edge functions?"; then
  supabase functions deploy --project-ref "${PROJECT_REF}" || { red "  ✗ deploy fallito."; exit 1; }
  green "  ✓ functions deployate"
fi

# ─── 10. DEEPSEEK_API_KEY ────────────────────────────────────
hr; bold "▶ [10/14] DEEPSEEK_API_KEY (server-side secret)"
blue "  Server-only → finisce SOLO nei Supabase Edge Function secrets, MAI nel repo."
blue "  Crea/recupera la tua chiave su: https://platform.deepseek.com/api_keys"
if confirm "  Vuoi impostare DEEPSEEK_API_KEY ora?"; then
  DS_KEY=$(ask_secret "  Incolla DEEPSEEK_API_KEY (sk-...)")
  if [[ -n "$DS_KEY" ]]; then
    supabase secrets set "DEEPSEEK_API_KEY=${DS_KEY}" --project-ref "${PROJECT_REF}" \
      && green "  ✓ DEEPSEEK_API_KEY impostata" \
      || red "  ✗ Errore impostando il secret"
    unset DS_KEY
  else
    yellow "  ⚠ Saltato (chiave vuota)."
  fi
else
  yellow "  ⚠ Saltato. La generazione AI non funzionerà finché non la imposti."
fi

# ─── 11. BRAVE_SEARCH_API_KEY (opzionale) ────────────────────
hr; bold "▶ [11/14] BRAVE_SEARCH_API_KEY (opzionale, market research)"
if confirm "  Vuoi impostare BRAVE_SEARCH_API_KEY?"; then
  BR_KEY=$(ask_secret "  Incolla BRAVE_SEARCH_API_KEY")
  if [[ -n "$BR_KEY" ]]; then
    supabase secrets set "BRAVE_SEARCH_API_KEY=${BR_KEY}" --project-ref "${PROJECT_REF}" \
      && green "  ✓ BRAVE_SEARCH_API_KEY impostata" \
      || red "  ✗ Errore impostando il secret"
    unset BR_KEY
  fi
else
  yellow "  ⚠ Saltato (feature opzionale)."
fi

# ─── 12. Google OAuth (BYOK) ─────────────────────────────────
hr; bold "▶ [12/14] Google OAuth — passi MANUALI (1 volta sola)"
cat <<EOF

  Il Client Secret di Google NON deve mai stare nel repo.
  Vive solo nel pannello Supabase Auth.

  ┌─ Su Google Cloud Console ────────────────────────────────────┐
  │ 1. https://console.cloud.google.com/apis/credentials         │
  │ 2. Crea/modifica un OAuth 2.0 Client ID (tipo: Web)          │
  │ 3. Authorized redirect URI:                                  │
  │    ${PROJECT_URL}/auth/v1/callback   │
  │ 4. Copia Client ID e Client Secret                           │
  └──────────────────────────────────────────────────────────────┘

  ┌─ Su Supabase Dashboard ──────────────────────────────────────┐
  │ 1. https://supabase.com/dashboard/project/${PROJECT_REF}/auth/providers
  │ 2. Google → Enable + incolla Client ID/Secret                │
  │ 3. Authentication → URL Configuration:                       │
  │      Site URL:      http://localhost:8080                    │
  │      Redirect URLs: http://localhost:8080/**                 │
  │                     http://localhost:8080/dashboard          │
  └──────────────────────────────────────────────────────────────┘

EOF
read -r -p "  Premi INVIO quando hai completato (o per saltare)…" _

# ─── 13. Audit: zero referenze al vecchio progetto ───────────
hr; bold "▶ [13/14] Audit: nessun runtime call al vecchio Supabase"
RUNTIME_HITS=$(grep -RIn "$OLD_REF" \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --include='*.json' --include='.env' \
  src/ supabase/functions/ .env 2>/dev/null \
  | grep -v 'node_modules' | grep -v '\.bak\.' || true)

if [[ -z "$RUNTIME_HITS" ]]; then
  green "  ✓ Nessun riferimento runtime a ${OLD_REF}"
else
  red "  ✗ Trovati riferimenti al vecchio progetto:"
  echo "$RUNTIME_HITS"
  yellow "  Controlla questi file prima di andare in produzione."
fi

DOC_HITS=$(grep -RIln "$OLD_REF" --include='*.md' . 2>/dev/null | grep -v node_modules || true)
[[ -n "$DOC_HITS" ]] && yellow "  ℹ Riferimenti in documentazione (innocui): $(echo $DOC_HITS | tr '\n' ' ')"

# ─── 14. npm run dev ─────────────────────────────────────────
hr; bold "▶ [14/14] Avvio app"
green "✓ Setup completato."
echo
bold "Prossimi passi:"
cat <<EOF
  • Verifica ${ENV_FILE} contenga la tua publishable key (e anon JWT se usi sb_publishable_)
  • Verifica login Google end-to-end su http://localhost:8080
  • Genera un libro di prova → conferma DeepSeek funzioni
EOF
echo
if confirm "Avvio 'npm run dev' adesso?"; then
  exec npm run dev
else
  bold "Quando vuoi:  npm run dev"
fi
