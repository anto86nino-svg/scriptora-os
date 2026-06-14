import type { BookConfig, BookLength } from "@/types/book";
import type { CreditOperationId, CreditPlanId } from "./types";

export const PLAN_CREDIT_ALLOCATION: Record<CreditPlanId, number> = {
  free: 500,
  starter: 5_000,
  pro_author: 20_000,
  studio: 75_000,
  publisher: 200_000,
};

export const CREDIT_OPERATION_COSTS: Record<CreditOperationId, number> = {
  generate_chapter_short: 150,
  generate_chapter_medium: 300,
  generate_chapter_long: 600,
  rewrite_chapter: 100,
  chapter_diagnostic: 50,
  fix_chapter: 75,
  auto_bestseller: 400,
  market_intelligence: 200,
  kdp_launch: 150,
  cover_generation: 150,
  character_studio_ai: 100,
  book_analysis: 75,
  wizard_title_regeneration: 35,
  export_premium: 50,
  masterpiece_mode: 0,
};

export const CREDIT_PACKS_DEV = [
  { id: "mini", label: "Mini", credits: 2_000 },
  { id: "standard", label: "Standard", credits: 5_000 },
  { id: "large", label: "Large", credits: 12_000 },
  { id: "mega", label: "Mega", credits: 35_000 },
] as const;

export const DEV_PURCHASE_AMOUNTS = [1_000, 5_000, 10_000, 50_000] as const;

export function resolveChapterGenerationOperation(config: Pick<BookConfig, "bookLength" | "chapterLength">): CreditOperationId {
  const length = config.bookLength || "medium";
  if (length === "short") return "generate_chapter_short";
  if (length === "long" || length === "custom") return "generate_chapter_long";
  return "generate_chapter_medium";
}

export function getOperationCost(operation: CreditOperationId, bookLength?: BookLength): number {
  if (operation === "generate_chapter_short" || operation === "generate_chapter_medium" || operation === "generate_chapter_long") {
    return CREDIT_OPERATION_COSTS[operation];
  }
  if (operation === "generate_chapter" as CreditOperationId) {
    const mapped = bookLength === "short"
      ? "generate_chapter_short"
      : bookLength === "long" || bookLength === "custom"
        ? "generate_chapter_long"
        : "generate_chapter_medium";
    return CREDIT_OPERATION_COSTS[mapped];
  }
  return CREDIT_OPERATION_COSTS[operation] ?? 0;
}

export function mapSubscriptionPlanToCreditPlan(plan: string): CreditPlanId {
  const p = String(plan || "free").toLowerCase();
  if (p === "starter" || p === "pro") return p === "starter" ? "starter" : "pro_author";
  if (p === "premium" || p === "studio") return "studio";
  if (p === "publisher" || p === "enterprise") return "publisher";
  if (p === "pro_author") return "pro_author";
  return "free";
}
