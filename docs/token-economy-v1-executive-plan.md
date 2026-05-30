# Scriptora Token Economy V1 — Executive Implementation Plan

**Version:** 1.0 · **Date:** 2026-05-29  
**Status:** Business architecture only — no code, no DB, no UI  
**Mission:** Trasformare Scriptora da AI Writer a ecosistema editoriale premium monetizzabile tramite valuta interna ad alto valore percepito.

---

## Executive Summary

Scriptora oggi monetizza **limiti opachi** (10k token API/libro, parole, export) con piani Pro €29,99 / Premium €59,99 e **nessun pagamento live** (`VITE_ENABLE_PAYMENTS=false`). Il metering è **frontend-first**; la maggior parte delle edge function **non verifica il piano server-side**.

La Token Economy V1 introduce una **valuta di prodotto** (Scriptora Token, ST) che misura **operazioni editoriali premium**, non parole o caratteri. Obiettivo: aumentare ARPU, proteggere margini su operazioni costose (Dominate, Auto-Bestseller, patch batch), e aprire un **percorso Editor-Only** per autori con manoscritto già scritto.

**Principio di sostenibilità:** 1 ST deve avere un costo API target ≤ 15–25% del valore di vendita al cliente (pack o allocazione mensile).

---

# FASE 1 — AUDIT COMPLETO

## 1.1 Metodologia costi

**Fonte prezzi API:** `supabase/functions/_shared/ai-tracking.ts` (DeepSeek V4 Flash, agg. 2026-05-20)

| Voce | USD / 1M token |
|------|----------------|
| Input (cache miss) | $0.14 |
| Input (cache hit) | $0.0028 |
| Output | $0.28 |

**Assunzioni audit:** mix realistico 70% cache miss input, 30% output-heavy; EUR/USD ≈ 0.92.  
**Non-AI:** FAL scene image ≈ $0.003/img; Brave grounding (Keyword Gold, Radar) ≈ $0.001–0.01/query (non tracciato oggi in `ai_usage_logs`).

## 1.2 Classificazione funzionalità

### ALTO COSTO (costo API > €0.02/op o moltiplicatore ×N)

| Funzione | File / Edge | Costo API stimato | Frequenza | Valore percepito | Margine attuale* |
|----------|-------------|-------------------|-----------|------------------|------------------|
| Generazione capitolo (Pro, multi-pass) | `generation.ts` → `generate-book` | €0.008–0.035/cap | **Molto alta** | Alto | Basso su Premium unlimited |
| Generazione capitolo (Dominate) | `dominate-chapter` | €0.04–0.12/cap | Bassa | Molto alto | Negativo se abusato |
| Generazione libro completo | N × chapter + blueprint | €0.15–0.80/libro | Media | Molto alto | Rischio su flat unlimited |
| Auto-Bestseller (streaming) | `auto-bestseller-engine` | €0.40–1.50/libro | Bassa | Molto alto | Non gated oggi |
| Story Doctor / Manuscript Lab | `ManuscriptAnalyzerDialog` | €0.05–0.25/manoscritto | Media | Molto alto | Pro only, no token cap |
| Dominate Mode (rewrite totale) | `ChapterIntelligencePanel` | €0.04–0.12/cap | Bassa | Premium | Premium flat |
| Patch capitolo (batch surgical) | `patch-chapter` | €0.02–0.08/run | Media | Alto | Pro, no ST cap |
| KDP Money Engine (full) | `kdp-money-engine` 8k | €0.015–0.06/run | Media | Alto | Pro/Premium route |
| Adaptive rewrite (heavy) | `adaptive-rewrite-engine` | €0.01–0.04/cap | Media | Medio-alto | Invisibile, no cap |

### MEDIO COSTO (€0.005–0.02/op)

| Funzione | File / Edge | Costo API | Frequenza | Valore percepito | Margine attuale* |
|----------|-------------|-----------|-----------|------------------|------------------|
| Diagnostica capitolo | `analyze-chapter` ~4k | €0.006–0.018 | Alta | Alto | Pro; blocco Free post-testo |
| Cover Studio (AI intel) | `CoverGenerator` + money-engine | €0.008–0.025 | Media | Alto | Pro feature flag |
| Market Analysis (KDP Launch) | `KdpLaunchPage` | €0.012–0.04 | Media | Alto | Pro route |
| Rewrite capitolo (light/smart) | `generation.ts` rewrite | €0.008–0.025 | Media | Medio-alto | Token book cap |
| Narrative / Genre Coach | `genre-coach` ~3k | €0.005–0.015 | Bassa | Medio | Aperto |
| Bestseller Radar click | `bestseller-radar` + Brave | €0.01–0.03/click | Bassa | Alto | €0.50 logged Pro+ |
| Blueprint generation | `generate-blueprint-fast` | €0.008–0.02 | Alta | Medio | In bundle gen |
| Scene image (FAL) | `generate-scene-image` | €0.003/img | Media | Medio | 300–1200/mo unenforced |
| Character Bible | `scriptora-*` edges | €0.004–0.012 | Bassa | Medio | Pro engine |
| Publish tools / packaging | `publish-tools` | €0.01–0.04 | Bassa | Medio | Export gated |

### BASSO COSTO (< €0.005/op)

| Funzione | File / Edge | Costo API | Frequenza | Valore percepito | Margine attuale* |
|----------|-------------|-----------|-----------|------------------|------------------|
| Title Intelligence | `title-intelligence` ~6k | €0.003–0.008 | Media | Medio-alto | Pro |
| Subtitle / blurb (KDP packaging subset) | `kdp-money-engine` | €0.003–0.008 | Media | Medio | Pro |
| Keyword Analysis (light) | `keyword-gold` partial | €0.004–0.01 | Bassa | Medio | Pro |
| Category Intelligence | client + light LLM | €0.002–0.006 | Bassa | Medio | Pro |
| Book intent / title autofill | `detect-book-intent` | €0.001–0.003 | Per nuovo libro | Basso | Free con cap |
| Molly chat | `molly-chat` ~120 tok | < €0.001 | Sporadica | Basso | Aperto |
| Market premium scores (heuristic) | `market-intelligence-premium` | €0 | On read | Medio | Gratis oggi |
| Voice Studio / TTS | `VoiceStudioDialog` | €0 (browser) | Media | Alto percepito | Pro, costo zero |

\*Margine attuale = ricavo piano flat − COGS API stimato; degrada con power user su Premium unlimited.

## 1.3 Gap architetturali rilevanti per Token Economy

| Gap | Impatto business |
|-----|------------------|
| Doppio sistema limiti (`plan.ts` token/libro vs `subscription.ts` parole/libro) | Confusione UX; difficile pricing |
| Edge functions senza gate piano | Abuso API, margini a zero |
| `liveResearchQueriesPerMonth`, `exportsPerMonth` definiti ma non enforced | Perdita revenue KDP/Radar |
| Auto-Bestseller senza route gate | Costo illimitato |
| Pagamenti dormienti | Zero ARPU reale oggi |
| Token = token API DeepSeek oggi | Percezione “contatore tecnico”, non servizio editoriale |

---

# FASE 2 — TOKEN ECONOMY (Scriptora Token — ST)

## 2.1 Definizione

**1 ST = 1 unità di valore editoriale**, non 1 token LLM.  
Ogni operazione consuma ST in base a: (a) costo API normalizzato, (b) moltiplicatore qualità (Dominate, multi-pass), (c) valore percepito sul mercato editoriale freelance.

**Formula calibrazione:**

```
ST = ceil( (Costo_API_EUR × 1.15 buffer) / Valore_ST_target )
Valore_ST_target ≈ €0.06–0.08 (allineato ad AUTHOR PACK)
```

## 2.2 Tabella operazioni (V1 proposta — da ricalibrare su dati `ai_usage_logs` reali)

### GENERAZIONE

| Operazione | ST V1 | Costo API target | Valore ST @ €0.07 | Margine lordo API |
|------------|-------|------------------|-------------------|-------------------|
| Genera capitolo (standard) | **3** | €0.012 | €0.21 | ~94% |
| Espandi capitolo | **2** | €0.008 | €0.14 | ~94% |
| Genera sottocapitolo / sezione | **1** | €0.004 | €0.07 | ~94% |
| Continua scrittura | **1** | €0.003 | €0.07 | ~96% |
| Genera blueprint | **4** | €0.015 | €0.28 | ~95% |
| **Genera libro completo** | **55–75** | €0.35–0.55 | €3.85–5.25 | ~88–91% |

*Libro completo = blueprint(4) + 18 cap × 3(54) + front/back(4) ≈ 62 ST; aggiungere +10 ST buffer Dominate/adaptive.*

### EDITORIAL INTELLIGENCE

| Operazione | ST V1 | Costo API | Margine |
|------------|-------|-----------|---------|
| Diagnostica capitolo | **1** | €0.008 | ~89% |
| Diagnostica libro (manoscritto) | **8** | €0.06 | ~89% |
| Narrative Analysis | **3** | €0.018 | ~91% |
| Story Doctor (full manuscript) | **5** | €0.035 | ~90% |

### SURGICAL EDITING

| Operazione | ST V1 | Costo API | Margine |
|------------|-------|-----------|---------|
| Fix Capitolo (patch batch) | **2** | €0.015 | ~89% |
| Dialogue Doctor | **1** | €0.006 | ~91% |
| Subtext Doctor | **1** | €0.006 | ~91% |
| Pacing Doctor | **1** | €0.006 | ~91% |
| Humanization Pass | **2** | €0.012 | ~91% |
| Dominate Mode (rewrite totale) | **8** | €0.07 | ~88% |

### MARKET INTELLIGENCE

| Operazione | ST V1 | Costo API+Brave | Margine |
|------------|-------|-----------------|---------|
| Market Analysis (launch) | **3** | €0.025 | ~88% |
| BookTok Score | **2** | €0.012 | ~91% |
| Keyword Intelligence | **2** | €0.015 | ~89% |
| Category Intelligence | **2** | €0.010 | ~93% |
| Bestseller Radar (deep click) | **3** | €0.020 | ~90% |

### COVER STUDIO

| Operazione | ST V1 | Costo API | Margine |
|------------|-------|-----------|---------|
| Genera Cover (template+AI intel) | **2** | €0.012 | ~91% |
| Varianti Cover | **1** | €0.005 | ~93% |
| Cover Intelligence | **1** | €0.006 | ~91% |
| Scene image (Studio Live) | **1** | €0.003 FAL | ~96% |

### KDP TOOLS

| Operazione | ST V1 | Costo API | Margine |
|------------|-------|-----------|---------|
| Title Intelligence | **1** | €0.005 | ~93% |
| Subtitle Intelligence | **1** | €0.004 | ~94% |
| Blurb Intelligence | **1** | €0.005 | ~93% |
| Metadata Intelligence (bundle) | **1** | €0.006 | ~91% |
| Title Domination (Premium) | **4** | €0.030 | ~89% |

## 2.3 Regole trasversali ST

- **Preview gratuito:** diagnostica base (score only, no patch plan) = 0 ST, 1×/libro Free.
- **Idempotenza:** retry entro 5 min stessa operazione = 0 ST aggiuntivi (hash request).
- **Rollback:** se edge fallisce (5xx), ST non consumati.
- **Visibilità:** prima di ogni operazione ≥1 ST, mostrare costo ST + equivalente “servizio editoriale” (es. “Revisione strutturale capitolo — 1 ST”).

---

# FASE 3 — NUOVA STRUTTURA PIANI

## 3.1 Confronto vs oggi

| | Oggi Pro | V1 Pro | Oggi Premium | V1 Premium |
|--|----------|--------|--------------|------------|
| Prezzo | €29,99 | **€19,90** | €59,99 | **€39,90** |
| Libri | 10/mo | 10 attivi | Unlimited | Unlimited (fair use) |
| AI cap | Unlimited API tok | **300 ST/mo** | Unlimited | **1000 ST/mo** |
| Posizionamento | Writer | Writer + Editor | Power user | Author pro |

**Rationale prezzo più basso:** lo ST cap protegge COGS; il prezzo d’ingresso più basso aumenta conversione; upsell via token packs.

## 3.2 Piani V1

### FREE — €0

| Include | Dettaglio |
|---------|-----------|
| Libri | 1 attivo |
| ST | **20 iniziali** (one-time, non rollover) |
| Accesso | Writer base (fast mode), export no |
| Editoriale | Diagnostica base 0 ST (limitata), no patch/Dominate |
| Obiettivo | Activation + percezione valore → conversion Pro |

**COGS worst case:** 20 ST × €0.012 avg = **€0.24** — accettabile CAC product-led.

### PRO — €19,90/mese

| Include | Dettaglio |
|---------|-----------|
| Libri | Fino a 10 attivi |
| ST | **300/mese** (no rollover mese 1; rollover 20% mesi 2+ opzionale fase 2) |
| Writer OS | Completo (smart/pro modes) |
| Editorial Intelligence | Diagnostica, Story Doctor, Surgical (consumo ST) |
| Export | EPUB/PDF/DOCX |
| KDP base | Market tools (consumo ST) |
| Valore ST incluso | 300 × €0.07 = **€21** valore nominale → percezione “più del prezzo” |

**COGS se 100% utilizzo:** 300 ST × €0.012 ≈ **€3.60** → margine lordo API **~82%** prima infra/support.

### PREMIUM — €39,90/mese

| Include | Dettaglio |
|---------|-----------|
| Libri | Illimitati (fair use: max 25 attivi, 5 nuovi/mese) |
| ST | **1000/mese** |
| Priorità | Queue priority + reasoner per Dominate |
| Strumenti | Title Domination, success prediction, advanced market |
| Scene images | 1200/mo (1 ST/img oltre quota inclusa 100) |

**COGS 100% utilizzo:** ≈ **€12** → margine lordo API **~70%**.

### STUDIO — €79,90/mese

| Include | Dettaglio |
|---------|-----------|
| Target | Autori professionali, ghostwriter, piccoli editori |
| ST | **2500/mese** |
| Priorità | Massima (dedicated queue tier) |
| Fair use | 50 libri attivi, export illimitato |
| Support | Priority email (48h) |
| Multi-seat | Roadmap fase 3 (2 seat inclusi) |

**COGS 100% utilizzo:** ≈ **€30** → margine lordo API **~62%** — ancora sano con pack upsell.

## 3.3 Beta migration

- Beta attuali → **Pro founder** 6 mesi a €14,90 + 400 ST/mo.
- Deprecare tier `beta` in `plan.ts`; mappare a Pro in `subscription.ts`.

---

# FASE 4 — TOKEN PACKS

## 4.1 Pack pricing

| Pack | Prezzo | ST | €/ST | Sconto vs STARTER |
|------|--------|-----|------|-------------------|
| STARTER | €4,99 | 50 | €0.100 | — |
| CREATOR | €9,99 | 120 | €0.083 | 17% |
| AUTHOR | €19,99 | 300 | €0.067 | 33% |
| PUBLISHER | €49,99 | 900 | €0.056 | 44% |

## 4.2 Margini e sostenibilità

**Assunzione COGS medio:** €0.012/ST (mix operazioni).

| Pack | Revenue | COGS max (100% use) | Margine lordo API | Note |
|------|---------|---------------------|-------------------|------|
| STARTER | €4,99 | €0.60 | **88%** | Impulse buy post-free |
| CREATOR | €9,99 | €1.44 | **86%** | Sweet spot creator economy |
| AUTHOR | €19,99 | €3.60 | **82%** | Parity con Pro monthly ST |
| PUBLISHER | €49,99 | €10.80 | **78%** | Power users, launch weeks |

**Break-even infrastruttura:** a ~500 utenti paganti, COGS API totale stimato €800–1500/mo vs MRR €10k+ → sostenibile.

**Regole pack:**
- ST pack **non scadono** (12 mesi inattività → email warning, 24 mesi → forfeiture opzionale legale).
- Pack **stackable** con allocazione mensile piano (consumo: monthly first, poi pack FIFO).
- No pack su Free (solo upgrade) — evita farm account.

---

# FASE 5 — PERCORSO AUTORI SENZA AI WRITING

## 5.1 Persona: “Editor-Only Author”

**Caso:** Manoscritto già scritto (60k–100k parole), zero interesse a generare testo AI.  
**Obiettivo prodotto:** Entrare, importare/sync manoscritto, usare solo intelligence editoriale + market + KDP.

## 5.2 Journey dedicato: “Manuscript Studio”

```
Landing → "Ho già un libro" 
  → Import (EPUB/DOCX paste) o apri progetto vuoto + incolla
  → Onboarding 3 step (no generation prompts)
  → Dashboard "Editorial Command Center"
  → CTA primarie: Diagnostica libro (8 ST) | Story Doctor (5 ST) | Market Readiness (3 ST)
```

## 5.3 Bundle consigliati (pack marketing, non codice)

| Bundle | ST | Prezzo suggerito | Operazioni tipiche |
|--------|-----|------------------|-------------------|
| **Manuscript Checkup** | 15 | €9,99 | Diagnostica libro + 3 cap diagnostic + Story Doctor light |
| **Launch Ready** | 35 | €19,99 | Story Doctor + Market + KDP metadata + Blurb |
| **Surgical Polish** | 40 | €24,99 | 10× Fix Capitolo + Humanization + Pacing |

## 5.4 Free tier per Editor-Only

- Permettere **1× Diagnostica libro** (8 ST) se account verificato (email + captcha).
- Nessuna generazione capitolo in UI default (nascondere CTA “Genera”, non rimuovere engine).
- Upgrade path: AUTHOR PACK → Pro se pubblicano serialmente.

## 5.5 Metriche successo percorso

- % utenti Editor-Only che completano Diagnostica libro entro 7 giorni
- ARPU Editor-Only vs Writer (target: ARPU ≥ 70% Writer entro 90 giorni)
- ST consumati in Surgical/Market vs Generation (target Editor-Only: ≥80% non-generation)

---

# FASE 6 — ANTI ABUSE STRATEGY

## 6.1 Fair use (piano)

| Piano | Limite soft | Limite hard |
|-------|-------------|-------------|
| Free | 20 ST lifetime | 5 ST/giorno max |
| Pro | 300 ST/mo | 50 ST/giorno, 150 ST/settimana |
| Premium | 1000 ST/mo | 100 ST/giorno, 400 ST/settimana |
| Studio | 2500 ST/mo | 200 ST/giorno, 1000 ST/settimana |

## 6.2 Rate limits tecnici (implementazione futura)

| Layer | Controllo |
|-------|-----------|
| Edge function | JWT + `user_id` + piano + ST balance server-side |
| Per operazione | Max 10 analyze/min, 3 dominate/hour, 1 auto-bestseller/day |
| IP | 100 req/h anon, 500 auth |
| Device fingerprint | Max 3 account Free / device / 90 giorni |

## 6.3 Protezione automazioni

- **Honeypot:** endpoint decoy generation → ban account.
- **Pattern detection:** >20 capitoli identici structure in 1h → throttle.
- **Auto-Bestseller:** Studio+ only OR 75 ST upfront + 1/day.
- **Scraping:** API key rotation, no bulk export market data, Brave rate limit per user.

## 6.4 Multi-account / farm

- Free ST one-time legati a `user_id` + payment method fingerprint su pack purchase.
- Beta codes: single-use, audit trail (già parziale in `activate-beta`).

## 6.5 Dominate / reasoner abuse

- Dominate = 8 ST + max 5/giorno Premium, 15/giorno Studio.
- Reasoner model solo se ST ≥ costo e piano ≥ Premium.

---

# FASE 7 — OUTPUT FINALE

## 7.1 Revenue Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SCRIPTORA REVENUE STACK                   │
├─────────────────────────────────────────────────────────────┤
│  L1  Recurring (MRR)     Pro / Premium / Studio subscriptions│
│  L2  Transactional (ST)  Token Packs (margin 78–88%)        │
│  L3  Bundles (future)    Manuscript Checkup, Launch Ready    │
│  L4  Enterprise (future) Studio multi-seat, API B2B         │
└─────────────────────────────────────────────────────────────┘
```

**Target MRR mix (12 mesi):** 70% subscription · 25% token packs · 5% bundles.

**KPI north star:** Net Revenue per Active Author (NRAA) = (MRR + pack revenue) / MAU paganti.

## 7.2 Token Economy (sistema)

- **Ledger:** `user_token_balance`, `token_transactions` (fase implementazione — non ora).
- **Unità:** Scriptora Token (ST), intero, no frazioni.
- **Consumo:** server-side decrement atomico post-success edge.
- **Grant:** signup Free 20, monthly cron per piano, webhook Stripe pack.
- **Reporting:** dashboard utente “Credito editoriale” non “token AI”.

## 7.3 Pricing Architecture

| Layer | Meccanismo |
|-------|------------|
| Access gating | Piano determina **quali tool** sono visibili |
| Usage gating | ST determina **quanto** si usa |
| Upsell | ST esauriti → pack modal → piano superiore |
| Anchor | PUBLISHER PACK €49,99 / 900 ST vs Studio €79,90 / 2500 ST/mo |

**Price anchoring freelance:** Diagnostica capitolo editor freelance ≈ €30–80 → 1 ST @ €0.07 è percezione “regalo” vs mercato.

## 7.4 Business Model

**Canvas sintetico:**

- **Value prop:** Unico ecosistema writer + developmental editor + market intel + KDP.
- **Customer segments:** (1) AI-first authors, (2) Editor-only authors, (3) Studio/professionals.
- **Channels:** KDP community, BookTok, writing Discords, SEO “story doctor AI”.
- **Cost structure:** DeepSeek (~15–25% revenue at scale), FAL images, Supabase, Vercel.
- **Revenue streams:** MRR + ST packs + future agency tier.

**Unit economics target (Pro user, month 3):**

- ARPU: €19,90 + €8 pack = **€27,90**
- COGS API: **€4–6**
- Gross margin: **~78%**

## 7.5 Anti-Abuse Strategy

Vedi Fase 6. Principio: **server-side enforcement prima del marketing aggressivo Free ST**.

## 7.6 Growth Strategy

| Fase | Tattica |
|------|---------|
| **Activation** | Free 20 ST + Manuscript Checkup landing |
| **Aha moment** | Diagnostica capitolo in <3 min, report pro-looking |
| **Conversion** | ST exhaustion mid-flow + compare freelance pricing |
| **Expansion** | Pack upsell → Premium per Dominate |
| **Retention** | Monthly “editorial digest” email con ST unused reminder |
| **Referral (fase 2)** | 25 ST per invite paid conversion |

**Messaging shift:** Da “AI Writer” a **“La redazione editoriale nel tuo browser”**.

## 7.7 Roadmap di implementazione

### Phase 0 — Foundation (settimane 1–2) · NO product change yet
- [ ] Validare tabella ST su 30 giorni `ai_usage_logs` reali → **`npm run token-economy:audit`** o SQL in [`token-economy-usage-audit-queries.md`](./token-economy-usage-audit-queries.md)
- [ ] Unificare `plan.ts` + `subscription.ts` in spec unica
- [ ] Legal: ToS token non rimborsabili, scadenza pack
- [ ] Stripe products: 4 piani + 4 packs

### Phase 1 — Backend ledger (settimane 3–5)
- [ ] DB: `token_balances`, `token_ledger` (append-only)
- [ ] Edge middleware: check ST before AI call
- [ ] Migrate metering: log ST consumed per `task_type`
- [ ] Webhook Stripe → grant ST + plan sync

### Phase 2 — Frontend UX (settimane 6–8)
- [ ] Credit indicator globale (header)
- [ ] Pre-action ST confirm modal (editorial copy)
- [ ] Pricing page V1 + pack checkout
- [ ] Upgrade flows: token-limit, feature-limit

### Phase 3 — Editor-Only path (settimane 9–10)
- [ ] Landing “Ho già un libro”
- [ ] Dashboard variant / onboarding branch
- [ ] Bundle SKUs in Stripe

### Phase 4 — Hardening (settimane 11–12)
- [ ] Server-side plan gate su tutte le 24 edge functions
- [ ] Rate limits + fair use cron
- [ ] Auto-Bestseller gate (Studio / 75 ST)
- [ ] A/B pricing €19,90 vs €24,90 Pro

### Phase 5 — Optimize (mese 4+)
- [ ] Dynamic ST pricing per costo reale (ML on logs)
- [ ] Rollover ST 20% Premium+
- [ ] B2B Studio API
- [ ] Referral program

---

## Appendice A — Mappatura feature → ST (quick reference)

| Area codebase | Operazione ST |
|---------------|---------------|
| `generation.ts` | cap=3, expand=2, continue=1, blueprint=4, full book=62–75 |
| `ChapterIntelligencePanel` | diagnose=1, patch=2, dominate=8 |
| `ManuscriptAnalyzerDialog` | story doctor=5, manuscript=8 |
| `CoverGenerator` | cover=2, variant=1 |
| `KdpLaunchPage` / money-engine | market=3, packaging=1–4 |
| `TitleIntelligenceDialog` | title=1 |
| `KeywordGoldPage` / Radar | keyword=2, radar=3 |
| `AutoBestsellerPage` | full book factory=75 (Studio gate) |

## Appendice B — Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Utenti percepiscono ST come “caro” | Copy editoriale + anchor freelance |
| Power user esaurisce 300 ST in 2 giorni | Pack + fair use daily cap |
| DeepSeek price increase | Buffer 15% in formula ST + review trimestrale |
| Bypass frontend | Server gate Phase 4 non negoziabile |
| Cannibalizzazione MRR da pack | Monthly ST first; pack premium €/ST decrescente |

---

*Documento prodotto da audit codebase Scriptora (`plan.ts`, `subscription.ts`, `ai-tracking.ts`, 24 edge functions). Nessuna implementazione tecnica inclusa.*
