// Centralized payments configuration. Reads .env, provides safe defaults,
// and exposes a typed config consumed by the Pricing UI and paywall logic.
// NOTE: No real payment SDK is wired here. This is a dormant, future-ready layer.

export type PaymentMode = "coming_soon" | "external_links" | "provider_sdk";
export type PaymentProvider = "none" | "stripe" | "paddle" | "lemonsqueezy" | "paypal";
export type PlanId =
  | "free"
  | "pro_monthly"
  | "pro_yearly"
  | "premium_monthly"
  | "premium_yearly"
  | "lifetime";

export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PaymentPlan {
  id: PlanId;
  name: string;
  price: string;
  priceNumeric: number;
  period: string;
  description: string;
  features: PlanFeature[];
  badge?: string;
  ctaLabel: string;
  externalUrl?: string;
  highlight?: boolean;
  premium?: boolean;
}

export interface PaymentsConfig {
  enabled: boolean;
  mode: PaymentMode;
  provider: PaymentProvider;
  successUrl: string;
  cancelUrl: string;
  plans: PaymentPlan[];
}

function readEnv(key: string, fallback = ""): string {
  try {
    // import.meta.env is statically replaced at build time by Vite.
    // Guarded so missing vars never crash the app.
    const v = (import.meta as any)?.env?.[key];
    return typeof v === "string" ? v : fallback;
  } catch {
    return fallback;
  }
}

const ENABLED = readEnv("VITE_ENABLE_PAYMENTS", "false") === "true";
const MODE_RAW = readEnv("VITE_PAYMENT_MODE", "coming_soon") as PaymentMode;
const MODE: PaymentMode = ["coming_soon", "external_links", "provider_sdk"].includes(MODE_RAW)
  ? MODE_RAW
  : "coming_soon";
const PROVIDER_RAW = readEnv("VITE_PAYMENT_PROVIDER", "none") as PaymentProvider;
const PROVIDER: PaymentProvider = ["none", "stripe", "paddle", "lemonsqueezy", "paypal"].includes(
  PROVIDER_RAW,
)
  ? PROVIDER_RAW
  : "none";

const MONTHLY_URL = readEnv("VITE_PAYMENT_MONTHLY_URL", "");
const YEARLY_URL = readEnv("VITE_PAYMENT_YEARLY_URL", "");
const LIFETIME_URL = readEnv("VITE_PAYMENT_LIFETIME_URL", "");
const PREMIUM_MONTHLY_URL = readEnv("VITE_PAYMENT_PREMIUM_MONTHLY_URL", "");
const PREMIUM_YEARLY_URL = readEnv("VITE_PAYMENT_PREMIUM_YEARLY_URL", "");
const SUCCESS_URL = readEnv("VITE_PAYMENT_SUCCESS_URL", "/dashboard?payment=success");
const CANCEL_URL = readEnv("VITE_PAYMENT_CANCEL_URL", "/pricing?payment=cancelled");

export const paymentsConfig: PaymentsConfig = {
  enabled: ENABLED,
  mode: MODE,
  provider: PROVIDER,
  successUrl: SUCCESS_URL,
  cancelUrl: CANCEL_URL,
  plans: [
    {
      id: "free",
      name: "Free",
      price: "€0",
      priceNumeric: 0,
      period: "forever",
      description: "Try Scriptora and write your first book.",
      ctaLabel: "Start free",
      features: [
        { label: "1 active book", included: true },
        { label: "Up to 10,000 words", included: true },
        { label: "Core book creation", included: true },
        { label: "Limited chapter generation", included: true },
        { label: "Premium tools preview", included: true },
        { label: "Live market intelligence", included: false },
        { label: "EPUB / PDF / DOCX export", included: false },
      ],
    },
    {
      id: "pro_monthly",
      name: "Pro Author",
      price: "€19,99",
      priceNumeric: 19.99,
      period: "/month",
      description: "For authors who want to write, refine, and publish for real.",
      ctaLabel: "Choose Pro Author",
      externalUrl: MONTHLY_URL || undefined,
      highlight: true,
      features: [
        { label: "10 books per month", included: true },
        { label: "Up to 80,000 words per book", included: true },
        { label: "Full Book Engine", included: true },
        { label: "Advanced chapters, rewrites & polish", included: true },
        { label: "EPUB, PDF, DOCX export", included: true },
        { label: "KDP market analysis (idea, niche, promise)", included: true },
        { label: "Title Intelligence (base)", included: true },
        { label: "Limited editorial trends", included: true },
        { label: "Cover Studio (templates)", included: true },
        { label: "In-app & email support", included: true },
      ],
    },
    {
      id: "pro_yearly",
      name: "Pro Yearly",
      price: "€299",
      priceNumeric: 299,
      period: "/year",
      description: "Everything in Pro, billed annually.",
      ctaLabel: "Get Pro Yearly",
      externalUrl: YEARLY_URL || undefined,
      badge: "Best Value",
      features: [
        { label: "Everything in Pro", included: true },
        { label: "Annual savings", included: true },
        { label: "Uninterrupted access", included: true },
        { label: "Advanced editorial tools", included: true },
      ],
    },
    {
      id: "premium_monthly",
      name: "Studio",
      price: "€49,99",
      priceNumeric: 49.99,
      period: "/month",
      description: "For intensive authors and editorial production.",
      ctaLabel: "Choose Studio",
      externalUrl: PREMIUM_MONTHLY_URL || undefined,
      badge: "Max Power",
      premium: true,
      features: [
        { label: "Up to 10 books per month (fair use)", included: true },
        { label: "Up to 200,000 words per book", included: true },
        { label: "Full Dominate Mode", included: true },
        { label: "Live market intelligence", included: true },
        { label: "Advanced KDP analysis (market, title, packaging)", included: true },
        { label: "Title Domination (advanced)", included: true },
        { label: "Editorial trends from public signals", included: true },
        { label: "Commercial potential estimates", included: true },
        { label: "Amazon packaging: blurb, keywords & categories", included: true },
        { label: "All export formats", included: true },
        { label: "Premium flow for long works", included: true },
        { label: "Dominate Mode with advanced QA", included: true },
        { label: "Priority support", included: true },
      ],
    },
    {
      id: "premium_yearly",
      name: "Premium Yearly",
      price: "€599",
      priceNumeric: 599,
      period: "/year",
      description: "Everything in Premium, billed annually.",
      ctaLabel: "Get Premium Yearly",
      externalUrl: PREMIUM_YEARLY_URL || undefined,
      badge: "Max Power",
      premium: true,
      features: [
        { label: "Everything in Premium", included: true },
        { label: "Annual savings", included: true },
        { label: "Continuous access to all updates", included: true },
      ],
    },
    {
      id: "lifetime",
      name: "Founder Lifetime",
      price: "€799",
      priceNumeric: 799,
      period: "one-time",
      description: "Permanent access to Scriptora Premium — forever.",
      ctaLabel: "Claim Founder Lifetime",
      externalUrl: LIFETIME_URL || undefined,
      badge: "Founder Deal",
      premium: true,
      features: [
        { label: "Permanent access", included: true },
        { label: "All future upgrades included", included: true },
        { label: "Every Premium tool", included: true },
        { label: "Early founder access", included: true },
      ],
    },
  ],
};

/** True only when payments are fully enabled and the mode allows real checkouts. */
export function isPaymentsLive(): boolean {
  return paymentsConfig.enabled && paymentsConfig.mode !== "coming_soon";
}

/** Resolve the destination for a plan CTA based on current mode. */
export function resolvePlanAction(plan: PaymentPlan):
  | { kind: "coming_soon" }
  | { kind: "external"; url: string }
  | { kind: "missing_link" }
  | { kind: "free" } {
  if (plan.id === "free") return { kind: "free" };
  if (!paymentsConfig.enabled || paymentsConfig.mode === "coming_soon") {
    return { kind: "coming_soon" };
  }
  if (paymentsConfig.mode === "external_links") {
    if (plan.externalUrl) return { kind: "external", url: plan.externalUrl };
    return { kind: "missing_link" };
  }
  // provider_sdk: not implemented yet → fall back gracefully
  return { kind: "coming_soon" };
}