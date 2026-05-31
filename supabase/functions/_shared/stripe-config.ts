/**
 * Server-side Stripe catalog — mirrors commercialPlans + creditPolicy packs.
 * Price IDs come from env; never expose STRIPE_SECRET_KEY to the client.
 */

export type SubscriptionPlanKey = "starter" | "pro" | "studio" | "publisher";
export type CreditPackId =
  | "credits_100"
  | "credits_300"
  | "credits_800"
  | "credits_2000"
  | "credits_5000";

export type LegacyPlanTier = "free" | "beta" | "pro" | "premium";

export interface SubscriptionCatalogEntry {
  planKey: SubscriptionPlanKey;
  priceEnvKey: string;
  legacyPlan: LegacyPlanTier;
  monthlyCredits: number;
}

export interface CreditPackCatalogEntry {
  packId: CreditPackId;
  credits: number;
  priceEnvKey: string;
}

/** Monthly credits — keep aligned with src/lib/billing/creditPolicy.ts PLAN_MONTHLY_CREDITS */
export const SUBSCRIPTION_CATALOG: Record<SubscriptionPlanKey, SubscriptionCatalogEntry> = {
  starter: {
    planKey: "starter",
    priceEnvKey: "STRIPE_PRICE_STARTER",
    legacyPlan: "beta",
    monthlyCredits: 250,
  },
  pro: {
    planKey: "pro",
    priceEnvKey: "STRIPE_PRICE_PRO_AUTHOR",
    legacyPlan: "pro",
    monthlyCredits: 700,
  },
  studio: {
    planKey: "studio",
    priceEnvKey: "STRIPE_PRICE_STUDIO",
    legacyPlan: "premium",
    monthlyCredits: 2000,
  },
  publisher: {
    planKey: "publisher",
    priceEnvKey: "STRIPE_PRICE_PUBLISHER",
    legacyPlan: "premium",
    monthlyCredits: 5000,
  },
};

export const CREDIT_PACK_CATALOG: Record<CreditPackId, CreditPackCatalogEntry> = {
  credits_100: { packId: "credits_100", credits: 100, priceEnvKey: "STRIPE_PRICE_CREDITS_100" },
  credits_300: { packId: "credits_300", credits: 300, priceEnvKey: "STRIPE_PRICE_CREDITS_300" },
  credits_800: { packId: "credits_800", credits: 800, priceEnvKey: "STRIPE_PRICE_CREDITS_800" },
  credits_2000: { packId: "credits_2000", credits: 2000, priceEnvKey: "STRIPE_PRICE_CREDITS_2000" },
  credits_5000: { packId: "credits_5000", credits: 5000, priceEnvKey: "STRIPE_PRICE_CREDITS_5000" },
};

export function isStripeConfigured(): boolean {
  return Boolean(Deno.env.get("STRIPE_SECRET_KEY")?.trim());
}

export function getSiteUrl(): string {
  const raw = Deno.env.get("SITE_URL") || Deno.env.get("APP_URL") || "http://localhost:5173";
  return raw.replace(/\/$/, "");
}

export function resolveStripePriceId(envKey: string): string | null {
  const value = Deno.env.get(envKey)?.trim();
  return value || null;
}

export function isSubscriptionPlanKey(value: string): value is SubscriptionPlanKey {
  return value in SUBSCRIPTION_CATALOG;
}

export function isCreditPackId(value: string): value is CreditPackId {
  return value in CREDIT_PACK_CATALOG;
}

/** Reverse lookup Stripe price id → subscription plan (for webhooks). */
export function planKeyFromStripePriceId(priceId: string): SubscriptionPlanKey | null {
  for (const entry of Object.values(SUBSCRIPTION_CATALOG)) {
    const configured = resolveStripePriceId(entry.priceEnvKey);
    if (configured && configured === priceId) return entry.planKey;
  }
  return null;
}

export function packIdFromStripePriceId(priceId: string): CreditPackId | null {
  for (const entry of Object.values(CREDIT_PACK_CATALOG)) {
    const configured = resolveStripePriceId(entry.priceEnvKey);
    if (configured && configured === priceId) return entry.packId;
  }
  return null;
}
