#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if [[ ! -d ios/App/App.xcodeproj ]]; then
  echo "Il progetto iOS non esiste. Esegui: ./scripts/use-node-22.sh npx cap add ios" >&2
  exit 1
fi

echo "[1/4] Build web di Scriptora"
./scripts/use-node-22.sh npm run build

echo "[2/4] Sincronizzazione Capacitor iOS"
./scripts/use-node-22.sh npx cap sync ios

echo "[3/4] Icona e splash Scriptora"
swift ./scripts/generate-ios-assets.swift "$project_root"

echo "[4/4] Verifica degli output"
test -f dist/index.html
test -f ios/App/App/public/index.html
test -f ios/App/App.xcodeproj/project.pbxproj
test -f ios/App/CapApp-SPM/Package.swift

echo "Sincronizzazione iOS completata."
