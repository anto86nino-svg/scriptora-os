#!/usr/bin/env bash
set -euo pipefail

if [[ -d /opt/homebrew/opt/node@22/bin ]]; then
  export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js non trovato. Installa Node 22 e riprova." >&2
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(`.`)[0]')"
if (( node_major < 22 )); then
  echo "Scriptora richiede Node 22 o successivo; trovato $(node --version)." >&2
  echo "Esegui 'nvm use 22' oppure installa 'brew install node@22'." >&2
  exit 1
fi

exec "$@"
