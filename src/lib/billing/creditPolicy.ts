import type { BookConfig, BookLength } from "@/types/book";
import type { CreditOperationId, CreditPlanId, OperationCostQuote } from "./types";

export const PLAN_CREDIT_ALLOCATION: Record<CreditPlanId, number> = {
  free: 300,
  starter: 3_000,
  pro_author: 8_000,
  studio: 25_000,
  publisher: 60_000,
  student_free: 300,
  student_basic: 1_500,
  student_plus: 4_000,
  student_pro_exam: 10_000,
  study_os_pro: 0,
};

/** Maps canonical/display operation keys to runtime billing keys used in the app. */
export const OPERATION_KEY_ALIASES: Record<string, CreditOperationId> = {
  chapter_short: "generate_chapter_short",
  chapter_standard: "generate_chapter_medium",
  chapter_long: "generate_chapter_long",
  rewrite_scene: "rewrite_chapter",
  patch_chapter: "fix_chapter",
  analysis_pro_chapter: "chapter_diagnostic",
  manuscript_analyzer: "book_analysis",
  kdp_launch_analysis: "kdp_launch",
  bestseller_radar_scan: "auto_bestseller",
};

export const CREDIT_OPERATION_COSTS: Record<CreditOperationId, number> = {
  generate_chapter_short: 180,
  generate_chapter_medium: 350,
  generate_chapter_long: 650,
  rewrite_chapter: 180,
  chapter_diagnostic: 120,
  fix_chapter: 250,
  auto_bestseller: 250,
  market_intelligence: 250,
  kdp_launch: 450,
  cover_generation: 400,
  character_studio_ai: 80,
  book_analysis: 300,
  wizard_title_regeneration: 35,
  export_premium: 150,
  masterpiece_mode: 0,
  book_idea: 30,
  title_domination: 80,
  blueprint_generation: 250,
  chapter_regenerate: 280,
  analysis_pro_chapter: 120,
  patch_chapter: 250,
  manuscript_analyzer: 300,
  kdp_launch_analysis: 450,
  kdp_narrative_flow: 350,
  bestseller_radar_scan: 250,
  cover_variant: 120,
  export_epub: 150,
  export_docx: 120,
  export_pdf: 180,
  voice_advanced: 80,
  study_text_ingest: 30,
  study_summary_basic: 80,
  study_summary_advanced: 150,
  study_explain_simple: 80,
  study_explain_3_levels: 180,
  study_flashcards: 100,
  study_quiz: 120,
  study_oral_exam: 180,
  study_answer_review: 60,
  study_plan: 160,
  study_mindmap: 180,
  study_long_material: 300,
  study_long_material_heavy: 600,
  study_full_exam: 500,
};

const PLAN_DISCOUNT_RULES: Record<CreditPlanId, { author: number; study: number }> = {
  free: { author: 0, study: 0 },
  starter: { author: 5, study: 0 },
  pro_author: { author: 10, study: 0 },
  studio: { author: 20, study: 0 },
  publisher: { author: 30, study: 30 },
  student_free: { author: 0, study: 0 },
  student_basic: { author: 0, study: 5 },
  student_plus: { author: 0, study: 10 },
  student_pro_exam: { author: 0, study: 20 },
  study_os_pro: { author: 0, study: 100 },
};

export const CREDIT_PACKS_DEV = [
  { id: "micro", label: "Micro", credits: 500, priceLabel: "€2" },
  { id: "mini", label: "Mini", credits: 1_000, priceLabel: "€3" },
  { id: "author", label: "Author", credits: 3_000, priceLabel: "€7" },
  { id: "studio_pack", label: "Studio Pack", credits: 10_000, priceLabel: "€19" },
  { id: "publisher_pack", label: "Publisher Pack", credits: 25_000, priceLabel: "€39" },
] as const;

export const DEV_PURCHASE_AMOUNTS = [500, 1_000, 3_000, 10_000, 25_000] as const;

export type OperationCostOptions = {
  bookLength?: BookLength;
  planId?: CreditPlanId;
};

export function normalizeOperationKey(operation: string): CreditOperationId {
  const aliased = OPERATION_KEY_ALIASES[operation];
  if (aliased) return aliased;
  return operation as CreditOperationId;
}

export function isStudyOperation(operation: CreditOperationId): boolean {
  return operation.startsWith("study_");
}

export function getPlanDiscountPercent(planId: CreditPlanId, operation: CreditOperationId): number {
  const rules = PLAN_DISCOUNT_RULES[planId] ?? PLAN_DISCOUNT_RULES.free;
  return isStudyOperation(operation) ? rules.study : rules.author;
}

export function resolveChapterGenerationOperation(config: Pick<BookConfig, "bookLength" | "chapterLength">): CreditOperationId {
  const length = config.bookLength || "medium";
  if (length === "short") return "generate_chapter_short";
  if (length === "long" || length === "custom") return "generate_chapter_long";
  return "generate_chapter_medium";
}

function resolveBaseCost(operation: CreditOperationId, bookLength?: BookLength): number {
  const normalized = normalizeOperationKey(operation);
  if (
    normalized === "generate_chapter_short"
    || normalized === "generate_chapter_medium"
    || normalized === "generate_chapter_long"
  ) {
    return CREDIT_OPERATION_COSTS[normalized];
  }
  if (normalized === "generate_chapter" as CreditOperationId) {
    const mapped = bookLength === "short"
      ? "generate_chapter_short"
      : bookLength === "long" || bookLength === "custom"
        ? "generate_chapter_long"
        : "generate_chapter_medium";
    return CREDIT_OPERATION_COSTS[mapped];
  }
  return CREDIT_OPERATION_COSTS[normalized] ?? 0;
}

export function getOperationCostQuote(
  operation: CreditOperationId | string,
  options?: BookLength | OperationCostOptions,
): OperationCostQuote {
  const resolvedOptions: OperationCostOptions = typeof options === "string" || options === undefined
    ? { bookLength: options as BookLength | undefined }
    : options;
  const normalized = normalizeOperationKey(String(operation));
  const baseCost = resolveBaseCost(normalized, resolvedOptions.bookLength);
  const discountPercent = resolvedOptions.planId
    ? getPlanDiscountPercent(resolvedOptions.planId, normalized)
    : 0;
  const finalCost = Math.max(0, Math.round(baseCost * (1 - discountPercent / 100)));
  return {
    baseCost,
    discountPercent,
    finalCost,
    label: normalized,
  };
}

export function getOperationCost(
  operation: CreditOperationId | string,
  bookLengthOrOptions?: BookLength | OperationCostOptions,
): number {
  return getOperationCostQuote(operation, bookLengthOrOptions).finalCost;
}

export function mapSubscriptionPlanToCreditPlan(plan: string): CreditPlanId {
  const p = String(plan || "free").toLowerCase();
  if (
    p === "student_free"
    || p === "student_basic"
    || p === "student_plus"
    || p === "student_pro_exam"
    || p === "study_os_pro"
    || p === "study"
    || p === "study_pro"
  ) {
    if (p === "study" || p === "study_pro") return "study_os_pro";
    return p as CreditPlanId;
  }
  if (p === "starter") return "starter";
  if (p === "pro" || p === "beta" || p === "author_pro" || p === "pro_author") return "pro_author";
  if (p === "premium" || p === "studio") return "studio";
  if (p === "publisher" || p === "enterprise") return "publisher";
  return "free";
}
