# SCRIPTORA — RECUPERO RAPIDO

Se Scriptora si rompe, non toccare l’originale e non lavorare nel backup.

Usare questo progetto:

cd ~/Developer/'Startap scriptora.ac'

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

open -a "Brave Browser" "https://scriptora-scriptora.vercel.app"

## Aprire progetto in VS Code

code ~/Desktop/Scriptora.code-workspace
