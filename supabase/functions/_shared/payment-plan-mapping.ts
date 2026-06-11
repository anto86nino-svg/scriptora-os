/** Maps checkout catalog IDs and provider price/variant IDs → user_plans.plan tier. */

export type ScriptoraPlanTier = "free" | "beta" | "pro" | "premium";

export type CheckoutPlanId =
  | "pro_monthly"
  | "pro_yearly"
  | "premium_monthly"
  | "premium_yearly"
  | "lifetime";

export function checkoutPlanToTier(planId: string): ScriptoraPlanTier {
  switch (planId) {
    case "pro_monthly":
    case "pro_yearly":
      return "pro";
    case "premium_monthly":
    case "premium_yearly":
    case "lifetime":
      return "premium";
    default:
      return "free";
  }
}

function readSecret(key: string): string {
  return (Deno.env.get(key) || "").trim();
}

function buildEnvIdMap(
  pairs: [string, ScriptoraPlanTier][],
): Record<string, ScriptoraPlanTier> {
  const map: Record<string, ScriptoraPlanTier> = {};
  for (const [envKey, tier] of pairs) {
    const id = readSecret(envKey);
    if (id) map[id] = tier;
  }
  return map;
}

export function buildStripePriceToTierMap(): Record<string, ScriptoraPlanTier> {
  return buildEnvIdMap([
    ["STRIPE_PRICE_PRO_MONTHLY", "pro"],
    ["STRIPE_PRICE_PRO_YEARLY", "pro"],
    ["STRIPE_PRICE_PREMIUM_MONTHLY", "premium"],
    ["STRIPE_PRICE_PREMIUM_YEARLY", "premium"],
    ["STRIPE_PRICE_LIFETIME", "premium"],
  ]);
}

export function buildLemonVariantToTierMap(): Record<string, ScriptoraPlanTier> {
  return buildEnvIdMap([
    ["LEMON_VARIANT_PRO_MONTHLY", "pro"],
    ["LEMON_VARIANT_PRO_YEARLY", "pro"],
    ["LEMON_VARIANT_PREMIUM_MONTHLY", "premium"],
    ["LEMON_VARIANT_PREMIUM_YEARLY", "premium"],
    ["LEMON_VARIANT_LIFETIME", "premium"],
  ]);
}

export function resolveTierFromStripePrice(priceId: string | null | undefined): ScriptoraPlanTier | null {
  if (!priceId) return null;
  return buildStripePriceToTierMap()[priceId] || null;
}

export function resolveTierFromLemonVariant(variantId: string | null | undefined): ScriptoraPlanTier | null {
  if (!variantId) return null;
  return buildLemonVariantToTierMap()[String(variantId)] || null;
}

export function resolveCheckoutPlanPriceId(planId: CheckoutPlanId): string | null {
  const keyMap: Record<CheckoutPlanId, string> = {
    pro_monthly: "STRIPE_PRICE_PRO_MONTHLY",
    pro_yearly: "STRIPE_PRICE_PRO_YEARLY",
    premium_monthly: "STRIPE_PRICE_PREMIUM_MONTHLY",
    premium_yearly: "STRIPE_PRICE_PREMIUM_YEARLY",
    lifetime: "STRIPE_PRICE_LIFETIME",
  };
  return readSecret(keyMap[planId]) || null;
}

export function creditPlanIdForTier(tier: ScriptoraPlanTier): string {
  if (tier === "pro") return "pro";
  if (tier === "premium") return "premium";
  if (tier === "beta") return "pro";
  return "free";
}
