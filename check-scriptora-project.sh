#!/bin/bash

REAL_PATH="$HOME/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab"
CURRENT_PATH="$(pwd)"

echo "=== SCRIPTORA PROJECT CHECK ==="
echo "Percorso attuale:"
echo "$CURRENT_PATH"
echo ""

if [ "$CURRENT_PATH" != "$REAL_PATH" ]; then
  echo "⚠️ ATTENZIONE: NON sei nel progetto reale."
  echo ""
  echo "Vai qui:"
  echo "cd $REAL_PATH"
  exit 1
fi

echo "✅ Sei nel progetto reale corretto."
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
