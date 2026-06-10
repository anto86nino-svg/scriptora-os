import { CREDIT_OPERATION_COSTS as BILLING_COSTS } from "@/lib/billing/creditPolicy";
import { creditSimulationBadge, isDevUnlimitedCredits } from "@/lib/billing/devMode";

export type CreditOperation =
  | "chapter_generation"
  | "chapter_rewrite"
  | "chapter_diagnostic"
  | "manuscript_diagnostic"
  | "kdp_market"
  | "kdp_titles"
  | "kdp_packaging"
  | "kdp_prediction"
  | "cover_generation"
  | "export_package";

/** Legacy UI labels mapped to billing/creditPolicy costs */
export const CREDIT_OPERATION_COSTS: Record<CreditOperation, number> = {
  chapter_generation: BILLING_COSTS.generate_chapter_medium,
  chapter_rewrite: BILLING_COSTS.rewrite_chapter,
  chapter_diagnostic: BILLING_COSTS.chapter_diagnostic,
  manuscript_diagnostic: BILLING_COSTS.book_analysis,
  kdp_market: BILLING_COSTS.kdp_launch,
  kdp_titles: BILLING_COSTS.kdp_launch,
  kdp_packaging: BILLING_COSTS.kdp_launch,
  kdp_prediction: BILLING_COSTS.kdp_launch,
  cover_generation: BILLING_COSTS.cover_generation,
  export_package: BILLING_COSTS.export_premium,
};

export function estimateCreditsFromWords(words: number): number {
  return Math.max(0, Math.ceil(words * 1.35));
}

export function formatCredits(value: number | null | undefined): string {
  if (value == null) return "Illimitati";
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return value.toLocaleString("it-IT");
}

export function operationCreditLabel(operation: CreditOperation, devMode = false): string {
  const cost = formatCredits(CREDIT_OPERATION_COSTS[operation]);
  const badge = creditSimulationBadge();
  if (badge === "DEV SIMULATION") return `${badge} · ${cost} crediti`;
  return `${devMode ? "DEV · " : ""}${cost} crediti`;
}

export function creditModeLabel(devMode = false): string {
  if (isDevUnlimitedCredits()) return "DEV SIMULATION";
  return devMode ? "Developer Mode" : "Real Credits";
}

export function creditModeDisclosure(devMode = false): string {
  if (isDevUnlimitedCredits()) {
    return "DEV SIMULATION attiva: nessun credito reale viene consumato. Il saldo mostrato è simulato.";
  }
  return devMode
    ? "Dev Mode: i crediti scalano normalmente sul wallet locale."
    : "I crediti verranno consumati in base all'operazione eseguita.";
}
