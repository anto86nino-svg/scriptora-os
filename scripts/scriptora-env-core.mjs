#!/usr/bin/env node
/**
 * Scriptora Infrastructure Immunity — shared env parsing & validation.
 * Never writes secrets. Never modifies working .env without explicit repair flow.
 */
import fs from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const STALE_PROJECT_REF = "abdvbytjxglwcmfsixgr";
export const GUARDED_FILES = [".env.production", ".env.vercel"];
export const PROTECTED_ENV_FILES = [".env", ".env.local"];

const SUPABASE_URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;

export function parseEnvContent(content) {
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

export function readEnvFile(filename) {
  const fullPath = path.join(ROOT, filename);
  if (!fs.existsSync(fullPath)) return null;
  return parseEnvContent(fs.readFileSync(fullPath, "utf8"));
}

/** Vite merge order: .env → .env.local (local wins). process.env VITE_* wins last. */
export function loadMergedEnv({ mode = "production" } = {}) {
  const merged = {};
  const files = [".env"];
  if (mode === "production") files.push(".env.production");
  files.push(".env.local", ".env.production.local");

  for (const file of files) {
    const vars = readEnvFile(file);
    if (vars) Object.assign(merged, vars);
  }

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith("VITE_") && value?.trim()) {
      merged[key] = value.trim();
    }
  }

  return merged;
}

export function isSuspiciousEnvValue(value) {
  if (value == null || value === "") return false;
  const v = String(value).trim();
  return (
    /^cd ~\//.test(v) ||
    /\$KEY\b/.test(v) ||
    /^undefined$/i.test(v) ||
    /^null$/i.test(v) ||
    /INSERIRE/i.test(v) ||
    /^your-(project-ref|publishable-key|legacy-anon-jwt)/i.test(v)
  );
}

export function isPlaceholderKey(value) {
  if (!value) return true;
  return /INSERIRE|YOUR_|REPLACE|TODO|\$KEY|^cd ~\//i.test(value);
}

export function isJwtKey(key) {
  if (!key || key.length < 24) return false;
  const parts = key.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function isPublishableKey(key) {
  return typeof key === "string" && key.startsWith("sb_publishable_") && key.length > 24;
}

export function extractProjectRefFromUrl(url) {
  const match = String(url || "").match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i);
  return match?.[1] || "";
}

export function findSuspiciousEntries(env, fileLabel = "environment") {
  const hits = [];
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith("VITE_SUPABASE_")) continue;
    if (isSuspiciousEnvValue(value)) {
      hits.push({ file: fileLabel, key, value: value.slice(0, 40) });
    }
  }
  return hits;
}

export function validateSupabaseEnv(env) {
  const checks = [];
  const url = env.VITE_SUPABASE_URL || "";
  const publishable = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const anon = env.VITE_SUPABASE_ANON_KEY || "";
  const projectId = env.VITE_SUPABASE_PROJECT_ID || "";
  const browserKey = publishable || anon;

  if (!url) {
    checks.push({ id: "supabase_url", ok: false, level: "error", message: "VITE_SUPABASE_URL is missing or empty." });
  } else if (!SUPABASE_URL_RE.test(url)) {
    checks.push({ id: "supabase_url", ok: false, level: "error", message: "Invalid Supabase URL format." });
  } else if (url.includes(STALE_PROJECT_REF)) {
    checks.push({ id: "supabase_url", ok: false, level: "error", message: "Stale Supabase project URL detected." });
  } else {
    checks.push({ id: "supabase_url", ok: true, level: "ok", message: "Supabase URL valid" });
  }

  const urlRef = extractProjectRefFromUrl(url);
  if (projectId && urlRef && projectId !== urlRef) {
    checks.push({
      id: "project_ref",
      ok: false,
      level: "error",
      message: `Project ref mismatch: VITE_SUPABASE_PROJECT_ID=${projectId} vs URL ref ${urlRef}.`,
    });
  } else if (projectId || urlRef) {
    checks.push({ id: "project_ref", ok: true, level: "ok", message: "Project ref consistent" });
  }

  if (!browserKey) {
    checks.push({
      id: "browser_key",
      ok: false,
      level: "error",
      message: "Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY for browser auth.",
    });
  } else if (isPlaceholderKey(browserKey) || isSuspiciousEnvValue(browserKey)) {
    checks.push({ id: "browser_key", ok: false, level: "error", message: "Browser Supabase key is placeholder or corrupted." });
  } else if (isJwtKey(browserKey) || isPublishableKey(browserKey)) {
    checks.push({ id: "browser_key", ok: true, level: "ok", message: "Publishable / browser key valid" });
  } else {
    checks.push({ id: "browser_key", ok: false, level: "error", message: "Browser Supabase key format unrecognized." });
  }

  if (!anon) {
    checks.push({
      id: "anon_jwt",
      ok: false,
      level: "warn",
      message: "VITE_SUPABASE_ANON_KEY missing — AI Edge Functions may fail.",
    });
  } else if (isPlaceholderKey(anon) || isSuspiciousEnvValue(anon)) {
    checks.push({ id: "anon_jwt", ok: false, level: "error", message: "Anon JWT is placeholder or corrupted." });
  } else if (!isJwtKey(anon)) {
    checks.push({ id: "anon_jwt", ok: false, level: "warn", message: "VITE_SUPABASE_ANON_KEY is not a JWT (eyJ…)." });
  } else {
    checks.push({ id: "anon_jwt", ok: true, level: "ok", message: "JWT auth key valid" });
  }

  if (publishable && !isPlaceholderKey(publishable) && !isPublishableKey(publishable) && !isJwtKey(publishable)) {
    checks.push({ id: "publishable_key", ok: false, level: "error", message: "VITE_SUPABASE_PUBLISHABLE_KEY malformed." });
  } else if (publishable && !isPlaceholderKey(publishable)) {
    checks.push({ id: "publishable_key", ok: true, level: "ok", message: "Publishable key present" });
  }

  const suspicious = [
    ...findSuspiciousEntries(env, "merged env"),
    ...scanProtectedFilesForSuspicious(),
  ];
  if (suspicious.length > 0) {
    checks.push({
      id: "safe_mode",
      ok: false,
      level: "error",
      message: `Suspicious env values detected (${suspicious.length}). SAFE MODE recommended.`,
      details: suspicious,
    });
  } else {
    checks.push({ id: "safe_mode", ok: true, level: "ok", message: "Environment safe" });
  }

  const errors = checks.filter((c) => !c.ok && c.level === "error");
  const warnings = checks.filter((c) => !c.ok && c.level === "warn");

  return {
    ok: errors.length === 0,
    degraded: warnings.length > 0,
    checks,
    errors,
    warnings,
    env: { url, publishable, anon, projectId, browserKey, edgeJwt: isJwtKey(anon) ? anon : isJwtKey(browserKey) ? browserKey : "" },
  };
}

function scanProtectedFilesForSuspicious() {
  const hits = [];
  for (const file of PROTECTED_ENV_FILES) {
    const vars = readEnvFile(file);
    if (!vars) continue;
    hits.push(...findSuspiciousEntries(vars, file));
  }
  return hits;
}

export function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** Create timestamped backup — never overwrites an existing backup path. */
export function backupEnvFile(filename) {
  const fullPath = path.join(ROOT, filename);
  if (!fs.existsSync(fullPath)) return null;

  const backupPath = path.join(ROOT, `${filename}.backup.${timestamp()}`);
  fs.copyFileSync(fullPath, backupPath);
  return backupPath;
}

export function backupProtectedEnvFiles() {
  const created = [];
  for (const file of PROTECTED_ENV_FILES) {
    const backup = backupEnvFile(file);
    if (backup) created.push(backup);
  }
  return created;
}

export function listEnvBackups() {
  const entries = fs.readdirSync(ROOT, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /^\.env(\.local)?\.backup\.\d{8}-\d{4}$/.test(e.name))
    .map((e) => ({
      name: e.name,
      path: path.join(ROOT, e.name),
      mtime: fs.statSync(path.join(ROOT, e.name)).mtimeMs,
      kind: e.name.startsWith(".env.local") ? ".env.local" : ".env",
    }))
    .sort((a, b) => b.mtime - a.mtime);
}

export function removeStaleGuardedEnvFiles() {
  let removed = 0;
  for (const file of GUARDED_FILES) {
    const fullPath = path.join(ROOT, file);
    if (!fs.existsSync(fullPath)) continue;
    const vars = readEnvFile(file);
    if (!vars) continue;
    const touchesSupabase = Object.keys(vars).some((k) => k.startsWith("VITE_SUPABASE_"));
    if (!touchesSupabase) continue;

    const url = vars.VITE_SUPABASE_URL || "";
    const publishable = vars.VITE_SUPABASE_PUBLISHABLE_KEY || "";
    const anon = vars.VITE_SUPABASE_ANON_KEY || "";
    const bad =
      url.includes(STALE_PROJECT_REF) ||
      isPlaceholderKey(publishable || anon) ||
      (!publishable && !anon);

    if (bad) {
      fs.unlinkSync(fullPath);
      removed += 1;
    }
  }
  return removed;
}

export function resolveEdgeJwt(env) {
  const anon = env.VITE_SUPABASE_ANON_KEY || "";
  const pub = env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (isJwtKey(anon)) return anon;
  if (isJwtKey(pub)) return pub;
  return "";
}
