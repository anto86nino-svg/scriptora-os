import { safeParseStorage } from "@/lib/user-friendly-error";

export type ScriptoraUsageEventName =
  | "login"
  | "logout"
  | "dashboard_opened"
  | "home_cta_clicked"
  | "book_forge_opened"
  | "title_generated"
  | "blueprint_generation_requested"
  | "blueprint_generated"
  | "blueprint_saved"
  | "free_blueprint_limit_blocked"
  | "paywall_opened"
  | "upgrade_clicked"
  | "buy_credits_clicked"
  | "pay_per_project_clicked"
  | "project_unlocked"
  | "writer_opened"
  | "chapter_generation_requested"
  | "chapter_completed"
  | "ai_fallback_used"
  | "study_opened"
  | "study_material_uploaded"
  | "study_summary_generated"
  | "study_quiz_generated"
  | "study_fallback_local_used"
  | "cover_opened"
  | "cover_saved"
  | "kdp_opened"
  | "keyword_gold_opened"
  | "export_requested"
  | "publishing_readiness_viewed";

export interface ScriptoraUsageEvent {
  id: string;
  eventName: ScriptoraUsageEventName;
  timestamp: string;
  anonId: string;
  projectId?: string;
  planId?: string;
  route?: string;
  tool?: string;
  success?: boolean;
  errorCategory?: string;
  durationMs?: number;
  cta?: string;
}

export interface UsageAnalyticsSummary {
  totalEvents: number;
  byEvent: Record<string, number>;
  byTool: Record<string, number>;
  fallbackCount: number;
  paywallViews: number;
  blueprintGenerated: number;
  projectsCreated: number;
  topCtas: { cta: string; count: number }[];
  funnel: {
    home: number;
    bookForge: number;
    blueprint: number;
    paywall: number;
    writing: number;
  };
}

const STORAGE_KEY = "scriptora-dev-usage-events-v1";
const ANON_KEY = "scriptora-dev-usage-anon-id";
const MAX_EVENTS = 500;

function canStoreUsage(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  try {
    return import.meta.env.DEV || localStorage.getItem("scriptora-dev-mode") === "1";
  } catch {
    return false;
  }
}

function makeId(prefix = "usage"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getAnonId(): string {
  try {
    const current = localStorage.getItem(ANON_KEY);
    if (current) return current;
    const next = makeId("anon");
    localStorage.setItem(ANON_KEY, next);
    return next;
  } catch {
    return "anon-session";
  }
}

function sanitizeEvent(input: Omit<ScriptoraUsageEvent, "id" | "timestamp" | "anonId">): ScriptoraUsageEvent {
  return {
    id: makeId(),
    timestamp: new Date().toISOString(),
    anonId: getAnonId(),
    eventName: input.eventName,
    projectId: input.projectId,
    planId: input.planId,
    route: input.route || (typeof location !== "undefined" ? location.pathname : undefined),
    tool: input.tool,
    success: input.success,
    errorCategory: input.errorCategory,
    durationMs: input.durationMs,
    cta: input.cta,
  };
}

export function getUsageEvents(): ScriptoraUsageEvent[] {
  if (typeof localStorage === "undefined") return [];
  return safeParseStorage<ScriptoraUsageEvent[]>(localStorage.getItem(STORAGE_KEY), [])
    .filter((event) => event && typeof event.eventName === "string")
    .slice(-MAX_EVENTS);
}

export function trackScriptoraEvent(input: Omit<ScriptoraUsageEvent, "id" | "timestamp" | "anonId">): void {
  if (!canStoreUsage()) return;
  try {
    const next = [...getUsageEvents(), sanitizeEvent(input)].slice(-MAX_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("scriptora-usage-analytics-change"));
  } catch {
    // Analytics is strictly best-effort.
  }
}

export function clearUsageEvents(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("scriptora-usage-analytics-change"));
  } catch {
    // noop
  }
}

export function summarizeUsageEvents(events: ScriptoraUsageEvent[] = getUsageEvents()): UsageAnalyticsSummary {
  const byEvent: Record<string, number> = {};
  const byTool: Record<string, number> = {};
  const byCta: Record<string, number> = {};
  for (const event of events) {
    byEvent[event.eventName] = (byEvent[event.eventName] || 0) + 1;
    if (event.tool) byTool[event.tool] = (byTool[event.tool] || 0) + 1;
    if (event.cta) byCta[event.cta] = (byCta[event.cta] || 0) + 1;
  }
  return {
    totalEvents: events.length,
    byEvent,
    byTool,
    fallbackCount: (byEvent.ai_fallback_used || 0) + (byEvent.study_fallback_local_used || 0),
    paywallViews: byEvent.paywall_opened || 0,
    blueprintGenerated: byEvent.blueprint_generated || 0,
    projectsCreated: byEvent.blueprint_saved || 0,
    topCtas: Object.entries(byCta)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([cta, count]) => ({ cta, count })),
    funnel: {
      home: byEvent.home_cta_clicked || 0,
      bookForge: byEvent.book_forge_opened || 0,
      blueprint: byEvent.blueprint_generated || 0,
      paywall: byEvent.paywall_opened || 0,
      writing: byEvent.writer_opened || byEvent.chapter_generation_requested || 0,
    },
  };
}
