# SCRIPTORA — COMANDI BASE

## Entrare nel progetto

```bash
cd "/Users/antoninocampanella/Desktop/Startap scriptora.ac"
```

## Controllare dove sei

```bash
pwd
git branch --show-current
git status --short
```

## Avviare locale

```bash
npm run dev
```

→ **http://localhost:8081**

## Verificare generazione AI (DeepSeek)

```bash
npm run smoke:generation
```

## Build e qualità

```bash
npm run typecheck
npm run test
npm run build
```

## Deploy produzione

```bash
vercel --prod
```

## Supabase secrets (solo server)

```bash
supabase secrets set DEEPSEEK_API_KEY="sk-..." --project-ref pwdcqnrclhetgxiqnjtr
supabase secrets list --project-ref pwdcqnrclhetgxiqnjtr
```

## Aprire app live in Brave

```bash
open -a "Brave Browser" "https://nexora-scriptora.vercel.app"
```

## Git utili

```bash
git log --oneline -10
git tag --list "safe-*"
```

## Salvare versione stabile (dopo test)

```bash
git tag -a safe-NOME-VERSIONE-YYYY-MM-DD -m "Descrizione versione stabile"
```
