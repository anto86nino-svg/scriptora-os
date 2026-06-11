import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { creditPlanIdForTier, type ScriptoraPlanTier } from "./payment-plan-mapping.ts";

export function createServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function recordPaymentEvent(
  supabase: SupabaseClient,
  provider: string,
  eventId: string,
  eventType: string,
  userId: string | null,
  payload: unknown,
): Promise<boolean> {
  const { error } = await supabase.from("payment_events").insert({
    provider,
    event_id: eventId,
    event_type: eventType,
    user_id: userId,
    payload,
  });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

export async function findUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const match = (data?.users || []).find(
    (u) => (u.email || "").toLowerCase() === normalized,
  );
  return match?.id || null;
}

export interface ApplySubscriptionInput {
  userId: string;
  tier: ScriptoraPlanTier;
  provider: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  checkoutPlanId?: string | null;
}

export async function applySubscriptionPlan(
  supabase: SupabaseClient,
  input: ApplySubscriptionInput,
): Promise<void> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    user_id: input.userId,
    plan: input.tier,
    period_start: now,
    payment_provider: input.provider,
    provider_customer_id: input.customerId || null,
    provider_subscription_id: input.subscriptionId || null,
    checkout_plan_id: input.checkoutPlanId || null,
    beta_activated_at: null,
    beta_code_used: null,
    suspicious: false,
  };
  if (input.provider === "stripe") {
    row.stripe_customer_id = input.customerId || null;
    row.stripe_subscription_id = input.subscriptionId || null;
  }

  const { error: planErr } = await supabase.from("user_plans").upsert(row, { onConflict: "user_id" });
  if (planErr) throw planErr;

  const { error: syncErr } = await supabase.rpc("sync_credit_wallet_for_plan", {
    p_user_id: input.userId,
    p_plan: creditPlanIdForTier(input.tier),
  });
  if (syncErr) throw syncErr;
}

export async function downgradeToFree(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
): Promise<void> {
  await applySubscriptionPlan(supabase, {
    userId,
    tier: "free",
    provider,
    customerId: null,
    subscriptionId: null,
  });
}
