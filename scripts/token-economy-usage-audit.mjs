#!/usr/bin/env node
/**
 * Token Economy Usage Audit — READ-ONLY
 *
 * Queries ai_usage_logs and produces:
 *   - reports/token-economy-usage-YYYY-MM-DD.md
 *   - reports/token-economy-by-task-YYYY-MM-DD.csv
 *
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (or .env)
 * Does NOT insert, update, or delete anything.
 *
 * Usage:
 *   node scripts/token-economy-usage-audit.mjs
 *   node scripts/token-economy-usage-audit.mjs --days=30 --eur-rate=0.92 --out=reports/
 *   node scripts/token-economy-usage-audit.mjs --all-providers
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { loadMergedEnv, ROOT } from "./scriptora-env-core.mjs";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

const DAYS = Math.max(1, Math.min(365, Number(arg("days", "30")) || 30));
const EUR_RATE = Math.max(0.5, Math.min(1.5, Number(arg("eur-rate", "0.92")) || 0.92));
const ST_VALUE_EUR = Number(arg("st-value", "0.07")) || 0.07;
const BUFFER = Number(arg("buffer", "1.15")) || 1.15;
const OUT_DIR = path.resolve(ROOT, arg("out", "reports"));
const ALL_PROVIDERS = args.includes("--all-providers");
const INCLUDE_LOCAL = args.includes("--include-local");

/** ST V1 draft from executive plan — used for comparison column */
const ST_V1_DRAFT = {
  generate_chapter_chunk: 3,
  generate_chapter_fallback: 3,
  generate_chapter_overlap_fix: 1,
  generate_subchapter: 1,
  generate_blueprint: 4,
  generate_front_matter: 1,
  generate_back_matter: 1,
  generate_book: 3,
  rewrite_chapter: 2,
  adaptive_rewrite: 2,
  evaluate_chapter_quality: 1,
  analyze_chapter: 1,
  patch_chapter: 2,
  dominate_chapter: 8,
  auto_bestseller: 75,
  auto_bestseller_stream: 75,
  title_intelligence: 1,
  title_autofill: 1,
  detect_book_intent: 0,
  bestseller_radar: 3,
  trending_niche_click: 3,
  genre_coach: 3,
  scene_image_generation: 1,
  scriptora_character_bible: 2,
  scriptora_novel_idea: 1,
  expand_author_bio: 1,
  molly_chat: 0,
};

function stDraftForTask(taskType) {
  if (ST_V1_DRAFT[taskType] != null) return ST_V1_DRAFT[taskType];
  if (taskType.startsWith("fix_section_")) return 1;
  if (taskType.startsWith("kdp_")) return 2;
  if (taskType.startsWith("publish_")) return 1;
  if (taskType.startsWith("live_coach_")) return 1;
  return null;
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx];
}

function round(n, d = 6) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function recommendedSt(p90Usd) {
  const costEur = p90Usd * EUR_RATE * BUFFER;
  if (costEur <= 0) return 0;
  return Math.max(1, Math.ceil(costEur / ST_VALUE_EUR));
}

function marginPct(p90Usd, st) {
  if (!st) return null;
  const revenue = st * ST_VALUE_EUR;
  const costEur = p90Usd * EUR_RATE;
  if (revenue <= 0) return null;
  return round((1 - costEur / revenue) * 100, 1);
}

async function fetchAllRows(supabase, sinceIso) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    let q = supabase
      .from("ai_usage_logs")
      .select(
        "id, user_id, project_id, provider, model, task_type, prompt_tokens, completion_tokens, total_tokens, input_cost, output_cost, total_cost, created_at",
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (!ALL_PROVIDERS) {
      q = q.eq("provider", "deepseek");
    }

    const { data, error } = await q;
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 50000) {
      console.warn("⚠️  Truncated at 50k rows — narrow --days or filter in SQL.");
      break;
    }
  }
  return rows;
}

function aggregateByTask(rows) {
  const map = new Map();
  for (const row of rows) {
    const key = `${row.provider}::${row.task_type}`;
    if (!map.has(key)) {
      map.set(key, {
        task_type: row.task_type,
        provider: row.provider,
        costs: [],
        tokens: [],
        calls: 0,
        sumUsd: 0,
      });
    }
    const b = map.get(key);
    const cost = Number(row.total_cost) || 0;
    b.costs.push(cost);
    b.tokens.push(Number(row.total_tokens) || 0);
    b.calls += 1;
    b.sumUsd += cost;
  }

  const out = [];
  for (const b of map.values()) {
    b.costs.sort((a, c) => a - c);
    b.tokens.sort((a, c) => a - c);
    const p50 = percentile(b.costs, 0.5);
    const p90 = percentile(b.costs, 0.9);
    const stDraft = stDraftForTask(b.task_type);
    const stRec = recommendedSt(p90);
    out.push({
      ...b,
      avgUsd: b.calls ? b.sumUsd / b.calls : 0,
      p50Usd: p50,
      p90Usd: p90,
      maxUsd: b.costs[b.costs.length - 1] || 0,
      avgTokens: b.tokens.length ? b.tokens.reduce((s, t) => s + t, 0) / b.tokens.length : 0,
      p90Tokens: percentile(b.tokens, 0.9),
      stDraft,
      stRec,
      marginDraft: marginPct(p90, stDraft),
      marginRec: marginPct(p90, stRec),
    });
  }
  return out.sort((a, b) => b.sumUsd - a.sumUsd);
}

function aggregateBookCosts(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.project_id || row.provider !== "deepseek") continue;
    const cost = Number(row.total_cost) || 0;
    map.set(row.project_id, (map.get(row.project_id) || 0) + cost);
  }
  const costs = [...map.values()].filter((c) => c > 0.000001).sort((a, b) => a - b);
  return {
    projects: costs.length,
    p50Usd: percentile(costs, 0.5),
    p90Usd: percentile(costs, 0.9),
    maxUsd: costs[costs.length - 1] || 0,
    avgUsd: costs.length ? costs.reduce((s, c) => s + c, 0) / costs.length : 0,
    stRecBook: recommendedSt(percentile(costs, 0.9)),
  };
}

function aggregatePatchSessions(rows) {
  const map = new Map();
  for (const row of rows) {
    if (row.task_type !== "patch_chapter") continue;
    const hour = row.created_at?.slice(0, 13) || "unknown";
    const key = `${row.project_id || "none"}::${hour}`;
    map.set(key, (map.get(key) || 0) + (Number(row.total_cost) || 0));
  }
  const costs = [...map.values()].sort((a, b) => a - b);
  return {
    sessions: costs.length,
    p90SessionUsd: percentile(costs, 0.9),
    stRecSession: recommendedSt(percentile(costs, 0.9)),
  };
}

function toCsv(taskStats) {
  const header =
    "task_type,provider,calls,sum_usd,avg_usd,p50_usd,p90_usd,max_usd,avg_tokens,p90_tokens,st_v1_draft,st_recommended,margin_draft_pct,margin_rec_pct";
  const lines = taskStats.map((r) =>
    [
      r.task_type,
      r.provider,
      r.calls,
      round(r.sumUsd, 4),
      round(r.avgUsd),
      round(r.p50Usd),
      round(r.p90Usd),
      round(r.maxUsd),
      Math.round(r.avgTokens),
      Math.round(r.p90Tokens),
      r.stDraft ?? "",
      r.stRec,
      r.marginDraft ?? "",
      r.marginRec ?? "",
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

function buildMarkdown({ since, rows, taskStats, book, patch, meta }) {
  const date = new Date().toISOString().slice(0, 10);
  let md = `# Token Economy Usage Audit — ${date}\n\n`;
  md += `| Campo | Valore |\n|-------|--------|\n`;
  md += `| Finestra | ${DAYS} giorni (da ${since.slice(0, 10)}) |\n`;
  md += `| Righe analizzate | ${rows.length} |\n`;
  md += `| Provider filter | ${ALL_PROVIDERS ? "tutti" : "deepseek only"} |\n`;
  md += `| EUR/USD | ${EUR_RATE} |\n`;
  md += `| ST target € | ${ST_VALUE_EUR} |\n`;
  md += `| Buffer | ${BUFFER} |\n`;
  md += `| Supabase URL | ${meta.url} |\n\n`;

  if (rows.length < 20) {
    md += `> ⚠️ **Volume basso** (<20 righe). Estendi \`--days\` o verifica che i log siano su questo progetto.\n\n`;
  }

  md += `## Libro completo (proxy project_id)\n\n`;
  md += `| Metrica | USD | EUR (×${EUR_RATE}) | ST raccomandato (p90) |\n`;
  md += `|---------|-----|---------------------|------------------------|\n`;
  md += `| Progetti con usage | ${book.projects} | — | — |\n`;
  md += `| p50 costo libro | $${round(book.p50Usd, 4)} | €${round(book.p50Usd * EUR_RATE, 4)} | — |\n`;
  md += `| p90 costo libro | $${round(book.p90Usd, 4)} | €${round(book.p90Usd * EUR_RATE, 4)} | **${book.stRecBook} ST** |\n`;
  md += `| max costo libro | $${round(book.maxUsd, 4)} | €${round(book.maxUsd * EUR_RATE, 4)} | — |\n\n`;

  md += `## Patch capitolo (sessioni orarie)\n\n`;
  md += `- Sessioni patch: **${patch.sessions}**\n`;
  md += `- p90 costo sessione: **$${round(patch.p90SessionUsd, 4)}** → ST raccomandato **${patch.stRecSession}**\n\n`;

  md += `## Per task_type\n\n`;
  md += `| task_type | calls | p90 USD | p90 EUR | ST V1 | ST rec | margine V1 | margine rec |\n`;
  md += `|-----------|-------|---------|---------|-------|--------|------------|-------------|\n`;
  for (const r of taskStats) {
    md += `| \`${r.task_type}\` | ${r.calls} | ${round(r.p90Usd, 4)} | ${round(r.p90Usd * EUR_RATE, 4)} | ${r.stDraft ?? "—"} | ${r.stRec} | ${r.marginDraft ?? "—"}% | ${r.marginRec ?? "—"}% |\n`;
  }

  md += `\n## Task senza ST V1 draft mappato\n\n`;
  const unmapped = taskStats.filter((r) => r.stDraft == null);
  if (!unmapped.length) {
    md += `_Nessuno — aggiorna ST_V1_DRAFT nello script se compaiono nuovi task._\n`;
  } else {
    for (const r of unmapped) {
      md += `- \`${r.task_type}\` (${r.provider}) — ${r.calls} calls, p90 $${round(r.p90Usd, 4)} → suggerito **${r.stRec} ST**\n`;
    }
  }

  md += `\n---\n_Generato da \`npm run token-economy:audit\` — read-only._\n`;
  return md;
}

async function main() {
  const env = loadMergedEnv();
  const url =
    env.SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("❌ Mancano credenziali Supabase per audit read-only.");
    console.error("   Richiesti: SUPABASE_URL (o VITE_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY");
    console.error("   Imposta in .env.local (non committare) oppure esegui le query SQL in:");
    console.error("   docs/token-economy-usage-audit-queries.md");
    process.exit(1);
  }

  const since = new Date(Date.now() - DAYS * 86400000).toISOString();
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\nToken Economy Usage Audit (read-only)`);
  console.log(`  Window: ${DAYS} days since ${since.slice(0, 10)}`);
  console.log(`  Target: ${url}\n`);

  let rows = await fetchAllRows(supabase, since);

  if (!INCLUDE_LOCAL) {
    const before = rows.length;
    rows = rows.filter((r) => !String(r.user_id || "").startsWith("local-user"));
    console.log(`  Filtered sandbox: ${before - rows.length} local-user rows removed`);
  }

  const taskStats = aggregateByTask(rows);
  const book = aggregateBookCosts(rows);
  const patch = aggregatePatchSessions(rows);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const mdPath = path.join(OUT_DIR, `token-economy-usage-${date}.md`);
  const csvPath = path.join(OUT_DIR, `token-economy-by-task-${date}.csv`);

  const md = buildMarkdown({
    since,
    rows,
    taskStats,
    book,
    patch,
    meta: { url },
  });

  fs.writeFileSync(mdPath, md, "utf8");
  fs.writeFileSync(csvPath, toCsv(taskStats), "utf8");

  console.log(`✅ Report: ${mdPath}`);
  console.log(`✅ CSV:    ${csvPath}`);
  console.log(`   ${rows.length} rows · ${taskStats.length} task types · ${book.projects} projects\n`);

  if (book.projects > 0) {
    console.log(`   Libro p90: $${round(book.p90Usd, 4)} → ${book.stRecBook} ST raccomandati`);
  }
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
