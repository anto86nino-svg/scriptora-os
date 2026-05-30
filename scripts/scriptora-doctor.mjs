#!/usr/bin/env node
/**
 * Scriptora doctor — infrastructure validation (read-only on env files).
 * Usage: npm run scriptora:doctor [--smoke]
 */
import { execSync } from "node:child_process";
import {
  loadMergedEnv,
  validateSupabaseEnv,
  resolveEdgeJwt,
  ROOT,
} from "./scriptora-env-core.mjs";

const withSmoke = process.argv.includes("--smoke");

async function callFunction({ url, jwt, apikey, name, body }) {
  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/${name}`;
  const started = Date.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey,
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let error = "";
  try {
    const parsed = JSON.parse(text);
    error = parsed?.error || parsed?.message || parsed?.code || "";
  } catch {
    error = text.slice(0, 120);
  }
  return { name, status: res.status, ms: Date.now() - started, error };
}

function tryCliAnon(projectRef) {
  try {
    const raw = execSync(`supabase projects api-keys --project-ref ${projectRef} -o json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(raw).find((k) => k.name === "anon")?.api_key || "";
  } catch {
    return "";
  }
}

const env = loadMergedEnv();
const report = validateSupabaseEnv(env);
let exitCode = report.ok ? 0 : 1;

console.log("\nSCRIPTORA DOCTOR\n");

for (const check of report.checks) {
  const icon = check.ok ? "✅" : check.level === "warn" ? "⚠️" : "❌";
  console.log(`${icon} ${check.message}`);
  if (check.details?.length) {
    for (const d of check.details) {
      console.log(`   ↳ ${d.file}: ${d.key}`);
    }
  }
}

if (!report.ok) {
  console.log("\nFix:");
  console.log("  1. Run: npm run scriptora:repair");
  console.log("  2. Or paste keys from Supabase Dashboard → Project Settings → API");
  console.log("  3. Never commit .env / .env.local — use Vercel env vars in production\n");
}

if (withSmoke && report.env.url) {
  console.log("\nEdge Function smoke tests…\n");
  let jwt = resolveEdgeJwt(env);
  const apikey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || jwt;
  const projectRef = env.VITE_SUPABASE_PROJECT_ID || report.env.url.match(/https:\/\/([^.]+)/)?.[1];

  if (!jwt && projectRef) {
    jwt = tryCliAnon(projectRef);
    if (jwt) console.log("ℹ️  Using anon JWT from Supabase CLI (not printed).\n");
  }

  if (!jwt) {
    console.log("❌ Cannot smoke-test Edge Functions — no valid anon JWT.");
    exitCode = 1;
  } else {
    const blueprint = await callFunction({
      url: report.env.url,
      jwt,
      apikey,
      name: "generate-blueprint-fast",
      body: {
        systemPrompt: "Return JSON only.",
        userPrompt: '{"title":"Doctor","chapters":[{"title":"One","summary":"Test"}]}',
        taskType: "doctor_smoke_blueprint",
      },
    });

    const book = await callFunction({
      url: report.env.url,
      jwt,
      apikey,
      name: "generate-book",
      body: {
        systemPrompt: "Reply in one short sentence.",
        userPrompt: "Say hello from Scriptora doctor.",
        taskType: "doctor_smoke_book",
      },
    });

    for (const r of [blueprint, book]) {
      const ok = r.status === 200;
      console.log(`${ok ? "✅" : "❌"} ${r.name} → HTTP ${r.status} (${r.ms}ms)${r.error ? ` — ${r.error}` : ""}`);
      if (!ok) exitCode = 1;
    }

    if (blueprint.status === 402 || book.status === 402) {
      console.log("\n↳ DeepSeek secret may be missing on Supabase. Set DEEPSEEK_API_KEY via `supabase secrets set`.");
    }
  }
}

console.log(`\nSYSTEM STATUS: ${exitCode === 0 ? "HEALTHY" : "DEGRADED"}\n`);
process.exit(exitCode);
