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
      period: "per sempre",
      description: "Per provare Scriptora e scrivere il primo libro.",
      ctaLabel: "Inizia gratis",
      features: [
        { label: "1 libro attivo", included: true },
        { label: "Fino a 10.000 parole", included: true },
        { label: "Creazione libro base", included: true },
        { label: "Generazione capitoli limitata", included: true },
        { label: "Strumenti premium visibili in anteprima", included: true },
        { label: "Ricerche di mercato in tempo reale", included: false },
        { label: "Export EPUB / PDF / DOCX", included: false },
      ],
    },
    {
      id: "pro_monthly",
      name: "Pro",
      price: "€29,99",
      priceNumeric: 29.99,
      period: "/mese",
      description: "Per autori che vogliono scrivere, rifinire e pubblicare davvero.",
      ctaLabel: "Passa a Pro",
      externalUrl: MONTHLY_URL || undefined,
      highlight: true,
      features: [
        { label: "10 libri al mese", included: true },
        { label: "Fino a 80.000 parole per libro", included: true },
        { label: "Book Engine completo", included: true },
        { label: "Capitoli, revisioni e miglioramenti avanzati", included: true },
        { label: "Export EPUB, PDF, DOCX", included: true },
        { label: "Analisi mercato KDP base", included: true },
        { label: "Title Domination Studio base", included: true },
        { label: "Trend editoriali limitati", included: true },
        { label: "Cover Studio a template", included: true },
        { label: "Supporto via app/email", included: true },
      ],
    },
    {
      id: "pro_yearly",
      name: "Pro Yearly",
      price: "€299",
      priceNumeric: 299,
      period: "/anno",
      description: "Tutto Pro, con risparmio annuale.",
      ctaLabel: "Presto disponibile",
      externalUrl: YEARLY_URL || undefined,
      badge: "Best Value",
      features: [
        { label: "Tutto Pro", included: true },
        { label: "Risparmio annuale", included: true },
        { label: "Continuità senza interruzioni", included: true },
        { label: "Strumenti editoriali avanzati", included: true },
      ],
    },
    {
      id: "premium_monthly",
      name: "Premium",
      price: "€59,99",
      priceNumeric: 59.99,
      period: "/mese",
      description: "Per autori, self-publisher e piccoli editori che vogliono dominare il mercato.",
      ctaLabel: "Sblocca Premium",
      externalUrl: PREMIUM_MONTHLY_URL || undefined,
      badge: "Max Power",
      premium: true,
      features: [
        { label: "Libri illimitati con fair use", included: true },
        { label: "Fino a 200.000 parole per libro", included: true },
        { label: "Dominate Mode completo", included: true },
        { label: "Ricerche di mercato in tempo reale", included: true },
        { label: "Analisi KDP avanzata", included: true },
        { label: "Title Domination Studio avanzato", included: true },
        { label: "Trend Amazon / Apple Books", included: true },
        { label: "Previsione potenziale bestseller", included: true },
        { label: "Packaging Intelligence", included: true },
        { label: "Tutti i formati di export", included: true },
        { label: "Generazione prioritaria", included: true },
        { label: "Massima qualità di output", included: true },
        { label: "Supporto prioritario", included: true },
      ],
    },
    {
      id: "premium_yearly",
      name: "Premium Yearly",
      price: "€599",
      priceNumeric: 599,
      period: "/anno",
      description: "Tutto Premium, con risparmio annuale.",
      ctaLabel: "Presto disponibile",
      externalUrl: PREMIUM_YEARLY_URL || undefined,
      badge: "Max Power",
      premium: true,
      features: [
        { label: "Tutto Premium", included: true },
        { label: "Risparmio annuale", included: true },
        { label: "Accesso continuo a tutti gli aggiornamenti", included: true },
      ],
    },
    {
      id: "lifetime",
      name: "Founder Lifetime",
      price: "€799",
      priceNumeric: 799,
      period: "una tantum",
      description: "Accesso permanente a Scriptora Premium, per sempre.",
      ctaLabel: "Presto disponibile",
      externalUrl: LIFETIME_URL || undefined,
      badge: "Founder Deal",
      premium: true,
      features: [
        { label: "Accesso permanente", included: true },
        { label: "Tutti gli upgrade futuri inclusi", included: true },
        { label: "Tutti gli strumenti Premium", included: true },
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