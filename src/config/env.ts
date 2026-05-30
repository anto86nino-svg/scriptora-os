// Centralized, browser-safe environment access.
// Reads ONLY VITE_* variables. Provides safe fallbacks so the app never
// crashes when a variable is missing (e.g., fresh GitHub clone without .env).
//
// Server-only secrets (DEEPSEEK_API_KEY, GEMINI_API_KEY, BRAVE_SEARCH_API_KEY,
// SUPABASE_SERVICE_ROLE_KEY) are NEVER read here. They live in Supabase Edge
// Function secrets or GitHub Actions secrets.

function readEnv(key: string, fallback = ""): string {
  try {
    const v = (import.meta as any)?.env?.[key];
    return typeof v === "string" ? v : fallback;
  } catch {
    return fallback;
  }
}

function readBool(key: string, fallback = false): boolean {
  const v = readEnv(key, "");
  if (!v) return fallback;
  return v === "true" || v === "1";
}

/** App-wide identity & build metadata. */
export const appEnv = {
  appName: "Scriptora",
  appVersion: readEnv("VITE_APP_VERSION", "0.1.0"),
  buildChannel: readEnv("VITE_BUILD_CHANNEL", "alpha"),
  isProduction: readEnv("MODE", "") === "production",
} as const;

/** Public Supabase configuration. Publishable + legacy anon JWT only. */
export const supabaseEnv = {
  url: readEnv("VITE_SUPABASE_URL", ""),
  publishableKey: readEnv("VITE_SUPABASE_PUBLISHABLE_KEY", ""),
  anonJwt: readEnv("VITE_SUPABASE_ANON_KEY", ""),
  browserKey:
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "") ||
    readEnv("VITE_SUPABASE_ANON_KEY", ""),
  projectId: readEnv("VITE_SUPABASE_PROJECT_ID", ""),
  configured:
    !!readEnv("VITE_SUPABASE_URL", "") &&
    !!(readEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "") || readEnv("VITE_SUPABASE_ANON_KEY", "")),
} as const;

/** Public AI feature flags. Real keys live server-side. */
export const aiEnv = {
  provider: readEnv("VITE_AI_PROVIDER", "deepseek"),
  geminiEnabled: readBool("VITE_ENABLE_GEMINI", false),
} as const;

/** Payments configuration mirror — kept here for cross-cutting feature flags. */
export const paymentsEnv = {
  enabled: readBool("VITE_ENABLE_PAYMENTS", false),
  mode: readEnv("VITE_PAYMENT_MODE", "coming_soon"),
  provider: readEnv("VITE_PAYMENT_PROVIDER", "none"),
} as const;

/** Downloads configuration mirror. */
export const downloadsEnv = {
  enabled: readBool("VITE_ENABLE_DOWNLOADS", false),
  mode: readEnv("VITE_DOWNLOAD_MODE", "coming_soon"),
} as const;

/** Aggregated public feature flags consumable by any component. */
export const publicFeatureFlags = {
  paymentsLive: paymentsEnv.enabled && paymentsEnv.mode !== "coming_soon",
  downloadsLive: downloadsEnv.enabled && downloadsEnv.mode === "live",
  geminiEnabled: aiEnv.geminiEnabled,
  supabaseConfigured: supabaseEnv.configured,
} as const;

/**
 * Minimal startup validation. Logs (does NOT throw) when critical public
 * variables are missing, so a fresh clone without .env still boots.
 */
export function validateEnv(): { ok: boolean; warnings: string[] } {
  const warnings: string[] = [];
  if (!supabaseEnv.url) warnings.push("VITE_SUPABASE_URL is missing — backend features disabled.");
  if (!supabaseEnv.browserKey) {
    warnings.push("VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY) is missing — auth disabled.");
  } else if (supabaseEnv.publishableKey && !supabaseEnv.anonJwt) {
    warnings.push("VITE_SUPABASE_ANON_KEY JWT missing — AI Edge Functions may fail until the legacy anon key is set.");
  }
  if (warnings.length && typeof console !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[Scriptora env]", warnings.join(" "));
  }
  return { ok: warnings.length === 0, warnings };
}