// Lightweight subscription/paywall hook. Future-compatible:
// today returns "free" by default and never grants premium silently.
// When real payments + Supabase user_plans wiring go live, this hook can
// be upgraded without changing call sites.

import { useEffect, useState } from "react";
import { usePlan } from "@/lib/plan";
import { paymentsConfig } from "@/config/payments";

export type SubscriptionPlan = "free" | "pro" | "lifetime";

export type PremiumFeatureKey =
  | "kdp_money_engine"
  | "title_domination"
  | "trending_niches"
  | "cover_studio"
  | "export_epub"
  | "export_docx"
  | "export_pdf"
  | "advanced_editorial_review"
  | "premium_chapter_generation"
  | "unlimited_projects"
  | "ai_market_research"
  | "bestseller_prediction";

export interface SubscriptionState {
  currentPlan: SubscriptionPlan;
  isPro: boolean;
  isLifetime: boolean;
  isPremium: boolean;
  paymentsLive: boolean;
  canUsePremiumFeature: (feature: PremiumFeatureKey) => boolean;
  showComingSoonPaywall: (feature: PremiumFeatureKey) => boolean;
}

/**
 * Bridges legacy plan tiers (free/beta/pro/premium) to the new
 * subscription plan model used by the Pricing infrastructure.
 *
 * In Dev Mode the override chosen by the owner (free/beta/pro/premium)
 * MUST be honoured so we can test gating end-to-end. Only "premium"
 * unlocks everything (lifetime). Free/beta/pro behave exactly like
 * real users on those tiers.
 */
function mapLegacyPlan(plan: string, _isDev: boolean): SubscriptionPlan {
  if (plan === "premium") return "lifetime";
  if (plan === "pro" || plan === "beta") return "pro";
  return "free";
}

export function useSubscription(): SubscriptionState {
  const { plan, isDev } = usePlan();
  const [current, setCurrent] = useState<SubscriptionPlan>(() => mapLegacyPlan(plan, isDev));

  useEffect(() => {
    setCurrent(mapLegacyPlan(plan, isDev));
  }, [plan, isDev]);

  const isLifetime = current === "lifetime";
  const isPro = current === "pro" || isLifetime;
  const isPremium = isPro;
  const paymentsLive = paymentsConfig.enabled && paymentsConfig.mode !== "coming_soon";

  const canUsePremiumFeature = (_feature: PremiumFeatureKey): boolean => {
    // During the coming-soon phase we do NOT silently unlock anything for free users.
    // Premium feature visibility/usability is still controlled by existing plan logic
    // (PLAN_LIMITS in src/lib/plan.ts). This hook only reports intent.
    return isPremium;
  };

  const showComingSoonPaywall = (_feature: PremiumFeatureKey): boolean => {
    if (isPremium) return false;
    // While payments are not live, premium CTAs should open the coming-soon modal
    // instead of an external checkout.
    return !paymentsLive;
  };

  return {
    currentPlan: current,
    isPro,
    isLifetime,
    isPremium,
    paymentsLive,
    canUsePremiumFeature,
    showComingSoonPaywall,
  };
}