# SCRIPTORA — COMANDI BASE

## Entrare nel progetto reale

cd ~/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab

## Controllare dove sei

pwd
git branch --show-current
git status --short

## Avviare locale

npm run dev

## Build produzione

npm run build

## Deploy produzione

vercel --prod

## Aprire app live in Brave

open -a "Brave Browser" "https://nexora-scriptora.vercel.app"

## Vedere ultimi commit

git log --oneline -10

## Vedere tag stabili

git tag --list "safe-*"

## Salvare nuova versione stabile dopo test vero

git tag -a safe-NOME-VERSIONE-YYYY-MM-DD -m "Descrizione versione stabile"
