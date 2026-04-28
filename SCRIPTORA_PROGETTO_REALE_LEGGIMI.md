# SCRIPTORA — PROGETTO REALE ATTUALE

Questo è il progetto reale su cui lavorare:

/Users/antoninocampanella/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab

NON lavorare sui backup per modifiche nuove.

Backup da non usare come progetto principale:
- /Users/antoninocampanella/Desktop/SCRIPTORA_WORKSPACE/03_BACKUP_scriptora-after-character-studio-20260425-161702
- /Users/antoninocampanella/Desktop/SCRIPTORA_WORKSPACE/00_ORIGINALE_SALVO_indie-author-studio-main

## Versione stabile salvata

Tag stabile attuale:

safe-free-limit-stable-2026-04-28

Commit stabile:

30dbf7c Remove duplicate global React mounts

## Cosa contiene questa versione stabile

- Limite Free reale a 10.000 parole.
- Blocco UI dopo il primo libro Free.
- Fix errore React hooks.
- Rimozione mount globali duplicati da main.tsx.
- Build passata.
- Deploy Vercel riuscito.
- App live: https://nexora-scriptora.vercel.app

## Regola d’oro

Prima di ogni modifica:

1. Entrare sempre qui:
   cd ~/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab

2. Controllare:
   pwd
   git branch --show-current
   git status --short

3. Creare una branch dedicata.

4. Fare build:
   npm run build

5. Solo se il build passa:
   git add .
   git commit -m "Messaggio chiaro"

6. Solo dopo:
   vercel --prod

Se qualcosa si rompe, tornare al tag stabile.
