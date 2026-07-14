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

type CoreLogCategory =
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

type LogCategory =
  | CoreLogCategory
  | Lowercase<CoreLogCategory>
  | "continuity-gate"
  | "front-matter"
  | "back-matter"
  | "book-structure"
  | "subchapter"
  | "regenerate-chapter"
  | "rewrite-chapter"
  | "auto-rewrite"
  | "generate-complete"
  | "queued-chapter";

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

export type GenerationStartMeta = {
  jwtPresent?: boolean;
  userId?: string | null;
  taskType?: string;
  projectId?: string;
};

export type GenerationEndMeta = {
  status?: number;
  chars?: number;
  durationMs?: number;
  taskType?: string;
};

export type EdgeErrorMeta = {
  status?: number;
  body?: string;
  jwtKind?: "user" | "anon";
  taskType?: string;
  projectId?: string;
};

function normalizeStartMeta(meta?: GenerationStartMeta): Required<Pick<GenerationStartMeta, "jwtPresent">> & GenerationStartMeta {
  return {
    jwtPresent: meta?.jwtPresent ?? false,
    userId: meta?.userId ?? null,
    taskType: meta?.taskType,
    projectId: meta?.projectId,
  };
}

function normalizeEndMeta(meta?: GenerationEndMeta): GenerationEndMeta {
  return meta ?? {};
}

function normalizeEdgeMeta(meta?: EdgeErrorMeta): Required<Pick<EdgeErrorMeta, "status" | "body" | "jwtKind">> & EdgeErrorMeta {
  return {
    status: meta?.status ?? 0,
    body: meta?.body ?? "",
    jwtKind: meta?.jwtKind ?? "anon",
    taskType: meta?.taskType,
    projectId: meta?.projectId,
  };
}

export function logGenerationStart(
  category: LogCategory,
  op: string,
  meta?: GenerationStartMeta,
): void {
  const normalized = normalizeStartMeta(meta);
  scriptoraLog.always(category, `${op} start`, {
    jwt: normalized.jwtPresent ? "present" : "ABSENT (anon fallback)",
    userId: normalized.userId ?? "unknown",
    taskType: normalized.taskType,
    projectId: normalized.projectId,
  });
}

export function logGenerationEnd(
  category: LogCategory,
  op: string,
  meta?: GenerationEndMeta,
): void {
  scriptoraLog.always(category, `${op} complete`, normalizeEndMeta(meta));
}

export function logEdgeError(
  category: LogCategory,
  op: string,
  meta?: EdgeErrorMeta,
): void {
  const normalized = normalizeEdgeMeta(meta);
  scriptoraLog.error(category, `${op} edge function rejected`, {
    status: normalized.status,
    jwtKind: normalized.jwtKind,
    body: normalized.body.slice(0, 300),
    taskType: normalized.taskType,
    projectId: normalized.projectId,
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
