import type { PremiumWritingContext } from "@/lib/premium-writing";
import { isExcellencePhaseActive } from "@/lib/generation-excellence-roadmap";
import { buildGreatnessEnginePromptBlock } from "./prompt-block";

export const GREATNESS_ENGINE_KEY = "scriptora-greatness-engine";

export function isGreatnessEngineEnabled(): boolean {
  try {
    if (!isExcellencePhaseActive("greatness")) return false;
    if (import.meta.env.VITE_SCRIPTORA_GREATNESS === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(GREATNESS_ENGINE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return isExcellencePhaseActive("greatness");
  }
}

export function buildGreatnessEngineBlock(ctx: PremiumWritingContext): string {
  if (!isGreatnessEngineEnabled()) return "";
  return buildGreatnessEnginePromptBlock(ctx);
}

export { evaluateGreatnessChapter, buildGreatnessOptimizationBlock } from "./evaluator";
export { buildGreatnessEnginePromptBlock } from "./prompt-block";
export type { GreatnessChapterReport, GreatnessChapterScores, SceneImpactScore, MarketWinnerMode } from "./types";
