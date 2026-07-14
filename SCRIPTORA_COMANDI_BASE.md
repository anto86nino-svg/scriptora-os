# SCRIPTORA — COMANDI BASE

## Entrare nel progetto reale

cd ~/Developer/'Startap scriptora.ac'

## Controllare dove sei

pwd
git branch --show-current
git status --short

## Avviare locale

./scripts/dev-local.sh

## Build produzione

npm run build

## Deploy produzione

vercel --prod

## Aprire app live in Brave

open -a "Brave Browser" "https://scriptora-scriptora.vercel.app"

## Vedere ultimi commit

git log --oneline -10

## Vedere tag stabili

git tag --list "safe-*"

## Salvare nuova versione stabile dopo test vero

git tag -a safe-NOME-VERSIONE-YYYY-MM-DD -m "Descrizione versione stabile"
