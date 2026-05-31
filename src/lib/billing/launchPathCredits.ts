import { calculateCreditCost, type ScriptoraPlan } from "@/lib/billing/creditPolicy";

export type LaunchPathMode = "quick" | "advanced" | "manual";

/** Estimated credits for new-book launch paths — single source via calculateCreditCost. */
export function getLaunchPathCreditEstimate(mode: LaunchPathMode, plan?: ScriptoraPlan): number {
  if (mode === "manual") return 0;
  if (mode === "quick") {
    return calculateCreditCost({ operation: "chapter_generation_short", plan });
  }
  return calculateCreditCost({ operation: "book_blueprint", plan });
}
