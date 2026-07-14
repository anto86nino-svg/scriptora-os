#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if curl --silent --fail --max-time 2 http://127.0.0.1:8081/ \
  | grep --quiet '<title>Scriptora'; then
  echo "Local: http://localhost:8081 (Scriptora è già attiva)"
  exit 0
fi

echo "Avvio Scriptora dalla copia locale..."
exec ./scripts/use-node-22.sh npm run dev
