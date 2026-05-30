import { isSupabaseConfigured, isSupabasePublishableKey, readSupabaseEnv } from "@/integrations/supabase/client";
import { isValidJwtFormat } from "@/lib/supabase-function-auth";

export type EnvValidationIssueCode =
  | "missing_url"
  | "missing_key"
  | "placeholder_key"
  | "invalid_key_format"
  | "missing_anon_jwt";

export interface EnvValidationIssue {
  code: EnvValidationIssueCode;
  message: string;
  hint?: string;
}

export interface EnvValidationResult {
  ok: boolean;
  issues: EnvValidationIssue[];
}

export function validateSupabaseEnv(): EnvValidationResult {
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
        "After `vercel env pull .env`, the anon key is often blank. Paste it from Supabase Dashboard → API → anon public key, or copy a populated `.env.production`.",
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
      "In locale puoi eseguire `vercel env pull .env` oppure copiare `.env.example`.",
      "Se `vercel env pull` lascia la chiave anon vuota, incollala manualmente dal dashboard Supabase.",
    ];
  }

  return hints;
}
