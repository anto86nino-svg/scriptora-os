// Centralized payments configuration. Reads .env, provides safe defaults,
// and exposes a typed config consumed by the Pricing UI and paywall logic.
//
// Activation (no code changes):
//   Phase 1 — VITE_PAYMENT_MODE=external_links + checkout URLs
//   Phase 2 — deploy payments-webhook edge function + provider secrets
//   Phase 3 — VITE_PAYMENT_MODE=provider_sdk + STRIPE_SECRET_KEY server-side

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
  /** True when at least one paid checkout URL or provider_sdk secrets path is configured. */
  checkoutReady: boolean;
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
const CREDITS_URL = readEnv("VITE_PAYMENT_CREDITS_URL", "");

const CHECKOUT_URLS = [
  MONTHLY_URL,
  YEARLY_URL,
  LIFETIME_URL,
  PREMIUM_MONTHLY_URL,
  PREMIUM_YEARLY_URL,
  CREDITS_URL,
].filter(Boolean);

function resolvePlanCta(planId: PlanId, fallback: string, url?: string): string {
  if (!ENABLED || MODE === "coming_soon") return fallback;
  if (MODE === "provider_sdk") return fallback;
  return url ? fallback : "Presto disponibile";
}

export const paymentsConfig: PaymentsConfig = {
  enabled: ENABLED,
  mode: MODE,
  provider: PROVIDER,
  successUrl: SUCCESS_URL,
  cancelUrl: CANCEL_URL,
  checkoutReady: ENABLED && MODE !== "coming_soon" && (MODE === "provider_sdk" || CHECKOUT_URLS.length > 0),
  plans: [
    {
      id: "free",
      name: "Free",
      price: "€0",
      priceNumeric: 0,
      period: "per sempre",
      description: "Per provare Scriptora: idea, titoli e prime Blueprint Preview.",
      ctaLabel: "Inizia gratis",
      features: [
        { label: "300 crediti/mese", included: true },
        { label: "3 Blueprint Preview salvate", included: true },
        { label: "10 generazioni titolo/mese", included: true },
        { label: "Scrittura reale da sbloccare", included: true },
        { label: "Strumenti premium visibili in anteprima", included: true },
        { label: "Analisi su segnali di mercato live", included: false },
        { label: "Export EPUB / PDF / DOCX", included: false },
      ],
    },
    {
      id: "pro_monthly",
      name: "Author Pro",
      price: "€19,99",
      priceNumeric: 19.99,
      period: "/mese",
      description: "Piano principale per autori indipendenti.",
      ctaLabel: "Passa ad Author Pro",
      externalUrl: MONTHLY_URL || undefined,
      highlight: true,
      features: [
        { label: "8.000 crediti/mese", included: true },
        { label: "30 Blueprint/mese", included: true },
        { label: "Book Forge e Writer OS", included: true },
        { label: "Capitoli, revisioni e strumenti editoriali", included: true },
        { label: "Export EPUB, PDF, DOCX", included: true },
        { label: "Analisi KDP base su idea, nicchia e promessa", included: true },
        { label: "Title Intelligence base", included: true },
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
      ctaLabel: resolvePlanCta("pro_yearly", "Passa a Pro Yearly", YEARLY_URL),
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
      name: "Studio",
      price: "€49,99",
      priceNumeric: 49.99,
      period: "/mese",
      description: "Produzione seria per autori che pubblicano cataloghi e libri lunghi.",
      ctaLabel: "Sblocca Studio",
      externalUrl: PREMIUM_MONTHLY_URL || undefined,
      badge: "Max Power",
      premium: true,
      features: [
        { label: "25.000 crediti/mese", included: true },
        { label: "100 Blueprint/mese", included: true },
        { label: "Dominate Mode completo", included: true },
        { label: "Analisi su segnali di mercato live", included: true },
        { label: "Analisi KDP avanzata su mercato, titolo e packaging", included: true },
        { label: "Title Domination avanzato", included: true },
        { label: "Trend editoriali da segnali pubblici", included: true },
        { label: "Stima del potenziale commerciale", included: true },
        { label: "Packaging Amazon: descrizione, keyword e categorie", included: true },
        { label: "Tutti i formati di export", included: true },
        { label: "Flusso Premium per lavori lunghi", included: true },
        { label: "Dominate Mode con controllo qualità avanzato", included: true },
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
      ctaLabel: resolvePlanCta("premium_yearly", "Sblocca Premium Yearly", PREMIUM_YEARLY_URL),
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
      ctaLabel: resolvePlanCta("lifetime", "Founder Lifetime", LIFETIME_URL),
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

export type PlanAction =
  | { kind: "coming_soon" }
  | { kind: "external"; url: string }
  | { kind: "checkout_session"; planId: PlanId }
  | { kind: "missing_link" }
  | { kind: "free" };

/** Resolve the destination for a plan CTA based on current mode. */
export function resolvePlanAction(plan: PaymentPlan): PlanAction {
  if (plan.id === "free") return { kind: "free" };
  if (!paymentsConfig.enabled || paymentsConfig.mode === "coming_soon") {
    return { kind: "coming_soon" };
  }
  if (paymentsConfig.mode === "provider_sdk") {
    return { kind: "checkout_session", planId: plan.id };
  }
  if (paymentsConfig.mode === "external_links") {
    if (plan.externalUrl) return { kind: "external", url: plan.externalUrl };
    return { kind: "missing_link" };
  }
  return { kind: "coming_soon" };
}

export function getPaymentPlan(planId: PlanId): PaymentPlan | undefined {
  return paymentsConfig.plans.find((p) => p.id === planId);
}
