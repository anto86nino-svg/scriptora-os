# Token Economy — Usage Audit Queries & Report Template

**Purpose:** Ricalibrare i costi ST (Scriptora Token) su dati reali da `ai_usage_logs`.  
**Scope:** Read-only — nessuna modifica a DB, produzione o billing.  
**Window consigliata:** ultimi **30 giorni** (parametro `days` sotto).

---

## Prerequisiti

| Requisito | Dove |
|-----------|------|
| Tabella `ai_usage_logs` | Migration `20260419174656_*.sql` |
| Costi USD per riga | `total_cost`, `input_cost`, `output_cost` (calcolati in `ai-tracking.ts`) |
| Task types | Colonna `task_type` (stringa libera per edge function) |
| Accesso SQL | Supabase Dashboard → SQL Editor **oppure** `service_role` read-only |

**Produzione Supabase (owner):** project ref `pwdcqnrclhetgxiqnjtr`  
**Locale:** dati possono essere sparsi / sandbox user ids (`local-user-*`).

---

## Opzione A — Script automatico (consigliato)

```bash
# Richiede SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env (solo lettura)
npm run token-economy:audit

# Finestra custom + export CSV
npm run token-economy:audit -- --days=30 --eur-rate=0.92 --out=reports/

# Solo task DeepSeek (default); includi FAL / internal
npm run token-economy:audit -- --all-providers
```

Output:
- `reports/token-economy-usage-YYYY-MM-DD.md` — report compilato
- `reports/token-economy-by-task-YYYY-MM-DD.csv` — import Excel/Sheets

---

## Opzione B — Supabase SQL Editor

Copia/incolla le query sotto. Sostituisci `:days` mentalmente con `30` (già hardcoded).

### B1 — Sanity check volume

```sql
SELECT
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS rows_30d,
  MIN(created_at) AS oldest,
  MAX(created_at) AS newest,
  COUNT(DISTINCT task_type) AS distinct_tasks,
  COUNT(DISTINCT user_id) AS distinct_users,
  COUNT(DISTINCT project_id) AS distinct_projects
FROM public.ai_usage_logs;
```

### B2 — Costo per `task_type` (core per calibrazione ST)

```sql
SELECT
  task_type,
  provider,
  COUNT(*) AS calls,
  ROUND(AVG(total_cost)::numeric, 6) AS avg_cost_usd,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_cost)::numeric, 6) AS p50_cost_usd,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_cost)::numeric, 6) AS p90_cost_usd,
  ROUND(MAX(total_cost)::numeric, 6) AS max_cost_usd,
  ROUND(SUM(total_cost)::numeric, 4) AS sum_cost_usd,
  ROUND(AVG(total_tokens)) AS avg_tokens,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_tokens)) AS p90_tokens
FROM public.ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND provider = 'deepseek'
  AND user_id NOT LIKE 'local-user%'
GROUP BY task_type, provider
ORDER BY sum_cost_usd DESC NULLS LAST;
```

> **Nota:** Rimuovi il filtro `user_id` per includere dev/sandbox. Aggiungi `AND provider != 'internal'` se vuoi escludere trending click sintetici.

### B3 — Aggregazione per **famiglia** task (patch, kdp, generate, fix)

```sql
SELECT
  CASE
    WHEN task_type LIKE 'generate_%' OR task_type IN ('generate_book', 'auto_bestseller', 'auto_bestseller_stream') THEN 'GENERATION'
    WHEN task_type IN ('analyze_chapter', 'patch_chapter', 'dominate_chapter') THEN 'CHAPTER_DOCTOR'
    WHEN task_type LIKE 'fix_section_%' THEN 'SURGICAL_EDIT'
    WHEN task_type LIKE 'kdp_%' THEN 'KDP_MARKET'
    WHEN task_type LIKE 'publish_%' THEN 'PUBLISH'
    WHEN task_type LIKE 'live_coach_%' THEN 'LIVE_COACH'
    WHEN task_type IN ('title_intelligence', 'title_autofill', 'detect_book_intent') THEN 'TITLE_KDP_LIGHT'
    WHEN task_type = 'scene_image_generation' THEN 'COVER_SCENE'
    WHEN task_type = 'trending_niche_click' THEN 'TRENDING_INTERNAL'
    ELSE 'OTHER'
  END AS family,
  COUNT(*) AS calls,
  ROUND(SUM(total_cost)::numeric, 4) AS sum_cost_usd,
  ROUND(AVG(total_cost)::numeric, 6) AS avg_cost_usd,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_cost)::numeric, 6) AS p90_cost_usd
FROM public.ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY sum_cost_usd DESC;
```

### B4 — Costo **libro completo** (proxy per project_id)

Somma di tutti i task su un progetto = costo reale “full pipeline”.

```sql
WITH project_costs AS (
  SELECT
    project_id,
    user_id,
    COUNT(*) AS api_calls,
    SUM(total_cost) AS total_cost_usd,
    SUM(total_tokens) AS total_tokens,
    MIN(created_at) AS first_call,
    MAX(created_at) AS last_call
  FROM public.ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND project_id IS NOT NULL
    AND provider = 'deepseek'
  GROUP BY project_id, user_id
)
SELECT
  COUNT(*) AS projects_with_usage,
  ROUND(AVG(total_cost_usd)::numeric, 4) AS avg_book_cost_usd,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_cost_usd)::numeric, 4) AS p50_book_cost_usd,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_cost_usd)::numeric, 4) AS p90_book_cost_usd,
  ROUND(MAX(total_cost_usd)::numeric, 4) AS max_book_cost_usd,
  ROUND(AVG(api_calls)) AS avg_calls_per_book
FROM project_costs
WHERE total_cost_usd > 0.001;
```

### B5 — Distribuzione giornaliera (spot abuse / spike)

```sql
SELECT
  DATE(created_at AT TIME ZONE 'UTC') AS day,
  COUNT(*) AS calls,
  ROUND(SUM(total_cost)::numeric, 4) AS cost_usd,
  COUNT(DISTINCT user_id) AS active_users
FROM public.ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1 DESC;
```

### B6 — Top 20 utenti per costo (fair use design)

```sql
SELECT
  user_id,
  COUNT(*) AS calls,
  ROUND(SUM(total_cost)::numeric, 4) AS cost_usd,
  COUNT(DISTINCT project_id) AS projects,
  MAX(created_at) AS last_active
FROM public.ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND provider = 'deepseek'
GROUP BY user_id
ORDER BY cost_usd DESC
LIMIT 20;
```

### B7 — Modello / provider (DeepSeek Flash vs Pro)

```sql
SELECT
  provider,
  model,
  COUNT(*) AS calls,
  ROUND(SUM(total_cost)::numeric, 4) AS sum_cost_usd,
  ROUND(AVG(total_cost)::numeric, 6) AS avg_cost_usd
FROM public.ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY provider, model
ORDER BY sum_cost_usd DESC;
```

### B8 — Outlier (> 3× p90 del proprio task_type)

```sql
WITH stats AS (
  SELECT
    task_type,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_cost) AS p90
  FROM public.ai_usage_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
    AND provider = 'deepseek'
  GROUP BY task_type
),
joined AS (
  SELECT
    l.id,
    l.task_type,
    l.total_cost,
    l.total_tokens,
    l.project_id,
    l.user_id,
    l.created_at,
    s.p90
  FROM public.ai_usage_logs l
  JOIN stats s ON s.task_type = l.task_type
  WHERE l.created_at >= NOW() - INTERVAL '30 days'
    AND l.provider = 'deepseek'
)
SELECT *
FROM joined
WHERE total_cost > p90 * 3
ORDER BY total_cost DESC
LIMIT 50;
```

---

## Mappatura `task_type` → operazione ST (V1 draft)

Usare questa tabella per compilare il report. Quando un `task_type` non compare nei log, segnare **NO DATA**.

| task_type (log) | Operazione prodotto | ST V1 draft | Famiglia |
|-----------------|---------------------|-------------|----------|
| `generate_chapter_chunk` | Genera capitolo | 3 | GENERATION |
| `generate_chapter_fallback` | Genera capitolo (retry) | 3 | GENERATION |
| `generate_chapter_overlap_fix` | Continua / fix overlap | 1 | GENERATION |
| `generate_subchapter` | Genera sottocapitolo | 1 | GENERATION |
| `generate_blueprint` | Blueprint | 4 | GENERATION |
| `generate_front_matter` | Front matter | 1 | GENERATION |
| `generate_back_matter` | Back matter | 1 | GENERATION |
| `generate_book` | Generazione generica | 3 | GENERATION |
| `rewrite_chapter` | Espandi / rewrite capitolo | 2 | GENERATION |
| `adaptive_rewrite` | Rewrite adattivo post-gen | 2 | GENERATION |
| `evaluate_chapter_quality` | Valutazione qualità | 1 | EDITORIAL |
| `analyze_chapter` | Diagnostica capitolo | 1 | EDITORIAL |
| `patch_chapter` | Fix capitolo (batch) | 2 | SURGICAL |
| `dominate_chapter` | Dominate / rewrite totale | 8 | SURGICAL |
| `fix_section_*` | Dialogue / Subtext / Pacing doctor | 1 | SURGICAL |
| `auto_bestseller` | Libro completo factory | 75 | GENERATION |
| `auto_bestseller_stream` | Libro completo (stream) | 75 | GENERATION |
| `title_intelligence` | Title Intelligence | 1 | KDP |
| `title_autofill` | Title autofill | 1 | KDP |
| `detect_book_intent` | Book intent | 0 (free) | KDP |
| `kdp_*` | Market / packaging KDP | 2–3 | MARKET |
| `bestseller_radar` | Bestseller Radar | 3 | MARKET |
| `trending_niche_click` | Radar click (internal €0.50) | 3 | MARKET |
| `genre_coach` | Narrative / genre coach | 3 | EDITORIAL |
| `publish_*` | Publish tools | 1 | KDP |
| `scene_image_generation` | Scene image (FAL) | 1 | COVER |
| `scriptora_character_bible` | Character bible | 2 | GENERATION |
| `scriptora_novel_idea` | Novel idea | 1 | GENERATION |
| `expand_author_bio` | Author bio | 1 | KDP |
| `molly_chat` | Molly chat | 0 | OTHER |
| `live_coach_*` | Live coach | 1 | OTHER |

**Libro completo (aggregato):** usare query B4 → convertire `p90_book_cost_usd` in ST con formula sotto.

---

## Formula ricalibrazione ST

```
cost_eur = total_cost_usd × eur_rate          # default eur_rate = 0.92
buffer     = 1.15                             # 15% safety (prezzi DeepSeek, cache miss)
st_value   = 0.07                             # €/ST target (AUTHOR PACK)

recommended_st = CEIL( (p90_cost_eur × buffer) / st_value )
```

**Esempio:** `analyze_chapter` p90 = $0.012 → €0.011 → ×1.15 = €0.0127 → **1 ST** (ceil).

**Margine lordo API stimato per operazione:**

```
margin_pct = 1 - (p90_cost_eur / (recommended_st × st_value))
```

Target margine: **≥ 85%** operazioni low/medium, **≥ 75%** alto costo (Dominate, full book).

---

## Report template (compilare dopo query)

Copia in un doc condiviso o usa l’output dello script.

### Header

| Campo | Valore |
|-------|--------|
| Data audit | YYYY-MM-DD |
| Finestra | 30 giorni |
| Righe analizzate | ___ |
| EUR/USD | 0.92 |
| ST target value | €0.07 |
| Ambiente | production / staging / mixed |

### Tabella principale — per `task_type`

| task_type | calls | p50 USD | p90 USD | p90 EUR | ST V1 draft | ST raccomandato | Margine % | Note |
|-----------|-------|---------|---------|---------|-------------|-----------------|-----------|------|
| analyze_chapter | | | | | 1 | | | |
| generate_chapter_chunk | | | | | 3 | | | |
| patch_chapter | | | | | 2 | | | |
| dominate_chapter | | | | | 8 | | | |
| … | | | | | | | | |

### Aggregati business

| Metrica | Valore |
|---------|--------|
| Costo medio libro (p50 project sum) | € ___ |
| Costo p90 libro | € ___ |
| **ST libro completo raccomandato** | ___ ST |
| Costo medio utente Pro/mese (top quartile) | € ___ |
| ST mensili Pro (300) coprono costo API? | Sì/No |

### Decisioni post-audit

- [ ] Confermare ST V1 draft o aggiornare tabella in `token-economy-v1-executive-plan.md`
- [ ] Aggiustare allocazione piano (300/1000/2500 ST)
- [ ] Aggiustare prezzi pack se margine < 75%
- [ ] Segnalare task_type orphan / naming inconsistente da normalizzare in edge

---

## Checklist qualità dati

Prima di fidarsi del report:

1. **Volume minimo:** ≥ 100 righe DeepSeek negli ultimi 30 giorni (altrimenti estendere finestra a 90d).
2. **Escludere sandbox:** filtrare `local-user%` in produzione.
3. **Patch multi-row:** `patch_chapter` può essere N chiamate per 1 azione utente — usare anche aggregazione per `project_id + date_trunc('hour', created_at)`.
4. **Costo zero:** righe con `total_cost = 0` → verificare modello sconosciuto in `AI_PRICING`.
5. **Internal provider:** `trending_niche_click` traccia €0.50 business, non costo DeepSeek.

### Query — patch sessions (1 azione utente ≈ 1 riga)

```sql
SELECT
  project_id,
  DATE_TRUNC('hour', created_at) AS hour_bucket,
  COUNT(*) AS patch_calls,
  SUM(total_cost) AS session_cost_usd
FROM public.ai_usage_logs
WHERE task_type = 'patch_chapter'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY session_cost_usd DESC
LIMIT 30;
```

Usare **p90 di `session_cost_usd`** (non singola call) per calibrare “Fix Capitolo = 2 ST”.

---

## Collegamenti

- Piano esecutivo: [`token-economy-v1-executive-plan.md`](./token-economy-v1-executive-plan.md)
- Pricing DeepSeek in repo: `supabase/functions/_shared/ai-tracking.ts`
- Client usage helpers: `src/lib/ai-usage.ts`
- Edge summary API: `supabase/functions/ai-usage-summary`

---

*Read-only audit template — no schema changes.*
