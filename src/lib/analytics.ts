/**
 * Sprint A7 — minimal, privacy-aware analytics abstraction.
 * Dev: silent. Prod: queues locally + optional POST to VITE_ANALYTICS_ENDPOINT.
 * No third-party lock-in required.
 */

export type AnalyticsEvent =
  | "signup_started"
  | "signup_completed"
  | "first_project_created"
  | "book_generation_started"
  | "book_generation_completed"
  | "voice_studio_opened"
  | "market_tool_opened"
  | "paywall_opened"
  | "checkout_started"
  | "checkout_completed";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

type AnalyticsRow = {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
  at: string;
};

const QUEUE_KEY = "scriptora_analytics_queue";
const MAX_QUEUE = 100;
const FIRST_PROJECT_KEY = "scriptora_analytics_first_project_sent";

function isAnalyticsEnabled(): boolean {
  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEBUG !== "1") return false;
  return true;
}

function sanitizeProps(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const out: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (typeof value === "string" && value.length > 200) {
      out[key] = value.slice(0, 200);
      continue;
    }
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readQueue(): AnalyticsRow[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalyticsRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: AnalyticsRow[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch {
    /* ignore */
  }
}

async function flushQueue(): Promise<void> {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
  if (!endpoint || typeof fetch !== "function") return;

  const queue = readQueue();
  if (queue.length === 0) return;

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: queue }),
      keepalive: true,
    });
    writeQueue([]);
  } catch {
    /* keep queue */
  }
}

export function trackEvent(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (!isAnalyticsEnabled()) return;

  try {
    const row: AnalyticsRow = {
      event,
      props: sanitizeProps(props),
      at: new Date().toISOString(),
    };
    writeQueue([...readQueue(), row]);
    void flushQueue();
  } catch {
    /* fail silently */
  }
}

/** Fire first_project_created at most once per browser profile. */
export function trackFirstProjectCreated(props?: AnalyticsProps): void {
  try {
    if (localStorage.getItem(FIRST_PROJECT_KEY) === "1") return;
    trackEvent("first_project_created", props);
    localStorage.setItem(FIRST_PROJECT_KEY, "1");
  } catch {
    trackEvent("first_project_created", props);
  }
}

export function trackMarketToolOpened(tool: string): void {
  trackEvent("market_tool_opened", { tool });
}

export function trackPaywallOpened(reason?: string): void {
  trackEvent("paywall_opened", reason ? { reason } : undefined);
}

/** Test helpers */
export function __readAnalyticsQueueForTests(): AnalyticsRow[] {
  return readQueue();
}

export function __clearAnalyticsQueueForTests(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
    localStorage.removeItem(FIRST_PROJECT_KEY);
  } catch {
    /* ignore */
  }
}
