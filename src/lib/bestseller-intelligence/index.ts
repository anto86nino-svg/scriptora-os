export type {
  BestsellerChapterSnapshot,
  BestsellerConfidence,
  BestsellerEvaluationInput,
  BestsellerGrade,
  BestsellerScoreBreakdown,
} from "./types";

export { evaluateBestsellerChapter } from "./scorer";
export {
  buildBestsellerIntelligencePromptBlock,
  buildBestsellerOptimizationBlock,
  evaluateChapterBestsellerIntel,
} from "./prompt";

export const BESTSELLER_INTELLIGENCE_V4_KEY = "scriptora-bestseller-intelligence-v4-enabled";

export function isBestsellerIntelligenceEnabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_BESTSELLER_INTEL_V4 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(BESTSELLER_INTELLIGENCE_V4_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function setBestsellerIntelligenceEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(BESTSELLER_INTELLIGENCE_V4_KEY, enabled ? "on" : "off");
    window.dispatchEvent(new Event("scriptora-bestseller-intelligence-change"));
  } catch {
    // non-blocking
  }
}
