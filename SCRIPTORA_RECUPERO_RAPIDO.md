# SCRIPTORA — RECUPERO RAPIDO

Se Scriptora si rompe, non toccare l’originale e non lavorare nel backup.

Usare questo progetto:

cd ~/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab

## Controllo stato

git status --short
git branch --show-current
git log --oneline -8

## Tornare alla versione stabile salvata

ATTENZIONE: questo cancella le modifiche non committate.

git reset --hard safe-free-limit-stable-2026-04-28
git clean -fd

Poi test:

npm run build
vercel --prod

## Aprire app live

open -a "Brave Browser" "https://nexora-scriptora.vercel.app"

## Aprire progetto in VS Code

code ~/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab
