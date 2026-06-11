/**
 * Adaptive Rewrite Engine — invisible quality optimiser.
 *
 * Decides whether to keep the generated text as-is or to apply a light / heavy /
 * dominate rewrite based on per-metric scoring and the user's plan.
 *
 * Rules of thumb:
 *  - FREE plan never spends extra tokens (always "none").
 *  - PRO can do light / heavy.
 *  - PREMIUM unlocks DOMINATE multi-pass for very weak outputs.
 *  - Hooks and engagement floors override base logic.
 *  - UX is invisible: caller only sees the final improved string.
 */

import type { PlanTier } from "@/lib/plan";
import { validateEditorial } from "@/lib/editorial-validator";

/* ============ Types ============ */

export type RewriteMode = "none" | "light" | "heavy" | "dominate";
export type RewriteContentType = "title" | "hook" | "chapter" | "full_book";

export interface QualityMetrics {
  hook_strength: number;     // 0-10
  clarity: number;           // 0-10
  engagement: number;        // 0-10
  emotional_impact: number;  // 0-10
  commercial_power: number;  // 0-10
}

export interface AdaptiveRewriteInput {
  text: string;
  contentType: RewriteContentType;
  plan: PlanTier;
  qualityScore: number;       // 0-10 aggregate
  metrics: QualityMetrics;
}

export interface RewriteDecision {
  mode: RewriteMode;
  reason: string;
}

/* ============ 3+4. Decision engine ============ */

function basePlanDecision(plan: PlanTier, score: number): RewriteMode {
  if (plan === "free") return "none";

  if (plan === "premium") {
    if (score >= 9) return "none";
    if (score >= 8) return "light";
    if (score >= 6.5) return "heavy";
    return "dominate";
  }

  // pro & beta
  if (score >= 8.5) return "none";
  if (score >= 7) return "light";
  return "heavy";
}

const MODE_RANK: Record<RewriteMode, number> = {
  none: 0, light: 1, heavy: 2, dominate: 3,
};

function atLeast(current: RewriteMode, minimum: RewriteMode): RewriteMode {
  return MODE_RANK[current] >= MODE_RANK[minimum] ? current : minimum;
}

function clampForContent(mode: RewriteMode, contentType: RewriteContentType): RewriteMode {
  // Titles never deserve a multi-pass.
  if (contentType === "title" && MODE_RANK[mode] > MODE_RANK.light) return "light";
  return mode;
}

export function decideRewriteMode(input: AdaptiveRewriteInput): RewriteDecision {
  const { plan, qualityScore, contentType, metrics } = input;

  let mode = basePlanDecision(plan, qualityScore);
  let reason = `base(plan=${plan}, score=${qualityScore.toFixed(1)}) → ${mode}`;

  // Content-type overrides (5).
  if (contentType === "hook" && metrics.hook_strength < 8) {
    const upgraded = atLeast(mode, "light");
    if (upgraded !== mode) reason += ` | hook_strength<8 → ${upgraded}`;
    mode = upgraded;
  }
  if (contentType === "chapter" && metrics.engagement < 7) {
    const upgraded = atLeast(mode, "heavy");
    if (upgraded !== mode) reason += ` | engagement<7 → ${upgraded}`;
    mode = upgraded;
  }

  // Title clamp.
  const clamped = clampForContent(mode, contentType);
  if (clamped !== mode) reason += ` | clamp(title) → ${clamped}`;
  mode = clamped;

  // Free plan absolute lock.
  if (plan === "free" && mode !== "none") {
    reason += " | free-lock → none";
    mode = "none";
  }

  return { mode, reason };
}

/* ============ 6. Mode-specific instructions ============ */

const REWRITE_INSTRUCTIONS: Record<Exclude<RewriteMode, "none">, string> = {
  light: [
    "REWRITE MODE: LIGHT.",
    "Rewrite ONLY:",
    "  • the opening hook (first 2-3 sentences)",
    "  • weak / generic sentences",
    "  • unclear passages",
    "Keep structure, length, paragraph order, and key ideas IDENTICAL.",
    "Return the full revised text only — no commentary.",
  ].join("\n"),
  heavy: [
    "REWRITE MODE: HEAVY.",
    "Rewrite:",
    "  • the opening (must hook on line 1)",
    "  • flat sections (vary rhythm: short + long sentences)",
    "  • weak engagement passages (add tension, sensory detail, subtext)",
    "Preserve the core idea and chapter scope, but elevate the prose to bestseller level.",
    "Return the full revised text only — no commentary.",
  ].join("\n"),
  dominate: [
    "REWRITE MODE: DOMINATE (multi-pass internal).",
    "PASS 1 — Rewrite the entire text from scratch keeping only the core ideas.",
    "PASS 2 — Amplify the result: add emotional depth, narrative rhythm,",
    "         memorable quotable sentences, controlled tension.",
    "Output: top-tier editorial level (9.5+/10). Return the FINAL text only.",
  ].join("\n"),
};

export function buildRewritePromptBlock(mode: RewriteMode): string {
  if (mode === "none") return "";
  return REWRITE_INSTRUCTIONS[mode];
}

/* ============ Quality scoring helper ============ */

/**
 * Estimate per-metric quality from text using the editorial-validator.
 * Cheap, deterministic, runs locally — no extra AI call.
 */
export function estimateMetrics(text: string): { qualityScore: number; metrics: QualityMetrics } {
  const report = validateEditorial(text);
  const score = report.score; // 0-10

  // Crude per-metric breakdown derived from validator stats + issue tags.
  const issues = report.issues || [];
  const has = (tag: string) => issues.some((i: any) => (i.type || "").includes(tag));

  const hook_strength = has("weak-opening") ? Math.max(0, score - 3) : Math.min(10, score + 0.5);
  const clarity = has("ai-cliche") ? Math.max(0, score - 1.5) : score;
  const engagement = has("flat-rhythm") ? Math.max(0, score - 2) : score;
  const emotional_impact = has("flat-rhythm") || has("ai-cliche") ? Math.max(0, score - 1.5) : score;
  const commercial_power = Math.max(0, score - (issues.length > 5 ? 2 : 0));

  return {
    qualityScore: score,
    metrics: { hook_strength, clarity, engagement, emotional_impact, commercial_power },
  };
}

/* ============ 8. Pipeline ============ */

export interface AdaptivePipelineDeps {
  /** Caller-provided rewrite executor. Receives the original text + the prompt block + mode. */
  rewrite: (text: string, instructions: string, mode: Exclude<RewriteMode, "none">) => Promise<string>;
}

export interface AdaptivePipelineMetadata {
  contentType: RewriteContentType;
  plan: PlanTier;
  /** Optional pre-computed score; otherwise estimated from text. */
  qualityScore?: number;
  metrics?: QualityMetrics;
}

export interface AdaptivePipelineResult {
  text: string;
  decision: RewriteDecision;
  qualityScore: number;
  metrics: QualityMetrics;
  rewritten: boolean;
}

/**
 * Single entry point. Generate → analyse → decide → maybe rewrite → return.
 * Costs nothing extra when the decision is "none".
 */
export async function adaptiveRewritePipeline(
  text: string,
  metadata: AdaptivePipelineMetadata,
  deps: AdaptivePipelineDeps,
): Promise<AdaptivePipelineResult> {
  const { metrics, qualityScore } = metadata.metrics && typeof metadata.qualityScore === "number"
    ? { metrics: metadata.metrics, qualityScore: metadata.qualityScore }
    : estimateMetrics(text);

  const decision = decideRewriteMode({
    text,
    contentType: metadata.contentType,
    plan: metadata.plan,
    qualityScore,
    metrics,
  });

  console.debug(
    `[Scriptora/AdaptiveRewrite] type=${metadata.contentType} plan=${metadata.plan} ` +
    `score=${qualityScore.toFixed(1)} → ${decision.mode} (${decision.reason})`,
  );

  if (decision.mode === "none") {
    return { text, decision, qualityScore, metrics, rewritten: false };
  }

  const block = buildRewritePromptBlock(decision.mode);
  let revised: string;
  try {
    revised = await deps.rewrite(text, block, decision.mode as Exclude<RewriteMode, "none">);
  } catch (e) {
    console.warn("[Scriptora/AdaptiveRewrite] rewrite failed, returning original:", e);
    return { text, decision, qualityScore, metrics, rewritten: false };
  }

  // Safety: never return a clearly broken / shorter-than-50% rewrite.
  if (!revised || revised.trim().length < text.trim().length * 0.5) {
    console.warn("[Scriptora/AdaptiveRewrite] revised text too short — keeping original");
    return { text, decision, qualityScore, metrics, rewritten: false };
  }

  return { text: revised, decision, qualityScore, metrics, rewritten: true };
}
