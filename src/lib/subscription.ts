// =============================================================================
// SUBSCRIPTION — central feature-gate + limits layer.
// -----------------------------------------------------------------------------
// Single source of truth for "what each plan can do". Built on top of the
// existing PlanTier system (free / beta / pro / premium) so we don't break any
// legacy code, but exposes a richer feature-key model used by paywalls.
//
// Beta is intentionally aliased to Pro: existing beta testers keep all Pro
// permissions without any account migration.
//
// IMPORTANT: this file MUST NOT mention internal providers (Brave, DeepSeek,
// Gemini, Supabase, "API"). All user-facing strings live elsewhere.
// =============================================================================

import type { PlanTier } from "@/lib/plan";

// ---------- Feature keys -----------------------------------------------------

export type FeatureKey =
  // Free baseline
  | "create_book_basic"
  | "chapter_generation_limited"
  | "local_save"
  | "preview_premium_tools_locked"
  // Pro
  | "book_engine_full"
  | "chapter_generation_advanced"
  | "chapter_rewrite"
  | "chapter_improvement"
  | "export_epub"
  | "export_pdf"
  | "export_docx"
  | "kdp_market_base"
  | "title_intelligence_base"
  | "trending_niches_limited"
  | "cover_studio_template"
  | "scene_image_generation"
  | "support_standard"
  // Premium
  | "unlimited_books_fair_use"
  | "high_word_limit"
  | "dominate_mode"
  | "live_market_research"
  | "kdp_market_advanced"
  | "title_intelligence_advanced"
  | "trending_niches_full"
  | "bestseller_prediction"
  | "packaging_intelligence"
  | "priority_generation"
  | "max_quality_output"
  | "experimental_premium_features"
  | "priority_support";

/** Minimum tier required to access each feature. */
export const FEATURE_REQUIREMENTS: Record<FeatureKey, "free" | "pro" | "premium"> = {
  // Free
  create_book_basic: "free",
  chapter_generation_limited: "free",
  local_save: "free",
  preview_premium_tools_locked: "free",
  // Pro
  book_engine_full: "pro",
  chapter_generation_advanced: "pro",
  chapter_rewrite: "pro",
  chapter_improvement: "pro",
  export_epub: "pro",
  export_pdf: "pro",
  export_docx: "pro",
  kdp_market_base: "pro",
  title_intelligence_base: "pro",
  trending_niches_limited: "pro",
  cover_studio_template: "pro",
  scene_image_generation: "pro",
  support_standard: "pro",
  // Premium
  unlimited_books_fair_use: "premium",
  high_word_limit: "premium",
  dominate_mode: "premium",
  live_market_research: "premium",
  kdp_market_advanced: "premium",
  title_intelligence_advanced: "premium",
  trending_niches_full: "premium",
  bestseller_prediction: "premium",
  packaging_intelligence: "premium",
  priority_generation: "premium",
  max_quality_output: "premium",
  experimental_premium_features: "premium",
  priority_support: "premium",
};

// ---------- Limits -----------------------------------------------------------

export type FairUse = "fair_use" | "unlimited";

export interface PlanLimitsV2 {
  activeBooks: number | FairUse;
  booksPerMonth: number | FairUse;
  /** Hard cap on words per single book. UI counter, separate from token cost. */
  maxWordsPerBook: number;
  /** Live web-grounded queries (market research, trends, etc) per month. */
  liveResearchQueriesPerMonth: number;
  exportsPerMonth: number | FairUse;
  canUseLiveMarketResearch: boolean;
  canExport: boolean;
  canUseDominateMode: boolean;
  /** Low-cost cinematic scene previews generated during Studio Live. */
  sceneImagesPerMonth: number | FairUse;
  sceneImagesPerChapter: number;
}

/** Resolved limits per *normalized* tier. Beta resolves to Pro upstream. */
export const PLAN_LIMITS_V2: Record<"free" | "pro" | "premium", PlanLimitsV2> = {
  free: {
    activeBooks: 1,
    booksPerMonth: 1,
    maxWordsPerBook: 10_000,
    liveResearchQueriesPerMonth: 0,
    exportsPerMonth: 0,
    canUseLiveMarketResearch: false,
    canExport: false,
    canUseDominateMode: false,
    sceneImagesPerMonth: 0,
    sceneImagesPerChapter: 0,
  },
  pro: {
    activeBooks: 10,
    booksPerMonth: 10,
    maxWordsPerBook: 80_000,
    liveResearchQueriesPerMonth: 30,
    exportsPerMonth: 20,
    canUseLiveMarketResearch: true,
    canExport: true,
    canUseDominateMode: false,
    sceneImagesPerMonth: 300,
    sceneImagesPerChapter: 5,
  },
  premium: {
    activeBooks: "unlimited",
    booksPerMonth: "fair_use",
    maxWordsPerBook: 200_000,
    liveResearchQueriesPerMonth: 300,
    exportsPerMonth: "fair_use",
    canUseLiveMarketResearch: true,
    canExport: true,
    canUseDominateMode: true,
    sceneImagesPerMonth: 1200,
    sceneImagesPerChapter: 12,
  },
};

// ---------- Normalization ----------------------------------------------------

/** Beta → Pro alias. All callers should normalize before reading limits. */
export function normalizePlan(plan: PlanTier): "free" | "pro" | "premium" {
  if (plan === "beta") return "pro";
  if (plan === "premium") return "premium";
  if (plan === "pro") return "pro";
  return "free";
}

export function getPlanLimits(plan: PlanTier): PlanLimitsV2 {
  return PLAN_LIMITS_V2[normalizePlan(plan)];
}

// ---------- Helpers ----------------------------------------------------------

/** Tier order used to decide if a plan is "high enough" for a feature. */
const TIER_RANK: Record<"free" | "pro" | "premium", number> = { free: 0, pro: 1, premium: 2 };

export function canUseFeature(plan: PlanTier, feature: FeatureKey): boolean {
  const req = FEATURE_REQUIREMENTS[feature];
  return TIER_RANK[normalizePlan(plan)] >= TIER_RANK[req];
}

/** What plan does the user need to get this feature? */
export function requiredPlanFor(feature: FeatureKey): "pro" | "premium" {
  const r = FEATURE_REQUIREMENTS[feature];
  return r === "free" ? "pro" : r; // free features never gate; default to pro
}

export function canCreateBook(plan: PlanTier, currentActiveBooks: number): boolean {
  const lim = getPlanLimits(plan);
  if (lim.activeBooks === "unlimited" || lim.activeBooks === "fair_use") return true;
  return currentActiveBooks < lim.activeBooks;
}

export function canGenerateMoreWords(
  plan: PlanTier,
  currentWordCount: number,
  requestedWords = 0,
): boolean {
  const max = getPlanLimits(plan).maxWordsPerBook;
  return currentWordCount + requestedWords <= max;
}

export function canUseLiveResearch(plan: PlanTier): boolean {
  return getPlanLimits(plan).canUseLiveMarketResearch;
}

export function canExportFormat(plan: PlanTier, _format: "epub" | "pdf" | "docx"): boolean {
  return getPlanLimits(plan).canExport;
}

// ---------- Word counting ----------------------------------------------------

/** Count words in a free-form string (whitespace-separated tokens). */
export function countWords(text: string | undefined | null): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Count words across an entire BookProject (chapters + subchapters + matter). */
export function countProjectWords(project: any): number {
  if (!project) return 0;
  let total = 0;
  total += countWords(project?.frontMatter?.content);
  total += countWords(project?.backMatter?.content);
  const chapters = Array.isArray(project?.chapters) ? project.chapters : [];
  for (const c of chapters) {
    total += countWords(c?.content);
    const subs = Array.isArray(c?.subchapters) ? c.subchapters : [];
    for (const s of subs) total += countWords(s?.content);
  }
  return total;
}

/** UI-friendly summary used by paywall + status badges. */
export interface WordBudget {
  used: number;
  max: number;
  remaining: number;
  percent: number; // 0-100
  exceeded: boolean;
}

export function getWordBudget(plan: PlanTier, project: any): WordBudget {
  const max = getPlanLimits(plan).maxWordsPerBook;
  const used = countProjectWords(project);
  const remaining = Math.max(0, max - used);
  const percent = Math.min(100, Math.round((used / max) * 100));
  return { used, max, remaining, percent, exceeded: used >= max };
}

// ---------- Display labels (no provider names!) ------------------------------

export const PLAN_LABEL: Record<"free" | "pro" | "premium", string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

/** Reason copy for a paywall — never mentions internal providers. */
export function paywallCopyFor(feature: FeatureKey): { title: string; subtitle: string; required: "pro" | "premium" } {
  const required = requiredPlanFor(feature);
  const copyByFeature: Partial<Record<FeatureKey, { title: string; subtitle: string }>> = {
    dominate_mode: {
      title: "Developmental editing at full depth",
      subtitle: "Surgical chapter revision with voice lock, canon preservation, and editorial intelligence.",
    },
    export_epub: {
      title: "Publish-ready export",
      subtitle: "Take your manuscript to EPUB, PDF, and DOCX when the book is ready.",
    },
    kdp_market_base: {
      title: "Market intelligence for authors",
      subtitle: "KDP positioning, packaging, and commercial analysis — one professional workflow.",
    },
    bestseller_prediction: {
      title: "Commercial launch analysis",
      subtitle: "Deeper market signals for launch decisions — not hype, structured guidance.",
    },
  };
  const specific = copyByFeature[feature];
  if (specific) return { ...specific, required };
  const title = required === "premium" ? "Premium author tools" : "Pro author tools";
  const subtitle =
    required === "premium"
      ? "Included in Premium — editorial depth, export, and market intelligence in one OS."
      : "Included in Pro — professional writing workflow beyond the free book.";
  return { title, subtitle, required };
}
