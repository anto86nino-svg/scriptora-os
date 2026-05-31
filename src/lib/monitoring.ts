/**
 * Sprint A7 — lightweight production monitoring.
 * Dev: silent. Prod: enabled when VITE_SENTRY_DSN and/or VITE_MONITORING_ENDPOINT is set.
 * All paths fail silently — monitoring must never break the app.
 */

export type MonitoringArea =
  | "react"
  | "lazy_load"
  | "supabase_edge"
  | "checkout"
  | "export"
  | "voice_studio"
  | "generation"
  | "unknown";

export type MonitoringContext = {
  area?: MonitoringArea;
  extra?: Record<string, unknown>;
};

type QueuedReport = {
  kind: "exception" | "message";
  payload: string;
  area: MonitoringArea;
  extra?: Record<string, unknown>;
  at: string;
};

const QUEUE_KEY = "scriptora_monitoring_queue";
const MAX_QUEUE = 40;

let initialized = false;
let sentryReady = false;

function isMonitoringEnabled(): boolean {
  if (import.meta.env.DEV) return false;
  return Boolean(import.meta.env.VITE_SENTRY_DSN || import.meta.env.VITE_MONITORING_ENDPOINT);
}

function safeStringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function readQueue(): QueuedReport[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: QueuedReport[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {
    /* ignore quota / private mode */
  }
}

function enqueue(report: QueuedReport): void {
  if (!isMonitoringEnabled()) return;
  writeQueue([...readQueue(), report]);
}

async function flushQueue(): Promise<void> {
  const endpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
  if (!endpoint || typeof fetch !== "function") return;

  const queue = readQueue();
  if (queue.length === 0) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports: queue }),
      keepalive: true,
    });
    writeQueue([]);
  } catch {
    /* keep queue for a later flush */
  }
}

async function initSentry(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || sentryReady) return;

  try {
    const Sentry = await import("@sentry/react");
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_APP_VERSION,
      tracesSampleRate: 0.05,
      beforeSend(event) {
        if (import.meta.env.DEV) return null;
        return event;
      },
    });
    sentryReady = true;
  } catch {
    /* @sentry/react not installed or init failed — custom queue only */
  }
}

function sendToSentry(
  kind: "exception" | "message",
  value: unknown,
  context?: MonitoringContext,
): void {
  if (!sentryReady || import.meta.env.DEV) return;

  import("@sentry/react")
    .then((Sentry) => {
      const area = context?.area ?? "unknown";
      if (kind === "exception") {
        Sentry.captureException(value, {
          tags: { area },
          extra: context?.extra,
        });
      } else {
        Sentry.captureMessage(safeStringify(value), {
          level: "warning",
          tags: { area },
          extra: context?.extra,
        });
      }
    })
    .catch(() => {});
}

export function initMonitoring(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  if (!isMonitoringEnabled()) return;

  void initSentry();

  window.addEventListener("error", (event) => {
    captureException(event.error ?? event.message, { area: "react" });
  });

  window.addEventListener("unhandledrejection", (event) => {
    captureException(event.reason, { area: "react", extra: { unhandled: true } });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushQueue();
  });

  void flushQueue();
}

export function captureException(error: unknown, context?: MonitoringContext): void {
  if (!isMonitoringEnabled()) return;

  try {
    const area = context?.area ?? "unknown";
    enqueue({
      kind: "exception",
      payload: safeStringify(error),
      area,
      extra: context?.extra,
      at: new Date().toISOString(),
    });
    sendToSentry("exception", error, context);
  } catch {
    /* fail silently */
  }
}

export function captureMessage(message: string, context?: MonitoringContext): void {
  if (!isMonitoringEnabled()) return;

  try {
    const area = context?.area ?? "unknown";
    enqueue({
      kind: "message",
      payload: message,
      area,
      extra: context?.extra,
      at: new Date().toISOString(),
    });
    sendToSentry("message", message, context);
  } catch {
    /* fail silently */
  }
}

export function onLazyLoadFailure(componentName: string, error: unknown): void {
  captureException(error, {
    area: "lazy_load",
    extra: { component: componentName },
  });
}

/** Test helper — not for production UI */
export function __readMonitoringQueueForTests(): QueuedReport[] {
  return readQueue();
}

export function __clearMonitoringQueueForTests(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    /* ignore */
  }
}
