import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  getOrCreateCreditWallet,
  type PlanTier,
} from "./credit-ledger.ts";
import {
  SUBSCRIPTION_CATALOG,
  type LegacyPlanTier,
  type SubscriptionPlanKey,
} from "./stripe-config.ts";

export async function markStripeEventProcessed(
  admin: SupabaseClient,
  stripeEventId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const { error } = await admin.from("stripe_events_processed").insert({
    stripe_event_id: stripeEventId,
    event_type: eventType,
    metadata,
  });
  if (error && error.code !== "23505") throw error;
}

export async function isStripeEventProcessed(
  admin: SupabaseClient,
  stripeEventId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("stripe_events_processed")
    .select("id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();
  return Boolean(data);
}

export async function upsertUserPlanFromStripe(
  admin: SupabaseClient,
  userId: string,
  legacyPlan: LegacyPlanTier,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  scriptoraPlanKey?: SubscriptionPlanKey,
): Promise<void> {
  const now = new Date().toISOString();
  const { data: existing } = await admin
    .from("user_plans")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload: Record<string, unknown> = {
    plan: legacyPlan,
    period_start: now,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    suspicious: false,
    updated_at: now,
  };

  if (existing) {
    const { error } = await admin.from("user_plans").update(payload).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await admin.from("user_plans").insert({
      user_id: userId,
      ...payload,
    });
    if (error) throw error;
  }

  if (scriptoraPlanKey) {
    await syncWalletMonthlyGrant(admin, userId, scriptoraPlanKey);
  }
}

export async function syncWalletMonthlyGrant(
  admin: SupabaseClient,
  userId: string,
  planKey: SubscriptionPlanKey,
): Promise<void> {
  const entry = SUBSCRIPTION_CATALOG[planKey];
  await getOrCreateCreditWallet(admin, userId);

  const { error } = await admin
    .from("user_credit_wallets")
    .update({
      monthly_grant: entry.monthlyCredits,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function grantWalletCredits(
  admin: SupabaseClient,
  userId: string,
  credits: number,
  operation: string,
  referenceId: string,
  metadata: Record<string, unknown> = {},
  incrementLifetimePurchased = false,
): Promise<{ ok: boolean; idempotent?: boolean }> {
  await getOrCreateCreditWallet(admin, userId);

  const { data, error } = await admin.rpc("credit_wallet_grant_credits", {
    p_user_id: userId,
    p_credits: credits,
    p_operation: operation,
    p_reference_id: referenceId,
    p_metadata: metadata,
    p_increment_lifetime_purchased: incrementLifetimePurchased,
  });

  if (error) throw error;
  return (data as { ok: boolean; idempotent?: boolean }) ?? { ok: false };
}

export function legacyPlanFromScriptoraKey(planKey: SubscriptionPlanKey): PlanTier {
  return SUBSCRIPTION_CATALOG[planKey].legacyPlan as PlanTier;
}

export async function downgradeUserToFree(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("user_plans")
    .update({
      plan: "free",
      stripe_subscription_id: null,
      period_start: now,
      updated_at: now,
    })
    .eq("user_id", userId);
  if (error) throw error;

  await getOrCreateCreditWallet(admin, userId);
  await admin
    .from("user_credit_wallets")
    .update({ monthly_grant: 40, updated_at: now })
    .eq("user_id", userId);
}
