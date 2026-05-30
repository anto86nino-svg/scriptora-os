#!/usr/bin/env node
/**
 * Smoke test: Supabase edge functions → DeepSeek API.
 * Uses Supabase CLI for anon JWT (never prints secrets).
 *
 * Usage:
 *   npm run smoke:generation
 *   npm run smoke:generation -- --project-ref pwdcqnrclhetgxiqnjtr
 */
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

function loadDotEnv() {
  const out = {};
  for (const file of [".env", ".env.local"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const idx = t.indexOf("=");
      const k = t.slice(0, idx).trim();
      let v = t.slice(idx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in out)) out[k] = v;
    }
  }
  return out;
}

function isJwt(key) {
  if (!key || key.length < 24) return false;
  const parts = key.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function resolveProjectRef(env, argv) {
  const flagIdx = argv.indexOf("--project-ref");
  if (flagIdx >= 0 && argv[flagIdx + 1]) return argv[flagIdx + 1];
  return env.VITE_SUPABASE_PROJECT_ID || "pwdcqnrclhetgxiqnjtr";
}

async function callFunction({ url, anon, name, body }) {
  const endpoint = `${url.replace(/\/$/, "")}/functions/v1/${name}`;
  const started = Date.now();
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const marker = text.lastIndexOf("__RESULT__");
  let parsed = null;
  if (marker >= 0) {
    try {
      parsed = JSON.parse(text.slice(marker + "__RESULT__".length).trim());
    } catch {
      parsed = null;
    }
  } else {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text.slice(0, 200) };
    }
  }
  return {
    name,
    status: res.status,
    ms: Date.now() - started,
    error: parsed?.error || parsed?.message || parsed?.code,
    contentLen: parsed?.content?.length ?? 0,
    preview: typeof parsed?.content === "string" ? parsed.content.slice(0, 120) : undefined,
  };
}

const env = loadDotEnv();
const projectRef = resolveProjectRef(env, process.argv);
const url = env.VITE_SUPABASE_URL || `https://${projectRef}.supabase.co`;

let anon = [env.VITE_SUPABASE_ANON_KEY, env.VITE_SUPABASE_PUBLISHABLE_KEY].find(isJwt) || "";

if (!isJwt(anon)) {
  try {
    const raw = execSync(`supabase projects api-keys --project-ref ${projectRef} -o json`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    anon = JSON.parse(raw).find((k) => k.name === "anon")?.api_key || "";
  } catch {
    // CLI unavailable
  }
}

console.log(`Scriptora generation smoke test → ${url}`);
console.log(`Project ref: ${projectRef}`);
console.log(`Anon JWT from env: ${isJwt([env.VITE_SUPABASE_ANON_KEY, env.VITE_SUPABASE_PUBLISHABLE_KEY].find(isJwt) || "") ? "ok" : "missing/invalid — using Supabase CLI fallback"}`);

if (!isJwt(anon)) {
  console.error("\n✗ No valid Supabase anon JWT. Fix .env (VITE_SUPABASE_ANON_KEY=eyJ...) or run `supabase login`.");
  process.exit(1);
}

const blueprint = await callFunction({
  url,
  anon,
  name: "generate-blueprint-fast",
  body: {
    systemPrompt: "Return JSON only.",
    userPrompt: '{"title":"Smoke","chapters":[{"title":"One","summary":"Test"}]}',
    taskType: "smoke_blueprint",
  },
});

const book = await callFunction({
  url,
  anon,
  name: "generate-book",
  body: {
    systemPrompt: "Scrivi in italiano. Massimo due frasi.",
    userPrompt: "Descrivi un faro all alba.",
    taskType: "smoke_book",
  },
});

console.log("\n1) generate-blueprint-fast");
console.log(blueprint);
console.log("\n2) generate-book");
console.log(book);

const ok = blueprint.status === 200 && book.status === 200 && book.contentLen > 0;

if (ok) {
  console.log("\n✓ DeepSeek generation pipeline OK");
  process.exit(0);
}

if (blueprint.status === 401 || book.status === 401) {
  console.error("\n✗ Auth failed — check VITE_SUPABASE_ANON_KEY in .env (must be eyJ... JWT).");
  process.exit(1);
}

if (blueprint.status === 402 || book.status === 402) {
  console.error("\n✗ DeepSeek rejected the request (402). Update server secret:");
  console.error(`  supabase secrets set DEEPSEEK_API_KEY=sk-... --project-ref ${projectRef}`);
  console.error("  Then verify credits at https://platform.deepseek.com/");
  process.exit(1);
}

console.error("\n✗ Unexpected failure — see statuses above.");
process.exit(1);
