# Scriptora — Setup Post-Export (One Command)

Dopo aver clonato il repo da GitHub:

```bash
git clone <your-repo-url> scriptora
cd scriptora
chmod +x setup.sh
./setup.sh
```

Lo script ti chiederà al momento giusto:
1. **Supabase publishable key** (anon, pubblica) → finisce in `.env`
2. **DEEPSEEK_API_KEY** → finisce nei Supabase Edge Function secrets
3. **BRAVE_SEARCH_API_KEY** (opzionale) → idem
4. **Google OAuth** → ti stampa le istruzioni per configurare Client ID/Secret nel pannello Supabase (mai nel repo)

---

## Cosa fa `setup.sh` (14 step)

| # | Step | Cosa scrive / modifica |
|---|------|------------------------|
| 1 | Crea `.env` | `VITE_SUPABASE_*` (publishable key chiesta interattivamente) |
| 2 | Riscrive `src/integrations/supabase/client.ts` | usa solo `import.meta.env`, niente hardcoded |
| 3 | Aggiorna `supabase/config.toml` | `project_id = "lesxmntzrwjaooacvpko"` |
| 4 | `npm install` | — |
| 5 | Verifica Supabase CLI | ti guida all'install se manca |
| 6 | `supabase login` | apre il browser se serve |
| 7 | `supabase link --project-ref lesxmntzrwjaooacvpko` | conferma richiesta |
| 8 | `supabase db push` | applica tutte le migrations |
| 9 | `supabase functions deploy` | deploya tutte le 18 Edge Functions |
| 10 | Chiede **DEEPSEEK_API_KEY** | `supabase secrets set DEEPSEEK_API_KEY=...` |
| 11 | Chiede **BRAVE_SEARCH_API_KEY** (opzionale) | `supabase secrets set BRAVE_SEARCH_API_KEY=...` |
| 12 | Stampa istruzioni Google OAuth | passi manuali (Client Secret mai nel repo) |
| 13 | Audit anti-regressione | verifica zero referenze runtime al vecchio progetto `abdvbytjxglwcmfsixgr` |
| 14 | Avvia `npm run dev` | (su conferma) |

Lo script è **idempotente**: puoi rilanciarlo. Crea backup `.bak.<timestamp>` prima di toccare file.

---

## Edge Functions deployate (22)

```
activate-beta            generate-blueprint-fast   market-validator
ai-usage-summary         generate-scene-image      patch-chapter
analyze-chapter          generate-book             publish-tools
auto-bestseller-engine   genre-coach               scriptora-character-bible
bestseller-radar         go-no-go-engine           scriptora-novel-idea
detect-book-intent       kdp-money-engine          title-autofill
dominate-chapter         live-coach                title-intelligence
fix-section
```

---

## Regole di sicurezza rispettate

✅ **Frontend (`.env`, repo)**: solo la Supabase publishable key (anon, pubblica per design)
✅ **Supabase Edge Function secrets**: `DEEPSEEK_API_KEY`, `BRAVE_SEARCH_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
✅ **Supabase Auth dashboard**: Google Client ID + Client Secret
❌ **Mai nel repo / .env / frontend**: DeepSeek key, Brave key, Google secret, service_role

---

## Google OAuth — passi manuali (1 volta sola)

### Su [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
1. **Create Credentials → OAuth 2.0 Client ID** (Application type: Web)
2. **Authorized redirect URIs**:
   ```
   https://lesxmntzrwjaooacvpko.supabase.co/auth/v1/callback
   ```
3. Copia **Client ID** e **Client Secret**

### Su [Supabase Dashboard](https://supabase.com/dashboard/project/lesxmntzrwjaooacvpko/auth/providers)
1. **Authentication → Providers → Google**: enable + incolla Client ID/Secret
2. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:8080`
   - Redirect URLs:
     - `http://localhost:8080/**`
     - `http://localhost:8080/dashboard`

---

## Verifica finale

Dopo `npm run dev`:

- [ ] L'app apre su `http://localhost:8080`
- [ ] Login Google funziona end-to-end
- [ ] Utente compare in **Supabase → Authentication → Users**
- [ ] Profilo creato in `public.profiles` (trigger `handle_new_user`)
- [ ] Generazione AI con DeepSeek funziona (prova un libro)
- [ ] DevTools → Network: nessuna chiamata al vecchio host `abdvbytjxglwcmfsixgr.supabase.co`

---

## Troubleshooting

**`Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env`**
→ apri `.env`, controlla che `VITE_SUPABASE_PUBLISHABLE_KEY` sia valorizzata (non `INSERIRE_CHIAVE_PUBBLICABILE`).

**`Unsupported provider: missing OAuth secret`**
→ devi completare la configurazione Google OAuth nel pannello Supabase Auth (step 12).

**Generazione AI fallisce con 401 / "missing key"**
→ rilancia `./setup.sh` e impostala allo step 10, oppure manualmente:
```bash
supabase secrets set DEEPSEEK_API_KEY=sk-... --project-ref lesxmntzrwjaooacvpko
```

**Vuoi rigenerare i tipi TypeScript del DB:**
```bash
supabase gen types typescript --project-id lesxmntzrwjaooacvpko > src/integrations/supabase/types.ts
```
