import { estimateProviderCostEur } from "@/lib/ai-provider-pricing";
import type { CreditOperationId, CreditPlanId } from "@/lib/billing/types";
import { CREDIT_OPERATION_COSTS, PLAN_CREDIT_ALLOCATION } from "@/lib/billing/creditPolicy";

export interface TokenCostEstimate {
  operation: CreditOperationId;
  inputTokens: number;
  outputTokens: number;
  providerCostEur: number;
  creditCost: number;
  planCanRun: Record<CreditPlanId, boolean>;
  promise: string;
}

const TOKEN_ESTIMATES: Partial<Record<CreditOperationId, { input: number; output: number; promise: string }>> = {
  book_idea: { input: 1_200, output: 900, promise: "Idea/title warmup" },
  title_domination: { input: 2_600, output: 1_800, promise: "Title intelligence" },
  kdp_launch: { input: 6_000, output: 3_600, promise: "KDP package" },
  kdp_launch_analysis: { input: 6_000, output: 3_600, promise: "KDP analysis" },
  bestseller_radar_scan: { input: 5_000, output: 2_800, promise: "Market radar" },
  blueprint_generation: { input: 8_000, output: 7_500, promise: "Book blueprint" },
  generate_chapter_short: { input: 7_500, output: 4_500, promise: "Short chapter" },
  generate_chapter_medium: { input: 11_000, output: 7_000, promise: "Medium chapter" },
  generate_chapter_long: { input: 16_000, output: 11_000, promise: "Long chapter" },
  rewrite_chapter: { input: 9_000, output: 5_000, promise: "Chapter rewrite" },
  chapter_diagnostic: { input: 8_000, output: 2_400, promise: "Chapter diagnostic" },
  book_analysis: { input: 16_000, output: 4_500, promise: "Manuscript audit" },
  cover_generation: { input: 3_000, output: 1_200, promise: "AI cover direction" },
  export_epub: { input: 1_000, output: 500, promise: "EPUB export support" },
  export_docx: { input: 1_000, output: 500, promise: "DOCX export support" },
  export_pdf: { input: 1_000, output: 500, promise: "PDF export support" },
  study_summary_basic: { input: 6_000, output: 3_000, promise: "Study summary" },
  study_quiz: { input: 4_000, output: 2_200, promise: "Study quiz" },
  study_flashcards: { input: 3_500, output: 1_800, promise: "Study flashcards" },
  study_oral_exam: { input: 5_500, output: 2_500, promise: "Study oral exam" },
  study_full_exam: { input: 9_000, output: 4_000, promise: "Study full exam" },
};

export function estimateOperationTokenCost(operation: CreditOperationId): TokenCostEstimate {
  const spec = TOKEN_ESTIMATES[operation] || { input: 3_000, output: 1_500, promise: operation };
  const creditCost = CREDIT_OPERATION_COSTS[operation] ?? 0;
  const providerCostEur = estimateProviderCostEur(spec.input, spec.output);
  const planCanRun = Object.fromEntries(
    Object.entries(PLAN_CREDIT_ALLOCATION).map(([planId, credits]) => [
      planId,
      credits >= creditCost,
    ]),
  ) as Record<CreditPlanId, boolean>;

  return {
    operation,
    inputTokens: spec.input,
    outputTokens: spec.output,
    providerCostEur,
    creditCost,
    planCanRun,
    promise: spec.promise,
  };
}

export function canPlanPromiseOperation(planId: CreditPlanId, operation: CreditOperationId): boolean {
  const estimate = estimateOperationTokenCost(operation);
  return estimate.planCanRun[planId];
}

export function estimateCompleteBookCreditRange(kind: "small" | "medium" | "long"): { min: number; max: number } {
  if (kind === "small") return { min: 3_800, max: 5_500 };
  if (kind === "long") return { min: 14_000, max: 26_000 };
  return { min: 7_000, max: 12_000 };
}
