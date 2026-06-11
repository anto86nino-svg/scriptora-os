/**
 * Trending Niches paywall
 * -----------------------
 * Frontend gate for the "Scopri trend / Ricarica" button.
 *
 * Rules:
 *  - dev mode → unlimited (always allowed, no log)
 *  - premium / pro → allowed, each click costs €0.50 (tracked via ai_usage_logs
 *    with task_type='trending_niches_click', input_cost=0.50)
 *  - beta → 1 free click TOTAL for the lifetime of the account, then blocked
 *  - free → blocked, must upgrade
 *
 * NOTE: This is frontend-only enforcement (consistent with the rest of the
 * plan/quota system in this app). Real billing will be wired later.
 */

import { supabase } from "@/integrations/supabase/client";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { fetchPlan, type PlanTier } from "@/lib/plan";
import { getCurrentUserId } from "@/services/storageService";

export const TRENDING_TASK_TYPE = "trending_niches_click";
export const TRENDING_PRICE_EUR = 0.5;
export const BETA_FREE_TRENDING_CLICKS = 1;

export interface TrendingGate {
  allowed: boolean;
  reason: "dev" | "paid" | "beta-free" | "beta-exhausted" | "free-blocked";
  plan: PlanTier;
  isDev: boolean;
  betaUsed: number;
  betaRemaining: number;
  pricePerClick: number;
}

async function countBetaClicks(userId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from("ai_usage_logs" as any)
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("task_type", TRENDING_TASK_TYPE);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export async function getTrendingGate(): Promise<TrendingGate> {
  const dev = isDevMode();
  // In dev mode use the simulated tier (free/beta/pro/premium) so we can test
  // every paywall path. Only Premium gets the full bypass below.
  const plan: PlanTier = dev ? getDevPlanOverride() : await fetchPlan();
  const userId = getCurrentUserId();

  if (dev && plan === "premium") {
    return {
      allowed: true, reason: "dev", plan, isDev: true,
      betaUsed: 0, betaRemaining: Infinity, pricePerClick: 0,
    };
  }
  if (plan === "pro" || plan === "premium") {
    return {
      allowed: true, reason: "paid", plan, isDev: false,
      betaUsed: 0, betaRemaining: 0, pricePerClick: TRENDING_PRICE_EUR,
    };
  }
  if (plan === "beta") {
    const used = await countBetaClicks(userId);
    const remaining = Math.max(0, BETA_FREE_TRENDING_CLICKS - used);
    return {
      allowed: remaining > 0,
      reason: remaining > 0 ? "beta-free" : "beta-exhausted",
      plan, isDev: false, betaUsed: used, betaRemaining: remaining,
      pricePerClick: TRENDING_PRICE_EUR,
    };
  }
  // free
  return {
    allowed: false, reason: "free-blocked", plan, isDev: false,
    betaUsed: 0, betaRemaining: 0, pricePerClick: TRENDING_PRICE_EUR,
  };
}

/**
 * Logs a trending click in ai_usage_logs so we can count beta usage and
 * (later) bill paid plans. Dev mode does NOT log.
 */
export async function logTrendingClick(plan: PlanTier): Promise<void> {
  if (isDevMode()) return;
  const userId = getCurrentUserId();
  try {
    await supabase.from("ai_usage_logs" as any).insert({
      user_id: userId,
      provider: "internal",
      model: "trending-niches",
      task_type: TRENDING_TASK_TYPE,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      input_cost: plan === "pro" || plan === "premium" ? TRENDING_PRICE_EUR : 0,
      output_cost: 0,
      total_cost: plan === "pro" || plan === "premium" ? TRENDING_PRICE_EUR : 0,
      metadata: { plan, billed: plan === "pro" || plan === "premium" },
    });
    window.dispatchEvent(new Event("scriptora-usage-change"));
  } catch (e) {
    // Non-blocking — UX continues even if logging fails.
    console.warn("[trending-paywall] log failed", e);
  }
}
