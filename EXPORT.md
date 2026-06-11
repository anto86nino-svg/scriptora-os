# Esportazione su GitHub & Distribuzione

Guida per esportare SCRIPTORA su GitHub, scaricare il codice e distribuire l'app installabile dal browser.

## 1. Esportare su GitHub (da Lovable)

1. In Lovable apri **Connectors → GitHub → Connect project**
2. Autorizza la GitHub App
3. Scegli account/organizzazione
4. Clicca **Create Repository**

Il sync è bidirezionale: ogni modifica fatta in Lovable o in locale si propaga.

## 2. Scaricare il codice in locale

```bash
git clone https://github.com/<tuo-utente>/<tuo-repo>.git
cd <tuo-repo>
npm install
```

## 3. Configurare le variabili d'ambiente

Crea `.env` partendo da `.env.example`:

```env
VITE_SUPABASE_URL=https://abdvbytjxglwcmfsixgr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<la-tua-anon-key>
VITE_SUPABASE_PROJECT_ID=abdvbytjxglwcmfsixgr
```

Le chiavi sono già nel `.env` del progetto Lovable — copiale così come sono.

## 4. Sviluppo locale

```bash
npm run dev    # http://localhost:8080
npm run build  # build di produzione → cartella dist/
```

## 5. Distribuire l'app installabile dal browser (PWA)

L'app è già configurata come **installabile**:
- `public/manifest.webmanifest` — definisce nome, icone, colori
- `public/icon-192.png`, `public/icon-512.png` — icone Home Screen
- Pagina `/install` — guida l'utente all'installazione

### Hosting consigliati (gratis, deploy in 1 click)

- **Vercel** → `vercel deploy`
- **Netlify** → drag & drop della cartella `dist/` o `netlify deploy --prod`
- **Cloudflare Pages** → connetti il repo GitHub
- **GitHub Pages** → richiede base path personalizzato

### Come l'utente installa l'app

Dopo il deploy, condividi il link al sito. Gli utenti aprono il link e:
- **Android / Chrome / Edge** → menu ⋮ → "Installa app"
- **iPhone / Safari** → tasto Condividi → "Aggiungi a Home"
- **Desktop Chrome / Edge** → icona ⊕ nella barra indirizzi

L'app si installa come icona sulla Home, si apre senza barra del browser, e funziona come una vera app nativa.

## 6. Cosa è stato pulito per l'esportazione

- ✅ Meta tag `og:image` e `twitter:site` non puntano più a `lovable.dev`
- ✅ Manifest PWA + icone create
- ✅ Pagina `/install` con istruzioni iOS / Android / Desktop
- ✅ Apple touch icons e theme-color configurati
- ⚠️ `lovable-tagger` resta in `vite.config.ts` ma è dev-only (non finisce nel build)
- ⚠️ `@lovable.dev/cloud-auth-js` gestisce il login Google — funziona anche fuori da Lovable

## 7. Branding 100% indipendente (opzionale)

Se vuoi rimuovere ogni riferimento a Lovable:
1. **Google OAuth** → crea credenziali tue su Google Cloud Console e inseriscile in Lovable Cloud → Auth Settings → Google (sostituisce "Continua su lovable.app" con "Continua su Scriptora")
2. **lovable-tagger** → rimuovilo da `vite.config.ts` e `package.json` (perderai gli indicatori dev di Lovable, niente effetto in produzione)
