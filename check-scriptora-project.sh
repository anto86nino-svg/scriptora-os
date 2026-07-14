#!/usr/bin/env bash
set -euo pipefail

REAL_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
CURRENT_PATH="$(pwd -P)"
REAL_PATH_PHYSICAL="$(cd -- "$REAL_PATH" && pwd -P)"

echo "=== SCRIPTORA PROJECT CHECK ==="
echo "Percorso attuale:"
echo "$CURRENT_PATH"
echo ""

if [ "$CURRENT_PATH" != "$REAL_PATH_PHYSICAL" ]; then
  echo "⚠️ ATTENZIONE: esegui questo controllo dalla root del progetto."
  echo ""
  echo "Vai qui:"
  printf 'cd %q\n' "$REAL_PATH"
  exit 1
fi

echo "✅ Sei nel progetto reale corretto."
echo "Node: $(node --version 2>/dev/null || echo 'non trovato')"
echo "npm:  $(npm --version 2>/dev/null || echo 'non trovato')"
echo ""
echo "Branch:"
git branch --show-current
echo ""
echo "Status:"
git status --short
echo ""
echo "Ultimi commit:"
git log --oneline -5
echo ""
echo "Tag stabili:"
git tag --list "safe-*"
