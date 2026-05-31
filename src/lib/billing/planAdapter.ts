import type { PlanTier } from "@/lib/plan";
import type { ScriptoraPlan } from "@/lib/billing/creditPolicy";

/**
 * Maps legacy subscription tiers to editorial credit plans.
 * Does not mutate billing — existing PlanTier / Supabase user_plans stay unchanged.
 */
export function mapPlanTierToScriptoraPlan(plan: PlanTier): ScriptoraPlan {
  switch (plan) {
    case "free":
      return "free";
    case "beta":
      return "starter";
    case "pro":
      return "pro";
    case "premium":
      return "studio";
    default:
      return "free";
  }
}
