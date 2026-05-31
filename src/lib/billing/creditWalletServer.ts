import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { invokeSupabaseFunction } from "@/lib/supabase-function-auth";
import type { PlanTier } from "@/lib/plan";
import { getMonthlyCreditsForPlan } from "@/lib/billing/creditPolicy";
import { mapPlanTierToScriptoraPlan } from "@/lib/billing/planAdapter";
import type { CreditWalletSnapshot } from "@/lib/billing/creditWallet";

export interface RemoteCreditWalletResponse {
  ok: boolean;
  balance?: number;
  monthlyGrant?: number;
  lifetimePurchased?: number;
  lifetimeUsed?: number;
  planTier?: PlanTier;
  walletId?: string;
  updatedAt?: string;
  error?: string;
}

function currentPeriodStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** Fetch authoritative wallet from Supabase Edge Function. Returns null if unavailable. */
export async function fetchRemoteCreditWallet(
  planTier: PlanTier,
): Promise<CreditWalletSnapshot | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await invokeSupabaseFunction<RemoteCreditWalletResponse>(
      "get-credit-wallet",
      { body: {} },
    );
    if (error || !data?.ok) return null;

    const scriptoraPlan = mapPlanTierToScriptoraPlan(planTier);
    const monthlyAllowance =
      Math.max(0, Number(data.monthlyGrant) || 0) ||
      getMonthlyCreditsForPlan(scriptoraPlan);
    const availableCredits = Math.max(0, Number(data.balance) || 0);
    const lifetimeUsed = Math.max(0, Number(data.lifetimeUsed) || 0);

    return {
      plan: scriptoraPlan,
      monthlyAllowance,
      usedCredits: lifetimeUsed,
      availableCredits,
      periodStart: currentPeriodStart(),
      source: "remote",
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      walletId: data.walletId,
      lifetimePurchased: Math.max(0, Number(data.lifetimePurchased) || 0),
    };
  } catch {
    return null;
  }
}
