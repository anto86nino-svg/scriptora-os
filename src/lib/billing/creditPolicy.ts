/**
 * Scriptora editorial credit policy — single source of truth for commercial operation costs.
 *
 * Credits represent editorial value (diagnosis, generation, export, etc.), NOT raw LLM tokens.
 * Provider multipliers decouple pricing from any one vendor (DeepSeek today, Gemini/OpenAI/Claude tomorrow).
 *
 * PRODUCTION NOTE:
 * In production, credit checks and debits MUST run on the backend / Supabase Edge Function,
 * not only in the browser. Frontend logic here is for UX previews and soft gates until the
 * ledger API exists — never treat client-side balances as authoritative for billing.
 */

export type ScriptoraPlan = "free" | "starter" | "pro" | "studio" | "publisher";

export type AiProviderKey =
  | "deepseek_flash"
  | "deepseek_pro"
  | "gemini_flash"
  | "openai_mini"
  | "claude_haiku"
  | "claude_sonnet"
  | "claude_opus";

export type CreditOperation =
  | "title_generation"
  | "quick_editorial_diagnosis"
  | "chapter_diagnosis"
  | "paragraph_rewrite"
  | "surgical_fix"
  | "chapter_doctor"
  | "book_blueprint"
  | "market_intelligence"
  | "chapter_generation_short"
  | "chapter_generation_standard"
  | "chapter_generation_long"
  | "chapter_regeneration"
  | "chapter_continue"
  | "uploaded_book_analysis"
  | "advanced_export"
  | "full_book_short"
  | "full_book_medium"
  | "full_book_long"
  | "full_book_epic";

export type CreditIntensity = "light" | "standard" | "heavy";

export interface CreditCostParams {
  operation: CreditOperation;
  plan?: ScriptoraPlan;
  provider?: AiProviderKey;
  intensity?: CreditIntensity;
  estimatedWords?: number;
}

export interface CreditRunCheckParams extends CreditCostParams {
  availableCredits: number;
}

export interface CreditRunCheckResult {
  allowed: boolean;
  requiredCredits: number;
  missingCredits: number;
}

export interface CreditPackOffer {
  credits: number;
  priceEur: number;
  label: string;
}

export const CREDIT_OPERATION_BASE_COSTS: Record<CreditOperation, number> = {
  title_generation: 1,
  quick_editorial_diagnosis: 2,
  chapter_diagnosis: 4,
  paragraph_rewrite: 2,
  surgical_fix: 5,
  chapter_doctor: 8,
  book_blueprint: 12,
  market_intelligence: 8,
  chapter_generation_short: 8,
  chapter_generation_standard: 12,
  chapter_generation_long: 18,
  chapter_regeneration: 10,
  chapter_continue: 6,
  uploaded_book_analysis: 20,
  advanced_export: 10,
  full_book_short: 120,
  full_book_medium: 280,
  full_book_long: 450,
  full_book_epic: 700,
};

export const PROVIDER_MULTIPLIERS: Record<AiProviderKey, number> = {
  deepseek_flash: 0.7,
  deepseek_pro: 1.0,
  gemini_flash: 0.9,
  openai_mini: 1.2,
  claude_haiku: 1.8,
  claude_sonnet: 3.5,
  claude_opus: 6.0,
};

export const PLAN_MONTHLY_CREDITS: Record<ScriptoraPlan, number> = {
  free: 40,
  starter: 250,
  pro: 700,
  studio: 2000,
  publisher: 5000,
};

export const PLAN_OPERATION_DISCOUNTS: Record<ScriptoraPlan, number> = {
  free: 1.0,
  starter: 0.95,
  pro: 0.9,
  studio: 0.85,
  publisher: 0.8,
};

export const INTENSITY_MULTIPLIERS: Record<CreditIntensity, number> = {
  light: 0.75,
  standard: 1,
  heavy: 1.35,
};

export const CREDIT_PACKS: readonly CreditPackOffer[] = [
  { credits: 100, priceEur: 4.99, label: "100 crediti" },
  { credits: 300, priceEur: 12.99, label: "300 crediti" },
  { credits: 800, priceEur: 29.99, label: "800 crediti" },
  { credits: 2000, priceEur: 69.99, label: "2.000 crediti" },
  { credits: 5000, priceEur: 149.99, label: "5.000 crediti" },
] as const;

const DEFAULT_PROVIDER: AiProviderKey = "deepseek_pro";

const OPERATION_LABELS_IT: Record<CreditOperation, string> = {
  title_generation: "Generazione titolo",
  quick_editorial_diagnosis: "Diagnosi editoriale",
  chapter_diagnosis: "Diagnosi capitolo",
  paragraph_rewrite: "Riscrittura paragrafo",
  surgical_fix: "Fix chirurgico",
  chapter_doctor: "Chapter Doctor",
  book_blueprint: "Blueprint libro",
  market_intelligence: "Market intelligence",
  chapter_generation_short: "Generazione capitolo (breve)",
  chapter_generation_standard: "Generazione capitolo (standard)",
  chapter_generation_long: "Generazione capitolo (lungo)",
  chapter_regeneration: "Rigenerazione capitolo",
  chapter_continue: "Continuazione capitolo",
  uploaded_book_analysis: "Analisi libro caricato",
  advanced_export: "Export avanzato",
  full_book_short: "Libro completo (breve)",
  full_book_medium: "Libro completo (medio)",
  full_book_long: "Libro completo (lungo)",
  full_book_epic: "Libro completo (epico)",
};

/** Soft word-count scaling applied on top of base × provider × plan × intensity. */
export function wordCountScalingMultiplier(estimatedWords?: number): number {
  if (estimatedWords == null || estimatedWords <= 3000) return 1;
  if (estimatedWords <= 7000) return 1.2;
  if (estimatedWords <= 15000) return 1.5;
  return 2;
}

export function calculateCreditCost(params: CreditCostParams): number {
  const base = CREDIT_OPERATION_BASE_COSTS[params.operation];
  const providerMultiplier = PROVIDER_MULTIPLIERS[params.provider ?? DEFAULT_PROVIDER];
  const planDiscount = PLAN_OPERATION_DISCOUNTS[params.plan ?? "free"];
  const intensityMultiplier = INTENSITY_MULTIPLIERS[params.intensity ?? "standard"];
  const wordMultiplier = wordCountScalingMultiplier(params.estimatedWords);

  const raw = base * providerMultiplier * planDiscount * intensityMultiplier * wordMultiplier;
  return Math.max(1, Math.ceil(raw));
}

export function canRunCreditOperation(params: CreditRunCheckParams): CreditRunCheckResult {
  const requiredCredits = calculateCreditCost(params);
  const missingCredits = Math.max(0, requiredCredits - Math.max(0, params.availableCredits));
  return {
    allowed: missingCredits === 0,
    requiredCredits,
    missingCredits,
  };
}

export function getCreditOperationLabel(operation: CreditOperation): string {
  return OPERATION_LABELS_IT[operation] ?? operation;
}

export function getMonthlyCreditsForPlan(plan: ScriptoraPlan): number {
  return PLAN_MONTHLY_CREDITS[plan];
}

/** Smallest pack that covers the shortfall; falls back to largest pack. */
export function getRecommendedCreditPack(requiredCredits: number): CreditPackOffer {
  const need = Math.max(1, Math.ceil(requiredCredits));
  return CREDIT_PACKS.find((pack) => pack.credits >= need) ?? CREDIT_PACKS[CREDIT_PACKS.length - 1];
}
