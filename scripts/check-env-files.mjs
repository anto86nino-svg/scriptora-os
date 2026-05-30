#!/usr/bin/env node
/**
 * Guard against stale local env files that override Vite/Vercel builds.
 * - `.env.production` / `.env.vercel` with empty or old Supabase values break `vite build`.
 * - Production on Vercel must use dashboard Environment Variables, not committed env files.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const STALE_PROJECT_REF = "abdvbytjxglwcmfsixgr";
const GUARDED_FILES = [".env.production", ".env.vercel"];

function parseEnv(content) {
  const vars = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    vars[key] = value;
  }
  return vars;
}

function isPlaceholder(value) {
  if (!value) return true;
  return /INSERIRE|YOUR_|REPLACE|TODO|\$KEY|^cd ~\//i.test(value);
}

function isBadSupabaseEnv(vars) {
  const url = vars.VITE_SUPABASE_URL || "";
  const publishable = vars.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const anon = vars.VITE_SUPABASE_ANON_KEY || "";

  if (url.includes(STALE_PROJECT_REF)) return true;
  if (url && isPlaceholder(url)) return true;

  const hasAnyKey = Boolean(publishable || anon);
  if (!hasAnyKey) return true;
  if (publishable && isPlaceholder(publishable)) return true;
  if (anon && isPlaceholder(anon)) return true;

  return false;
}

let removed = 0;

for (const file of GUARDED_FILES) {
  const fullPath = path.join(ROOT, file);
  if (!fs.existsSync(fullPath)) continue;

  const content = fs.readFileSync(fullPath, "utf8");
  const vars = parseEnv(content);
  const touchesSupabase = Object.keys(vars).some((k) => k.startsWith("VITE_SUPABASE_"));

  if (!touchesSupabase) continue;

  if (isBadSupabaseEnv(vars)) {
    fs.unlinkSync(fullPath);
    removed += 1;
    console.warn(
      `[env-guard] Removed ${file} (empty, placeholder, or stale Supabase URL). ` +
        "Use Vercel Environment Variables for deploys and .env.local for local dev.",
    );
  }
}

if (removed === 0 && process.env.DEBUG_ENV_GUARD === "1") {
  console.log("[env-guard] No stale guarded env files found.");
}
