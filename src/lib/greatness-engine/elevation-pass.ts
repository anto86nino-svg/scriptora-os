import type { BookConfig, Chapter } from "@/types/book";
import type { EditorialIntentSheet } from "@/lib/editorial-orchestrator/types";
import { computeGreatnessScore } from "./greatness-score";
import { applySceneElevations } from "./scene-elevator";
import type { ElevationPassResult, GreatnessScore } from "./types";
import { GREATNESS_ELEVATION_FLOOR } from "./types";

function needsElevation(score: GreatnessScore, intent?: EditorialIntentSheet): boolean {
  if (score.composite < GREATNESS_ELEVATION_FLOOR) return true;
  if (score.dimensions.hookIntensity < (intent?.marketFloor?.hookMin ?? 55)) return true;
  if (score.dimensions.bingeability < (intent?.marketFloor?.bingeMin ?? 48)) return true;
  if (score.dimensions.bingeability < 70 || score.dimensions.narrativeMomentum < 70) return true;
  if (!score.passesElevation) return true;
  return score.dimensions.memorability < 62 || score.dimensions.visualStrength < 58;
}

export function runGreatnessElevationPass(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
  totalChapters?: number;
  intent?: EditorialIntentSheet;
  previousChapters?: Chapter[];
}): ElevationPassResult {
  const beforeAnalysis = computeGreatnessScore({
    content: input.content,
    config: input.config,
    chapterIndex: input.chapterIndex,
  });
  const beforeScore = beforeAnalysis.greatnessScore;

  if (!needsElevation(beforeScore, input.intent)) {
    return {
      content: input.content,
      rewritten: false,
      elevatesApplied: 0,
      beforeScore,
      afterScore: beforeScore,
      analysis: beforeAnalysis,
    };
  }

  const { content: elevated, applied } = applySceneElevations(input.content, beforeAnalysis);
  let afterAnalysis = computeGreatnessScore({
    content: elevated,
    config: input.config,
    chapterIndex: input.chapterIndex,
  });

  let finalContent = elevated;
  let totalApplied = applied;

  if (afterAnalysis.greatnessScore.composite < GREATNESS_ELEVATION_FLOOR) {
    const second = applySceneElevations(elevated, afterAnalysis, true);
    const secondAnalysis = computeGreatnessScore({
      content: second.content,
      config: input.config,
      chapterIndex: input.chapterIndex,
    });
    if (secondAnalysis.greatnessScore.composite >= afterAnalysis.greatnessScore.composite) {
      finalContent = second.content;
      afterAnalysis = secondAnalysis;
      totalApplied += second.applied;
    }
  }

  const improved = afterAnalysis.greatnessScore.composite >= beforeScore.composite;
  if (!improved) {
    return {
      content: input.content,
      rewritten: false,
      elevatesApplied: 0,
      beforeScore,
      afterScore: beforeScore,
      analysis: beforeAnalysis,
    };
  }

  return {
    content: finalContent,
    rewritten: totalApplied > 0,
    elevatesApplied: totalApplied,
    beforeScore,
    afterScore: afterAnalysis.greatnessScore,
    analysis: afterAnalysis,
  };
}

export { computeGreatnessScore, analyzeGreatness } from "./greatness-score";
export { analyzeSceneElevation } from "./scene-elevation";
export { analyzeMemorability } from "./memorability";
export { analyzeCinematicImagery } from "./cinematic-imagery";
export { analyzeBingeability, applyBingeabilityMicroRewrite } from "./bingeability";
export { analyzeHookIntensity, applyHookMicroRewrite } from "./hook-intensity";
export { analyzeEmotionalResonance } from "./emotional-resonance";
