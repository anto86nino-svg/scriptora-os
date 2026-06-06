/**
 * Scriptora Observability Logger
 *
 * Lightweight structured logging for generation, auth, and edge function calls.
 * Logs only meaningful events — no per-chunk spam.
 *
 * Format: [SCRIPTORA][CATEGORY] message {data?}
 *
 * Enable verbose mode in DevTools:
 *   window.__SCRIPTORA_VERBOSE__ = true
 *   localStorage.setItem('scriptora-verbose', '1')
 */

type LogCategory =
  | "AUTH"
  | "GENERATION"
  | "BLUEPRINT"
  | "CHAPTER"
  | "REWRITE"
  | "EDGE"
  | "CREDITS"
  | "KDP"
  | "COACH"
  | "PLAN";

const isVerbose = (): boolean => {
  try {
    if (typeof window === "undefined") return false;
    if ((window as any).__SCRIPTORA_VERBOSE__ === true) return true;
    return localStorage.getItem("scriptora-verbose") === "1";
  } catch { return false; }
};

function tag(category: LogCategory): string {
  return `[SCRIPTORA][${category}]`;
}

export const scriptoraLog = {
  info(category: LogCategory, message: string, data?: unknown): void {
    if (!isVerbose()) return;
    if (data !== undefined) console.log(tag(category), message, data);
    else console.log(tag(category), message);
  },

  warn(category: LogCategory, message: string, data?: unknown): void {
    if (data !== undefined) console.warn(tag(category), message, data);
    else console.warn(tag(category), message);
  },

  error(category: LogCategory, message: string, data?: unknown): void {
    if (data !== undefined) console.error(tag(category), message, data);
    else console.error(tag(category), message);
  },

  /** Always logs regardless of verbose mode — for critical start/end events */
  always(category: LogCategory, message: string, data?: unknown): void {
    if (data !== undefined) console.log(tag(category), message, data);
    else console.log(tag(category), message);
  },
};

// ─── Generation lifecycle helpers ──────────────────────────────────────────

export function logGenerationStart(
  category: LogCategory,
  op: string,
  meta: { jwtPresent: boolean; userId?: string | null },
): void {
  scriptoraLog.always(category, `${op} start`, {
    jwt: meta.jwtPresent ? "present" : "ABSENT (anon fallback)",
    userId: meta.userId ?? "unknown",
  });
}

export function logGenerationEnd(
  category: LogCategory,
  op: string,
  meta: { status?: number; chars?: number; durationMs?: number },
): void {
  scriptoraLog.always(category, `${op} complete`, meta);
}

export function logEdgeError(
  category: LogCategory,
  op: string,
  meta: { status: number; body: string; jwtKind: "user" | "anon" },
): void {
  scriptoraLog.error(category, `${op} edge function rejected`, {
    status: meta.status,
    jwtKind: meta.jwtKind,
    body: meta.body.slice(0, 300),
  });
}

export function logRetry(
  category: LogCategory,
  op: string,
  attempt: number,
  reason: string,
): void {
  scriptoraLog.warn(category, `${op} retry attempt ${attempt}`, { reason });
}
