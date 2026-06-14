import type { MarketAnalysis, KDPPackaging, SuccessPrediction, TitleVariants } from "@/lib/kdp/money-engine";
import type { KdpNarrativeFlow } from "@/lib/kdp/narrative-flow";

export type KdpLaunchStep =
  | "config"
  | "analysis"
  | "title"
  | "packaging"
  | "predict"
  | "narrative-flow"
  | "review"
  | "done";

export type KdpLaunchStatus = "idle" | "running" | "done" | "error";

export interface KdpLaunchConfig {
  idea: string;
  genre: string;
  language: string;
  chosenTitle: string;
  chosenSubtitle: string;
}

export interface KdpLaunchSession {
  sessionId: string;
  projectId?: string;
  currentStep: KdpLaunchStep;
  config: KdpLaunchConfig;
  analysis: MarketAnalysis | null;
  titles: TitleVariants | null;
  packaging: KDPPackaging | null;
  prediction: SuccessPrediction | null;
  narrativeFlow?: KdpNarrativeFlow | null;
  status: KdpLaunchStatus;
  error?: string;
  updatedAt: string;
  dirty?: boolean;
}

const ACTIVE_SESSION_KEY = "scriptora:kdp-launch-active-session";
const SESSION_PREFIX = "scriptora:kdp-launch-session:";
const STALE_RUNNING_MS = 5 * 60 * 1000;

function sessionKey(id: string): string {
  return `${SESSION_PREFIX}${id}`;
}

export function getOrCreateKdpSessionId(): string {
  try {
    const existing = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (existing) return existing;
    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `kdp-${Date.now()}`;
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
    return id;
  } catch {
    return `kdp-fallback-${Date.now()}`;
  }
}

export function createEmptyKdpSession(sessionId?: string): KdpLaunchSession {
  const id = sessionId || getOrCreateKdpSessionId();
  return {
    sessionId: id,
    currentStep: "config",
    config: {
      idea: "",
      genre: "Self-help",
      language: "Italian",
      chosenTitle: "",
      chosenSubtitle: "",
    },
    analysis: null,
    titles: null,
    packaging: null,
    prediction: null,
    narrativeFlow: null,
    status: "idle",
    updatedAt: new Date().toISOString(),
    dirty: false,
  };
}

export function loadKdpLaunchSession(sessionId?: string): KdpLaunchSession | null {
  const id = sessionId || getOrCreateKdpSessionId();
  try {
    const raw = localStorage.getItem(sessionKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KdpLaunchSession;
    if (!parsed?.sessionId || !parsed.config) return null;
    return normalizeStaleRunning(parsed);
  } catch {
    return null;
  }
}

function normalizeStaleRunning(session: KdpLaunchSession): KdpLaunchSession {
  if (session.status !== "running") return session;
  const age = Date.now() - new Date(session.updatedAt).getTime();
  if (age < STALE_RUNNING_MS) return session;
  return {
    ...session,
    status: "error",
    error: session.error || "La generazione precedente sembra essersi interrotta.",
  };
}

export function saveKdpLaunchSession(session: KdpLaunchSession): void {
  const next: KdpLaunchSession = {
    ...session,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, next.sessionId);
    localStorage.setItem(sessionKey(next.sessionId), JSON.stringify(next));
  } catch {
    /* quota — non-blocking */
  }
}

export function clearKdpLaunchSession(sessionId?: string): void {
  const id = sessionId || getOrCreateKdpSessionId();
  try {
    localStorage.removeItem(sessionKey(id));
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function mapLegacyStep(step: string): KdpLaunchStep {
  const map: Record<string, KdpLaunchStep> = {
    idea: "config",
    market: "analysis",
    title: "title",
    packaging: "packaging",
    predict: "predict",
    "narrative-flow": "narrative-flow",
    review: "review",
    done: "done",
  };
  return map[step] || "config";
}

export function stepToLegacy(step: KdpLaunchStep): string {
  const map: Record<KdpLaunchStep, string> = {
    config: "idea",
    analysis: "market",
    title: "title",
    packaging: "packaging",
    predict: "predict",
    "narrative-flow": "narrative-flow",
    review: "predict",
    done: "predict",
  };
  return map[step] || "idea";
}

export function isKdpSessionRecoverable(session: KdpLaunchSession | null): boolean {
  if (!session) return false;
  const hasWork = Boolean(
    session.config.idea.trim()
    || session.analysis
    || session.titles
    || session.packaging
    || session.prediction
    || session.narrativeFlow,
  );
  return hasWork && session.currentStep !== "config";
}

export function sessionNeedsUnloadGuard(session: KdpLaunchSession | null): boolean {
  if (!session) return false;
  if (session.status === "running") return true;
  return Boolean(session.dirty);
}
