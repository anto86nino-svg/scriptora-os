import { isSupabaseConfigured, isSupabasePublishableKey, readSupabaseEnv } from "@/integrations/supabase/client";
import { isValidJwtFormat } from "@/lib/supabase-function-auth";

export type EnvValidationIssueCode =
  | "missing_url"
  | "missing_key"
  | "placeholder_key"
  | "invalid_key_format"
  | "missing_anon_jwt"
  | "corrupted_env_value"
  | "safe_mode_blocked";

export interface EnvValidationIssue {
  code: EnvValidationIssueCode;
  message: string;
  hint?: string;
}

export interface EnvValidationResult {
  ok: boolean;
  issues: EnvValidationIssue[];
}

export interface EnvValidationResult {
  ok: boolean;
  safeMode: boolean;
  issues: EnvValidationIssue[];
}

const SUSPICIOUS_ENV_PATTERN = /INSERIRE|YOUR_|REPLACE|TODO|\$KEY|^cd ~\/|^undefined$|^null$/i;

function isSuspiciousEnvValue(value: string): boolean {
  const v = String(value || "").trim();
  if (!v) return false;
  return SUSPICIOUS_ENV_PATTERN.test(v);
}

export function detectEnvCorruption(): EnvValidationIssue[] {
  const { url, publishableKey, anonKey, key } = readSupabaseEnv();
  const issues: EnvValidationIssue[] = [];

  for (const [label, value] of [
    ["VITE_SUPABASE_URL", url],
    ["VITE_SUPABASE_PUBLISHABLE_KEY", publishableKey],
    ["VITE_SUPABASE_ANON_KEY", anonKey],
    ["browser key", key],
  ] as const) {
    if (value && isSuspiciousEnvValue(value)) {
      issues.push({
        code: "corrupted_env_value",
        message: `Invalid ${label} detected (corrupted or placeholder value).`,
        hint: "Check .env.local — it may be overriding working credentials. Run: npm run scriptora:repair",
      });
    }
  }

  if (issues.length > 0) {
    issues.push({
      code: "safe_mode_blocked",
      message: ".env.local may be overriding working credentials.",
      hint: "Run: npm run scriptora:doctor && npm run scriptora:repair",
    });
  }

  return issues;
}

export function validateSupabaseEnv(): EnvValidationResult {
  const corruption = detectEnvCorruption();
  if (corruption.length > 0) {
    return { ok: false, safeMode: true, issues: corruption };
  }

  const { url, key } = readSupabaseEnv();
  const issues: EnvValidationIssue[] = [];

  if (!url) {
    issues.push({
      code: "missing_url",
      message: "VITE_SUPABASE_URL is missing or empty.",
      hint: "Copy the Project URL from Supabase Dashboard → Project Settings → API.",
    });
  }

  if (!key) {
    issues.push({
      code: "missing_key",
      message:
        "VITE_SUPABASE_PUBLISHABLE_KEY (or VITE_SUPABASE_ANON_KEY) is missing or empty.",
      hint:
        "Set VITE_SUPABASE_PUBLISHABLE_KEY in Vercel → Environment Variables (Production). Locally: copy `.env.example` to `.env.local` and paste keys from Supabase Dashboard → API.",
    });
  } else if (/INSERIRE|YOUR_|REPLACE|TODO|\$KEY|^cd ~\//i.test(key)) {
    issues.push({
      code: "placeholder_key",
      message: "Supabase key is still a placeholder or corrupted value.",
      hint: "Replace with the anon JWT from Supabase Dashboard → Project Settings → API (starts with eyJ).",
    });
  } else if (isSupabasePublishableKey(key) && !isValidJwtFormat(readSupabaseEnv().edgeAuthKey)) {
    issues.push({
      code: "missing_anon_jwt",
      message: "Publishable key found but VITE_SUPABASE_ANON_KEY JWT is missing for AI generation.",
      hint: "Set VITE_SUPABASE_ANON_KEY to the legacy anon public JWT (eyJ...) alongside the publishable key.",
    });
  } else if (!isValidJwtFormat(key) && !isSupabasePublishableKey(key)) {
    issues.push({
      code: "invalid_key_format",
      message: "Supabase key is not a valid JWT or publishable key.",
      hint: "Copy the anon public key from Supabase Dashboard → API. It must start with eyJ.",
    });
  }

  return {
    ok: issues.length === 0 && isSupabaseConfigured(),
    safeMode: false,
    issues,
  };
}

export function warnSupabaseEnvInDev(): void {
  if (!import.meta.env.DEV) return;

  const result = validateSupabaseEnv();
  if (result.ok) return;

  console.warn("[Scriptora env] Supabase configuration incomplete:");
  for (const issue of result.issues) {
    console.warn(`  • ${issue.message}`);
    if (issue.hint) console.warn(`    ↳ ${issue.hint}`);
  }
}

export function buildMissingEnvHints(): string[] {
  const { issues } = validateSupabaseEnv();
  const hints = issues.map((issue) => issue.hint).filter(Boolean) as string[];

  if (hints.length === 0) {
    return [
      "Local dev: `cp .env.example .env.local` then fill Supabase keys from the dashboard.",
      "Production (Vercel): Project → Settings → Environment Variables — do not rely on `.env.production` in the repo.",
      "If you use a publishable key (sb_publishable_…), also set VITE_SUPABASE_ANON_KEY to the legacy anon JWT (eyJ…) for AI generation.",
    ];
  }

  return hints;
}
