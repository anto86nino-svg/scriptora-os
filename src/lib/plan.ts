// Plan & quota system — frontend-first MVP.
// Dev mode bypasses ALL limits. Token usage is sourced from ai_usage_logs per project_id.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { getCurrentUserId } from "@/services/storageService";

export type PlanTier = "free" | "beta" | "pro" | "premium";

export interface PlanLimits {
  maxTokensPerBook: number | null; // null = unlimited
  maxBooksPerMonth: number | null;
  canExport: boolean;
  canDominate: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free:    { maxTokensPerBook: 10_000, maxBooksPerMonth: 1,    canExport: false, canDominate: false },
  beta:    { maxTokensPerBook: 15_000, maxBooksPerMonth: 3,    canExport: true,  canDominate: false },
  pro:     { maxTokensPerBook: null,   maxBooksPerMonth: 10,   canExport: true,  canDominate: false },
  premium: { maxTokensPerBook: null,   maxBooksPerMonth: null, canExport: true,  canDominate: true  },
};

// Pricing display aligned with commercialPlans (legacy PlanTier gates unchanged).
export const PLAN_PRICING: Record<PlanTier, { price: string; period: string }> = {
  free:    { price: "€0",     period: "/forever" },
  beta:    { price: "Free",   period: "/anteprima editoriale" },
  pro:     { price: "€19,99", period: "/mese" },
  premium: { price: "€49,99", period: "/mese" },
};

// External Stripe Payment Links (placeholders — replace with real ones).
export const STRIPE_LINKS = {
  pro:     "https://buy.stripe.com/test_PRO_PLACEHOLDER",
  premium: "https://buy.stripe.com/test_PREMIUM_PLACEHOLDER",
};

const PLAN_CACHE_KEY = "nexora_plan_cache_v1";

/** Allowed client-side writes until Stripe webhooks + service-role own user_plans. */
export type PlanClientWriteReason = "beta-exit";

async function upsertUserPlan(userId: string, plan: PlanTier): Promise<void> {
  const { error } = await supabase
    .from("user_plans" as any)
    .upsert({ user_id: userId, plan, period_start: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function fetchPlan(): Promise<PlanTier> {
  const userId = getCurrentUserId();
  if (userId === "public-user") return "free";
  try {
    const { data, error } = await supabase
      .from("user_plans" as any)
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const plan = ((data as any)?.plan as PlanTier) || "free";
    try { localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify({ userId, plan })); } catch { /* noop */ }
    return plan;
  } catch {
    try {
      const raw = localStorage.getItem(PLAN_CACHE_KEY);
      if (raw) {
        const c = JSON.parse(raw);
        if (c.userId === userId) return c.plan as PlanTier;
      }
    } catch { /* noop */ }
    return "free";
  }
}

/**
 * Client plan write — restricted.
 *
 * Production upgrades (pro/premium/beta) MUST come from edge functions or Stripe webhooks.
 * TODO(backend): RLS — revoke INSERT/UPDATE on public.user_plans for authenticated role;
 * allow only service_role / webhook handler.
 */
export async function setPlan(plan: PlanTier, reason?: PlanClientWriteReason): Promise<void> {
  const userId = getCurrentUserId();
  if (userId === "public-user") return;

  if (isDevMode()) {
    console.warn("[plan] setPlan blocked in dev mode — use setDevPlanOverride()");
    return;
  }

  if (reason !== "beta-exit" || plan !== "free") {
    console.warn("[plan] Blocked client plan write:", plan, reason);
    throw new Error("PLAN_WRITE_FORBIDDEN");
  }

  await upsertUserPlan(userId, plan);
  try {
    localStorage.setItem(PLAN_CACHE_KEY, JSON.stringify({ userId, plan }));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new Event("nexora-plan-change"));
}

export async function getProjectTokenUsage(projectId: string): Promise<number> {
  const { data, error } = await supabase
    .from("ai_usage_logs" as any)
    .select("total_tokens")
    .eq("project_id", projectId);
  if (error) return 0;
  return ((data as any[]) || []).reduce((s, r) => s + (Number(r.total_tokens) || 0), 0);
}

// Count books created this month (rolling calendar month) for the user.
export async function getBooksThisMonth(): Promise<number> {
  const userId = getCurrentUserId();
  if (userId === "public-user") return 0;
  const start = new Date();
  start.setDate(1); start.setHours(0, 0, 0, 0);
  try {
    const { count, error } = await supabase
      .from("projects" as any)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", start.toISOString());
    if (error) return 0;
    return count || 0;
  } catch {
    return 0;
  }
}

export interface QuotaState {
  plan: PlanTier;
  limits: PlanLimits;
  isDev: boolean;
  tokensUsed: number;
  tokensRemaining: number | null;
  isOverTokenLimit: boolean;
  canExport: boolean;
  canDominate: boolean;
}

export async function getQuotaForProject(projectId: string | null): Promise<QuotaState> {
  const dev = isDevMode();
  const plan: PlanTier = dev ? getDevPlanOverride() : await fetchPlan();
  const limits = PLAN_LIMITS[plan];
  const tokensUsed = projectId ? await getProjectTokenUsage(projectId) : 0;
  const max = limits.maxTokensPerBook;
  const tokensRemaining = max == null ? null : Math.max(0, max - tokensUsed);
  // In dev mode we still REPORT the limit honestly so the UI can be tested,
  // but enforcement (canExport / canDominate) follows the simulated plan as well —
  // except for "premium" which keeps full bypass behaviour the owner expects.
  const devPremium = dev && plan === "premium";
  const isOverTokenLimit = !devPremium && max != null && tokensUsed >= max;
  return {
    plan,
    limits,
    isDev: dev,
    tokensUsed,
    tokensRemaining,
    isOverTokenLimit,
    canExport: devPremium || limits.canExport,
    canDominate: devPremium || limits.canDominate,
  };
}

export function usePlan(): { plan: PlanTier; isDev: boolean; loading: boolean; refresh: () => void } {
  const [plan, setPlanState] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const dev = isDevMode();
    if (dev) {
      setPlanState(getDevPlanOverride());
      setLoading(false);
      const sync = () => setTick((t) => t + 1);
      window.addEventListener("nexora-plan-change", sync);
      window.addEventListener("nexora-dev-mode-change", sync);
      return () => {
        window.removeEventListener("nexora-plan-change", sync);
        window.removeEventListener("nexora-dev-mode-change", sync);
      };
    }
    fetchPlan().then((p) => {
      if (!cancelled) { setPlanState(p); setLoading(false); }
    });
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("nexora-plan-change", sync);
    window.addEventListener("nexora-dev-mode-change", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("nexora-plan-change", sync);
      window.removeEventListener("nexora-dev-mode-change", sync);
    };
  }, [tick]);

  return { plan, isDev: isDevMode(), loading, refresh: () => setTick((t) => t + 1) };
}

export function useQuota(projectId: string | null): { quota: QuotaState | null; refresh: () => void } {
  const [quota, setQuota] = useState<QuotaState | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getQuotaForProject(projectId).then((q) => { if (!cancelled) setQuota(q); });
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("nexora-plan-change", sync);
    window.addEventListener("nexora-dev-mode-change", sync);
    window.addEventListener("nexora-usage-change", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("nexora-plan-change", sync);
      window.removeEventListener("nexora-dev-mode-change", sync);
      window.removeEventListener("nexora-usage-change", sync);
    };
  }, [projectId, tick]);
  return { quota, refresh: () => setTick((t) => t + 1) };
}

// Lightweight hook: returns books-this-month count (re-fetches on plan/usage changes).
export function useBooksThisMonth(): number {
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getBooksThisMonth().then((n) => { if (!cancelled) setCount(n); });
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("nexora-plan-change", sync);
    window.addEventListener("nexora-usage-change", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("nexora-plan-change", sync);
      window.removeEventListener("nexora-usage-change", sync);
    };
  }, [tick]);
  return count;
}
