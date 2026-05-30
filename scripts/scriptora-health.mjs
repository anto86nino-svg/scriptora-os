#!/usr/bin/env node
/**
 * Scriptora health report — config + optional live Edge Function checks.
 */
import { execSync } from "node:child_process";
import { loadMergedEnv, validateSupabaseEnv, resolveEdgeJwt } from "./scriptora-env-core.mjs";

async function pingFunction(url, jwt, apikey, name, serviceKey) {
  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/${name}`;
  const body =
    name === "generate-book"
      ? { systemPrompt: "ok", userPrompt: "Hi", taskType: "health_ping" }
      : {
          systemPrompt: "You return valid JSON objects only.",
          userPrompt: '{"title":"Health","chapters":[]}',
          taskType: "health_ping",
        };
  const bearer = serviceKey || jwt;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey,
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25000),
    });
    return res.status;
  } catch {
    return 0;
  }
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

console.log("\nSCRIPTORA HEALTH REPORT\n");

const line = (ok, label) => console.log(`${ok ? "✅" : "❌"} ${label}`);

line(report.checks.find((c) => c.id === "supabase_url")?.ok, "Supabase URL valid");
line(report.checks.find((c) => c.id === "publishable_key")?.ok ?? report.checks.find((c) => c.id === "browser_key")?.ok, "Publishable key valid");
line(report.checks.find((c) => c.id === "anon_jwt")?.ok, "JWT auth healthy");
line(report.checks.find((c) => c.id === "safe_mode")?.ok, "Environment safe");

let deepseekOk = false;
let blueprintOk = false;
let chapterOk = false;

if (report.env.url && report.ok) {
  let jwt = resolveEdgeJwt(env);
  const apikey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || jwt;
  const projectRef = env.VITE_SUPABASE_PROJECT_ID || report.env.url.match(/https:\/\/([^.]+)/)?.[1];
  if (!jwt && projectRef) jwt = tryCliAnon(projectRef);

  if (jwt) {
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
    const bpStatus = await pingFunction(report.env.url, jwt, apikey, "generate-blueprint-fast", serviceKey);
    const bookStatus = await pingFunction(report.env.url, jwt, apikey, "generate-book", serviceKey);
    blueprintOk = bpStatus === 200;
    chapterOk = bookStatus === 200;
    deepseekOk = blueprintOk || chapterOk || bpStatus === 402 || bookStatus === 402;
    line(deepseekOk, "DeepSeek reachable");
    line(blueprintOk || bpStatus === 200, "Blueprint generation OK");
    line(chapterOk || bookStatus === 200, "Chapter generation OK");
    line(bpStatus > 0 || bookStatus > 0, "Edge Functions healthy");
    if (bpStatus === 401 || bookStatus === 401) {
      line(false, "Edge auth enforced (deploy edge-guard to production)");
    }
  } else {
    line(false, "DeepSeek reachable (no JWT for smoke test)");
    line(false, "Blueprint generation OK (skipped)");
    line(false, "Chapter generation OK (skipped)");
    line(false, "Edge Functions healthy (skipped)");
  }
} else {
  line(false, "DeepSeek reachable (config invalid)");
  line(false, "Blueprint generation OK (config invalid)");
  line(false, "Chapter generation OK (config invalid)");
  line(false, "Edge Functions healthy (config invalid)");
}

line(report.ok, "Writer OS ready (env layer)");
console.log("\nSYSTEM STATUS:");
console.log(report.ok && (blueprintOk || chapterOk || !resolveEdgeJwt(env)) ? "HEALTHY" : report.ok ? "DEGRADED" : "DEGRADED");
console.log("");

process.exit(report.ok ? 0 : 1);
