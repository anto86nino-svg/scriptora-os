/**
 * Intelligence Router — invisible decision engine.
 *
 * Classifies every AI request, picks the best generation mode given the user's plan,
 * and produces the runtime knobs (model, max_tokens, temperature, multi-pass).
 *
 * UX note: this module is INVISIBLE to the user. No labels, no toasts, no badges.
 * It only optimises cost vs quality behind the scenes.
 */

import type { PlanTier } from "@/lib/plan";

/* ============ Types ============ */

export type Complexity = "low" | "medium" | "high" | "premium";
export type ContentType = "title" | "chapter" | "full_book" | "rewrite" | "analysis";
export type GenerationMode = "fast" | "smart" | "pro" | "dominate";

export interface RequestSignal {
  /** Free-form intent label, e.g. "generate-chapter", "title-autofill", "dominate". */
  task: string;
  /** Optional raw user/system text used to estimate complexity. */
  text?: string;
  /** Optional explicit content type override. */
  contentType?: ContentType;
  /** Genre, used to bias complexity (fiction/poetry → higher). */
  genre?: string;
  /** Subcategory (passed straight to family resolver). */
  subcategory?: string;
  /** Target length in words (chapter/book). */
  targetWords?: number;
  /** User explicitly asked for a deep rewrite (Dominate button). */
  forceDominate?: boolean;
  /** Editorial mastery tier active for this project. */
  masteryTier?: "standard" | "advanced" | "mastery";
}

export interface RequestClassification {
  complexity: Complexity;
  contentType: ContentType;
}

export interface GenerationConfig {
  mode: GenerationMode;
  /** Provider-agnostic model id. Edge function maps it to the actual provider. */
  model: string;
  maxTokens: number;
  temperature: number;
  /** When > 1, the engine should run a critic→rewrite second pass. */
  passes: 1 | 2;
  /** Whether the editorial-mastery prompt block must be injected. */
  injectMastery: boolean;
  /** Reasoning effort for models that support it. */
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
}

/* ============ 1. Classification ============ */

const FICTION_GENRES = new Set([
  "horror", "romance", "thriller", "fantasy", "sci-fi", "science fiction",
  "mystery", "literary", "drama", "historical fiction", "young adult", "ya",
]);
const POETIC_GENRES = new Set(["poetry", "poesia", "memoir", "biography", "biografia"]);

function inferContentType(task: string, signal: RequestSignal): ContentType {
  if (signal.contentType) return signal.contentType;
  const t = task.toLowerCase();
  if (t.includes("title")) return "title";
  if (t.includes("analy") || t.includes("coach") || t.includes("validator")) return "analysis";
  if (t.includes("dominate") || t.includes("rewrite") || t.includes("fix-section") || t.includes("patch")) return "rewrite";
  if (t.includes("auto-bestseller") || t.includes("full-book") || t.includes("book-engine")) return "full_book";
  return "chapter";
}

function inferComplexity(signal: RequestSignal, contentType: ContentType): Complexity {
  if (signal.forceDominate) return "premium";

  const genre = (signal.genre || "").toLowerCase();
  const isFiction = FICTION_GENRES.has(genre);
  const isPoetic = POETIC_GENRES.has(genre);
  const masteryHigh = signal.masteryTier === "mastery";

  // Title & short analysis → cheap.
  if (contentType === "title") return "low";
  if (contentType === "analysis") {
    return masteryHigh ? "medium" : "low";
  }

  // Rewrite is intrinsically demanding.
  if (contentType === "rewrite") {
    return masteryHigh || isFiction || isPoetic ? "premium" : "high";
  }

  // Chapter / full_book — scale on length + genre.
  const words = signal.targetWords ?? (signal.text?.split(/\s+/).length ?? 0);
  if (contentType === "full_book") {
    return masteryHigh ? "premium" : "high";
  }

  if (words >= 1500 || isFiction || isPoetic) {
    return masteryHigh ? "premium" : "high";
  }
  if (words >= 700) return "medium";
  return "low";
}

export function analyzeRequest(signal: RequestSignal): RequestClassification {
  const contentType = inferContentType(signal.task, signal);
  const complexity = inferComplexity(signal, contentType);
  return { complexity, contentType };
}

/* ============ 2. Decision Engine ============ */

/**
 * Pick generation mode from plan + complexity.
 *
 * FREE   → always FAST (cost protection)
 * BETA   → FAST/SMART
 * PRO    → low→fast, medium→smart, high→pro, premium→pro
 * PREMIUM→ low→fast, medium→smart, high→pro, premium→dominate
 */
export function selectGenerationMode(
  classification: RequestClassification,
  plan: PlanTier,
): GenerationMode {
  const { complexity } = classification;

  if (plan === "free") return "fast";

  if (plan === "beta") {
    if (complexity === "low") return "fast";
    return "smart";
  }

  if (plan === "pro") {
    switch (complexity) {
      case "low": return "fast";
      case "medium": return "smart";
      case "high": return "pro";
      case "premium": return "pro";
    }
  }

  // premium
  switch (complexity) {
    case "low": return "fast";
    case "medium": return "smart";
    case "high": return "pro";
    case "premium": return "dominate";
  }
}

/* ============ 3. Generation Modes → runtime config ============ */

const MODE_PROFILES: Record<GenerationMode, Omit<GenerationConfig, "mode">> = {
  fast: {
    model: "deepseek-chat",
    maxTokens: 2000,
    temperature: 0.7,
    passes: 1,
    injectMastery: false,
    reasoningEffort: "minimal",
  },
  smart: {
    model: "deepseek-chat",
    maxTokens: 3500,
    temperature: 0.75,
    passes: 1,
    injectMastery: false,
    reasoningEffort: "low",
  },
  pro: {
    model: "deepseek-chat",
    maxTokens: 5500,
    temperature: 0.8,
    passes: 1,
    injectMastery: true,
    reasoningEffort: "medium",
  },
  dominate: {
    model: "deepseek-reasoner",
    maxTokens: 7500,
    temperature: 0.85,
    passes: 2,
    injectMastery: true,
    reasoningEffort: "high",
  },
};

export function buildGenerationConfig(mode: GenerationMode): GenerationConfig {
  return { mode, ...MODE_PROFILES[mode] };
}

/* ============ 4. One-shot router ============ */

/**
 * Convenience: classify + pick mode + build config in one call.
 * Returns everything callers need to execute the request.
 */
export function routeRequest(signal: RequestSignal, plan: PlanTier): {
  classification: RequestClassification;
  mode: GenerationMode;
  config: GenerationConfig;
} {
  const classification = analyzeRequest(signal);
  const mode = selectGenerationMode(classification, plan);
  const config = buildGenerationConfig(mode);

  // Silent telemetry — never surfaced to UX.
  if (typeof console !== "undefined") {
    console.debug(
      `[Scriptora/Router] task=${signal.task} type=${classification.contentType} ` +
      `complexity=${classification.complexity} → mode=${mode} ` +
      `(model=${config.model}, max=${config.maxTokens}, passes=${config.passes})`,
    );
  }

  return { classification, mode, config };
}
