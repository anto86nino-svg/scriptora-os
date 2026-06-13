import type { PremiumWritingContext } from "@/lib/premium-writing";
import {
  getGreatnessMode,
  isGreatnessDiagnosticsEnabled,
  isGreatnessPromptActive,
} from "@/lib/narrative-baseline-lock/greatness-mode";
import { buildGreatnessEnginePromptBlock } from "./prompt-block";

export type GreatnessMode = import("@/lib/narrative-baseline-lock/greatness-mode").GreatnessMode;

export {
  getGreatnessMode,
  isGreatnessDiagnosticsEnabled,
  isGreatnessPromptActive,
  setGreatnessMode,
  GREATNESS_MODE_KEY,
} from "@/lib/narrative-baseline-lock/greatness-mode";

/** @deprecated Use isGreatnessDiagnosticsEnabled() */
export function isGreatnessEngineEnabled(): boolean {
  return isGreatnessDiagnosticsEnabled();
}

export function buildGreatnessEngineBlock(ctx: PremiumWritingContext): string {
  if (!isGreatnessPromptActive()) return "";
  return buildGreatnessEnginePromptBlock(ctx);
}

export { evaluateGreatnessChapter, buildGreatnessOptimizationBlock } from "./evaluator";
export { buildGreatnessEnginePromptBlock } from "./prompt-block";
export type { GreatnessChapterReport, GreatnessChapterScores, SceneImpactScore, MarketWinnerMode } from "./types";
