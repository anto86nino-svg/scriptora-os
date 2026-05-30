# SCRIPTORA — RECUPERO RAPIDO

**Progetto attuale su questo Mac:**

```
/Users/antoninocampanella/Desktop/Startap scriptora.ac
```

## Avvio locale

```bash
cd "/Users/antoninocampanella/Desktop/Startap scriptora.ac"
npm run dev
```

App: **http://localhost:8081** (porta fissa in `vite.config.ts`)

## Controllo stato

```bash
git status --short
git branch --show-current
npm run typecheck
npm run smoke:generation
```

## Env Supabase (obbligatorio)

File: `.env` e `.env.local` — **devono avere chiavi valide**.

- `VITE_SUPABASE_URL` → `https://pwdcqnrclhetgxiqnjtr.supabase.co`
- `VITE_SUPABASE_ANON_KEY` → JWT che inizia con `eyJ...`
- `VITE_SUPABASE_PUBLISHABLE_KEY` → può essere `sb_publishable_...` **solo se** `VITE_SUPABASE_ANON_KEY` è la JWT anon

**Errore tipico:** `.env.local` con valori corrotti (`cd ~/Desktop...`, `$KEY`) → schermata *Configurazione mancante*.  
Dopo ogni fix env: **riavviare** `npm run dev`.

## DeepSeek / generazione AI

Secret server-side (Supabase, non in `.env`):

```bash
supabase secrets set DEEPSEEK_API_KEY="sk-..." --project-ref pwdcqnrclhetgxiqnjtr
```

Verifica rapida:

```bash
npm run smoke:generation
```

Deve terminare con: `✓ DeepSeek generation pipeline OK`

## Stato verificato — 30 maggio 2026

| Area | Esito |
|------|--------|
| Avvio app | OK (`localhost:8081`) |
| Env Supabase | OK (anon JWT) |
| Blueprint AI | OK |
| Capitoli AI | OK (test UI: ~3.400 parole cap. 1) |
| Typecheck | OK |
| Test critici (auth, config, calibration) | OK |

Flusso testato in app: **Nuovo libro → blueprint → Genera capitolo 1**.

## Dev Mode (senza login)

In DevTools console, oppure sessione:

```javascript
sessionStorage.setItem('nexora_dev_mode', '1');
localStorage.setItem('nexora_consent_v1', JSON.stringify({
  privacy: true, terms: true, age: true,
  ts: new Date().toISOString(), version: '1.1.0'
}));
location.reload();
```

## Progetto legacy (altro path)

Documentazione storica in `SCRIPTORA_PROGETTO_REALE_LEGGIMI.md` punta a:

`~/Desktop/SCRIPTORA_WORKSPACE/01_LAVORO_scriptora-dev-lab`

Usare **questo** folder (`Startap scriptora.ac`) per lo sviluppo corrente su Cursor.

## Aprire app live (se deployata)

```bash
open -a "Brave Browser" "https://nexora-scriptora.vercel.app"
```
