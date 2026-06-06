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

export const CREDIT_OPERATION_COSTS: Record<CreditOperation, number> = {
  chapter_generation: 1200,
  chapter_rewrite: 520,
  chapter_diagnostic: 180,
  manuscript_diagnostic: 260,
  kdp_market: 420,
  kdp_titles: 240,
  kdp_packaging: 320,
  kdp_prediction: 560,
  cover_generation: 680,
  export_package: 80,
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
  return `${devMode ? "SIM DEV · " : ""}${cost} crediti`;
}

export function creditModeLabel(devMode = false): string {
  return devMode ? "Developer Mode" : "Real Credits";
}

export function creditModeDisclosure(devMode = false): string {
  return devMode
    ? "Simulazione crediti attiva. Nessun credito reale viene consumato."
    : "I crediti verranno consumati in base all'operazione eseguita.";
}
