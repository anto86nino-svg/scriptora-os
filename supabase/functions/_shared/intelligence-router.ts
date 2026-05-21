/**
 * Intelligence Router — edge-side mirror.
 *
 * Same decision engine as src/lib/ai/intelligence-router.ts but runnable inside
 * Supabase Edge Functions (Deno). Keep the two files in sync when changing rules.
 */

import { estimateTokens, logAIUsage } from "./ai-tracking.ts";

export type Complexity = "low" | "medium" | "high" | "premium";
export type ContentType = "title" | "chapter" | "full_book" | "rewrite" | "analysis";
export type GenerationMode = "fast" | "smart" | "pro" | "dominate";
export type PlanTier = "free" | "beta" | "pro" | "premium";

export interface RequestSignal {
  task: string;
  text?: string;
  contentType?: ContentType;
  genre?: string;
  subcategory?: string;
  targetWords?: number;
  forceDominate?: boolean;
  masteryTier?: "standard" | "advanced" | "mastery";
}

export interface RequestClassification {
  complexity: Complexity;
  contentType: ContentType;
}

export interface GenerationConfig {
  mode: GenerationMode;
  model: string;
  maxTokens: number;
  temperature: number;
  passes: 1 | 2;
  injectMastery: boolean;
  reasoningEffort?: "minimal" | "low" | "medium" | "high";
}

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

  if (contentType === "title") return "low";
  if (contentType === "analysis") return masteryHigh ? "medium" : "low";
  if (contentType === "rewrite") {
    return masteryHigh || isFiction || isPoetic ? "premium" : "high";
  }
  const words = signal.targetWords ?? (signal.text?.split(/\s+/).length ?? 0);
  if (contentType === "full_book") return masteryHigh ? "premium" : "high";
  if (words >= 1500 || isFiction || isPoetic) return masteryHigh ? "premium" : "high";
  if (words >= 700) return "medium";
  return "low";
}

export function analyzeRequest(signal: RequestSignal): RequestClassification {
  const contentType = inferContentType(signal.task, signal);
  const complexity = inferComplexity(signal, contentType);
  return { complexity, contentType };
}

export function selectGenerationMode(
  classification: RequestClassification,
  plan: PlanTier,
): GenerationMode {
  const { complexity } = classification;
  if (plan === "free") return "fast";
  if (plan === "beta") return complexity === "low" ? "fast" : "smart";
  if (plan === "pro") {
    if (complexity === "low") return "fast";
    if (complexity === "medium") return "smart";
    return "pro";
  }
  // premium
  if (complexity === "low") return "fast";
  if (complexity === "medium") return "smart";
  if (complexity === "high") return "pro";
  return "dominate";
}

const MODE_PROFILES: Record<GenerationMode, Omit<GenerationConfig, "mode">> = {
  fast:     { model: "deepseek-chat",     maxTokens: 2000, temperature: 0.7,  passes: 1, injectMastery: false, reasoningEffort: "minimal" },
  smart:    { model: "deepseek-chat",     maxTokens: 3500, temperature: 0.75, passes: 1, injectMastery: false, reasoningEffort: "low"     },
  pro:      { model: "deepseek-chat",     maxTokens: 5500, temperature: 0.8,  passes: 1, injectMastery: true,  reasoningEffort: "medium"  },
  dominate: { model: "deepseek-reasoner", maxTokens: 7500, temperature: 0.85, passes: 2, injectMastery: true,  reasoningEffort: "high"    },
};

export function buildGenerationConfig(mode: GenerationMode): GenerationConfig {
  return { mode, ...MODE_PROFILES[mode] };
}

export function routeRequest(signal: RequestSignal, plan: PlanTier): {
  classification: RequestClassification;
  mode: GenerationMode;
  config: GenerationConfig;
} {
  const classification = analyzeRequest(signal);
  const mode = selectGenerationMode(classification, plan);
  const config = buildGenerationConfig(mode);
  console.log(
    `[Nexora/Router] task=${signal.task} type=${classification.contentType} ` +
    `complexity=${classification.complexity} → mode=${mode} ` +
    `(model=${config.model}, max=${config.maxTokens}, passes=${config.passes})`,
  );
  return { classification, mode, config };
}

/* ============ callAIWithRouting (DeepSeek) ============ */

export interface CallAIOptions {
  signal: RequestSignal;
  plan?: PlanTier;
  systemPrompt: string;
  userPrompt: string;
  /** Optional override of the routing decision (e.g. when analysis only needs FAST). */
  forceMode?: GenerationMode;
  /** Append a mastery prompt block when the router decides to inject it. */
  masteryBlock?: string;
  taskType?: string;
  projectId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface CallAIResult {
  text: string;
  mode: GenerationMode;
  classification: RequestClassification;
  config: GenerationConfig;
}

/**
 * Unified DeepSeek caller used by Edge Functions.
 * 1. Classifies the request.
 * 2. Picks the mode based on plan.
 * 3. Builds the prompt + runtime knobs.
 * 4. Executes the call (single-pass; multi-pass left to caller for streaming flows).
 */
export async function callAIWithRouting(opts: CallAIOptions): Promise<CallAIResult> {
  const plan = opts.plan ?? "free";
  const routed = routeRequest(opts.signal, plan);
  const mode = opts.forceMode ?? routed.mode;
  const config = opts.forceMode ? buildGenerationConfig(opts.forceMode) : routed.config;

  const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  const systemPrompt = config.injectMastery && opts.masteryBlock
    ? `${opts.systemPrompt}\n\n${opts.masteryBlock}`
    : opts.systemPrompt;

  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`DeepSeek error ${res.status}: ${t.slice(0, 200)}`);
  }

  const data = await res.json();
  const text: string = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage || {};
  logAIUsage({
    provider: "deepseek",
    model: config.model,
    taskType: opts.taskType || opts.signal.task || "routed_ai_call",
    promptTokens: usage.prompt_tokens ?? estimateTokens(`${systemPrompt}${opts.userPrompt}`),
    completionTokens: usage.completion_tokens ?? estimateTokens(text),
    promptCacheHitTokens: usage.prompt_cache_hit_tokens,
    promptCacheMissTokens: usage.prompt_cache_miss_tokens,
    projectId: opts.projectId || null,
    userId: opts.userId || null,
    metadata: { ...(opts.metadata || {}), mode, routeComplexity: routed.classification.complexity },
  });

  return { text, mode, classification: routed.classification, config };
}
