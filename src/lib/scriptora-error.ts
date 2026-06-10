/**
 * Scriptora Error Intelligence Layer
 *
 * Structured error classification for all generation, auth, and edge function
 * failures. Replaces generic "AI not responding" with actionable diagnostics.
 *
 * USER sees: human-readable premium message (title + cause + probableFix)
 * DEV sees: full runtimeData in console via scriptoraLog()
 */

export type ScriptoraErrorCategory =
  | "auth"
  | "generation"
  | "credits"
  | "edge_function"
  | "network"
  | "runtime"
  | "ui";

export interface ScriptoraError {
  category: ScriptoraErrorCategory;
  title: string;
  cause: string;
  probableFix?: string;
  fileHint?: string;
  runtimeData?: unknown;
}

// ─── Classifier ────────────────────────────────────────────────────────────

/**
 * Classify any thrown error into a structured ScriptoraError.
 * Called at catch-boundaries in generation.ts and useBookEngine.ts.
 */
export function classifyError(
  err: unknown,
  context?: {
    operation?: string;    // "blueprint" | "chapter" | "rewrite" | "kdp" | "coach"
    chapterIndex?: number;
    fileHint?: string;
  },
): ScriptoraError {
  const msg = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const op = context?.operation ?? "generation";
  const ch = context?.chapterIndex != null ? ` (chapter ${context.chapterIndex + 1})` : "";

  if (err && typeof err === "object" && (err as { name?: string }).name === "ProjectGenerationBlockedError") {
    const blocked = err as { message: string; issues?: Array<{ message: string }> };
    const detail = blocked.issues?.map((issue) => issue.message).join(" · ") || blocked.message;
    return {
      category: "generation",
      title: "Configurazione libro incompleta",
      cause: detail,
      probableFix: "Apri Struttura, completa genere/lingua/blueprint, oppure elimina il progetto e ricomincia dal Dashboard.",
      fileHint: "src/lib/project-generation-readiness.ts",
      runtimeData: blocked.issues,
    };
  }

  if (err && typeof err === "object" && (err as { name?: string }).name === "BlueprintValidationError") {
    const blueprintErr = err as { message: string; errors?: string[] };
    return {
      category: "generation",
      title: "Blueprint non valido",
      cause: blueprintErr.message,
      probableFix: "Apri Struttura e usa «Rigenera Blueprint» oppure «Crea struttura base sicura».",
      fileHint: "src/lib/blueprint-recovery.ts",
      runtimeData: blueprintErr.errors,
    };
  }

  // ── Auth / JWT ──
  if (/401|unauthorized|jwt|invalid.*token|not.*authenticated/i.test(msg)) {
    return {
      category: "auth",
      title: `Auth failure — ${op}${ch}`,
      cause: "JWT missing or rejected by edge function",
      probableFix: "Log out and log back in. If this persists, check VITE_SUPABASE_URL in Vercel env.",
      fileHint: context?.fileHint ?? "src/lib/generation.ts",
      runtimeData: msg,
    };
  }

  // ── Credits / DeepSeek quota ──
  if (/credit|quota|402|exhausted|insufficient.*balance/i.test(msg)) {
    return {
      category: "credits",
      title: "AI credits exhausted",
      cause: "DeepSeek API balance is zero or the key is invalid",
      probableFix: "Add balance to the DeepSeek account or check DEEPSEEK_API_KEY in Supabase edge function secrets.",
      fileHint: "Supabase → Edge Functions → Secrets",
      runtimeData: msg,
    };
  }

  // ── Rate limit ──
  if (/429|rate.limit|too.many.request/i.test(msg)) {
    return {
      category: "edge_function",
      title: `Rate limited — ${op}${ch}`,
      cause: "DeepSeek or Supabase rate limit hit",
      probableFix: "Wait 30–60 seconds and retry.",
      runtimeData: msg,
    };
  }

  // ── Timeout / abort ──
  if (/timeout|timed out|aborted|AbortError|no response/i.test(msg)) {
    return {
      category: "network",
      title: `Timeout — ${op}${ch}`,
      cause: "Edge function did not respond within the allowed window",
      probableFix: op === "blueprint"
        ? "Retry. If consistent, check generate-blueprint-fast logs in Supabase dashboard."
        : "Retry. The AI was slow but likely healthy — try a shorter chapter length.",
      fileHint: `supabase/functions/generate-${op === "blueprint" ? "blueprint-fast" : "book"}/index.ts`,
      runtimeData: msg,
    };
  }

  // ── Empty / missing content ──
  if (/empty|no.*content|missing.*content|marker.*not.*found/i.test(msg)) {
    return {
      category: "generation",
      title: `Empty response — ${op}${ch}`,
      cause: "Edge function returned no content (DeepSeek may have returned empty choices)",
      probableFix: "Retry. If consistent, check DeepSeek dashboard for model availability.",
      fileHint: "src/lib/generation.ts",
      runtimeData: msg,
    };
  }

  // ── Circuit breaker ──
  if (/circuit.breaker|service.paused|retry.in/i.test(msg)) {
    return {
      category: "edge_function",
      title: `Service temporarily paused — ${op}`,
      cause: "Circuit breaker opened after consecutive failures",
      probableFix: "Wait 30 seconds and retry. The system will auto-resume.",
      runtimeData: msg,
    };
  }

  // ── Missing env / config ──
  if (/missing.*supabase|missing.*config|VITE_SUPABASE/i.test(msg)) {
    return {
      category: "runtime",
      title: "Missing configuration",
      cause: "VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY not set",
      probableFix: "Add the environment variables to Vercel (or .env for local dev).",
      fileHint: ".env / Vercel → Environment Variables",
      runtimeData: msg,
    };
  }

  // ── Network / fetch ──
  if (/fetch|network|CORS|failed.to.fetch/i.test(msg)) {
    return {
      category: "network",
      title: `Network error — ${op}${ch}`,
      cause: "Could not reach Supabase edge function",
      probableFix: "Check internet connection. If on Vercel, verify VITE_SUPABASE_URL is set correctly.",
      runtimeData: msg,
    };
  }

  // ── JSON parse ──
  if (/parse|JSON|unexpected.*token|SyntaxError/i.test(msg)) {
    return {
      category: "generation",
      title: `Malformed response — ${op}${ch}`,
      cause: "Edge function returned invalid JSON — the AI stream may have been cut",
      probableFix: "Retry. If consistent, the edge function may be crashing mid-stream.",
      fileHint: "src/lib/generation.ts → callAIOnce",
      runtimeData: msg,
    };
  }

  // ── Fallback ──
  return {
    category: "generation",
    title: `${op.charAt(0).toUpperCase() + op.slice(1)} failed${ch}`,
    cause: msg,
    probableFix: "Retry. If this keeps happening, open DevTools → Console for full details.",
    fileHint: context?.fileHint,
    runtimeData: msg,
  };
}

/**
 * Format a ScriptoraError for display in the chat panel.
 * Returns a human-readable string — no raw stack traces.
 */
export function formatUserMessage(err: ScriptoraError): string {
  let out = `❌ **${err.title}**\n${err.cause}`;
  if (err.probableFix) out += `\n💡 ${err.probableFix}`;
  return out;
}

/**
 * Format a ScriptoraError for toast (single line).
 */
export function formatToastMessage(err: ScriptoraError): string {
  return `${err.title} — ${err.cause}`;
}
