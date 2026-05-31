/**
 * Server-side credit wallet helpers — values mirror src/lib/billing/creditPolicy.ts
 * Keep PLAN_MONTHLY_CREDITS in sync when commercial plans change.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type PlanTier = "free" | "beta" | "pro" | "premium";

export const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  free: 40,
  starter: 250,
  pro: 700,
  studio: 2000,
  publisher: 5000,
};

export function mapPlanTierToMonthlyGrant(plan: string | null | undefined): number {
  switch (plan) {
    case "beta":
      return PLAN_MONTHLY_CREDITS.starter;
    case "pro":
      return PLAN_MONTHLY_CREDITS.pro;
    case "premium":
      return PLAN_MONTHLY_CREDITS.studio;
    default:
      return PLAN_MONTHLY_CREDITS.free;
  }
}

export interface CreditWalletRow {
  id: string;
  user_id: string;
  balance: number;
  monthly_grant: number;
  lifetime_purchased: number;
  lifetime_used: number;
  last_monthly_grant_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function resolveUserPlanTier(
  admin: SupabaseClient,
  userId: string,
): Promise<PlanTier> {
  const { data } = await admin
    .from("user_plans")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan = (data as { plan?: string } | null)?.plan;
  if (plan === "beta" || plan === "pro" || plan === "premium") return plan;
  return "free";
}

/** Ensure wallet exists; grant initial balance on first create. */
export async function getOrCreateCreditWallet(
  admin: SupabaseClient,
  userId: string,
): Promise<CreditWalletRow> {
  const { data: existing, error: readErr } = await admin
    .from("user_credit_wallets")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (readErr) throw readErr;
  if (existing) return existing as CreditWalletRow;

  const planTier = await resolveUserPlanTier(admin, userId);
  const monthlyGrant = mapPlanTierToMonthlyGrant(planTier);
  const now = new Date().toISOString();

  const { data: created, error: insertErr } = await admin
    .from("user_credit_wallets")
    .insert({
      user_id: userId,
      balance: monthlyGrant,
      monthly_grant: monthlyGrant,
      lifetime_purchased: 0,
      lifetime_used: 0,
      last_monthly_grant_at: now,
    })
    .select("*")
    .single();

  if (insertErr) {
    // Race: another request created the wallet
    const { data: retry } = await admin
      .from("user_credit_wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (retry) return retry as CreditWalletRow;
    throw insertErr;
  }

  return created as CreditWalletRow;
}

export function walletToResponse(wallet: CreditWalletRow, planTier: PlanTier) {
  return {
    ok: true,
    balance: wallet.balance,
    monthlyGrant: wallet.monthly_grant,
    lifetimePurchased: wallet.lifetime_purchased,
    lifetimeUsed: wallet.lifetime_used,
    planTier,
    walletId: wallet.id,
    updatedAt: wallet.updated_at,
  };
}
