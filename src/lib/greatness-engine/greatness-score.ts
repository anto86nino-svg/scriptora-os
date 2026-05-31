import type { BookConfig } from "@/types/book";
import { analyzeBingeability } from "./bingeability";
import { analyzeCinematicImagery } from "./cinematic-imagery";
import { analyzeEmotionalResonance } from "./emotional-resonance";
import { analyzeHookIntensity } from "./hook-intensity";
import { analyzeMemorability } from "./memorability";
import { analyzeSceneElevation } from "./scene-elevation";
import type { GreatnessAnalysisSnapshot, GreatnessDimensions, GreatnessScore } from "./types";
import { GREATNESS_ENGINE_VERSION, GREATNESS_ELEVATION_FLOOR } from "./types";
import { clamp100, countElevationSignatures, levelFromComposite, openingWords, endingChars } from "./utils";

export function computeGreatnessScore(input: {
  content: string;
  config?: BookConfig;
  chapterIndex?: number;
}): GreatnessAnalysisSnapshot {
  const content = String(input.content || "").trim();
  const focusText = `${openingWords(content, 130)}\n\n${endingChars(content, 350)}`;

  const sceneElevation = analyzeSceneElevation(content);
  const focusElevation = analyzeSceneElevation(focusText);
  const memorability = analyzeMemorability(content);
  const focusMemorability = analyzeMemorability(focusText);
  const cinematicImagery = analyzeCinematicImagery(content);
  const focusCinematic = analyzeCinematicImagery(focusText);
  const bingeability = analyzeBingeability(content, {
    config: input.config,
    chapterIndex: input.chapterIndex,
  });
  const hookIntensity = analyzeHookIntensity(content);
  const emotionalResonance = analyzeEmotionalResonance(content);

  const signatures = countElevationSignatures(content);
  const signatureBonus = Math.min(28, signatures * 6);

  const readerRecall = clamp100(Math.max(memorability.readerRecallScore, focusMemorability.readerRecallScore));
  const scenePower = clamp100(Math.max(sceneElevation.averageScenePower, focusElevation.averageScenePower));
  const visualStrength = clamp100(
    Math.max(cinematicImagery.visualClarity, focusCinematic.visualClarity) * 0.45 +
      Math.max(cinematicImagery.sensoryPresence, focusCinematic.sensoryPresence) * 0.35 +
      Math.max(cinematicImagery.sceneAnchoring, focusCinematic.sceneAnchoring) * 0.2,
  );

  const dimensions: GreatnessDimensions = {
    memorability: clamp100(readerRecall * 0.55 + (Math.max(memorability.quotableLines.length, focusMemorability.quotableLines.length) >= 1 ? 36 : 0) + signatureBonus),
    scenePower,
    readerRecall,
    visualStrength,
    emotionalResonance: emotionalResonance.persistenceScore,
    bingeability: clamp100(bingeability.narrativePull * 0.5 + bingeability.compulsiveReadability * 0.5),
    hookIntensity: clamp100(hookIntensity.openingHook * 0.4 + hookIntensity.midpointHook * 0.25 + hookIntensity.closingHook * 0.35 + signatureBonus * 0.5),
    narrativeMomentum: clamp100(
      bingeability.curiosityMomentum * 0.35 +
        bingeability.pageTurnPressure * 0.35 +
        hookIntensity.closingHook * 0.3 +
        signatureBonus,
    ),
  };

  const composite = clamp100(
    dimensions.memorability * 0.14 +
      dimensions.scenePower * 0.12 +
      dimensions.readerRecall * 0.12 +
      dimensions.visualStrength * 0.12 +
      dimensions.emotionalResonance * 0.12 +
      dimensions.bingeability * 0.12 +
      dimensions.hookIntensity * 0.13 +
      dimensions.narrativeMomentum * 0.13 +
      Math.min(6, signatures * 2),
  );

  const warnings = [
    ...memorability.warnings,
    ...bingeability.warnings,
    ...emotionalResonance.warnings,
    ...(sceneElevation.weakScenes > 0 ? [`${sceneElevation.weakScenes} scene(s) unlikely to be remembered tomorrow`] : []),
    ...(!hookIntensity.passesGate ? ["Hook intensity below memorable threshold"] : []),
  ].slice(0, 8);

  const greatnessScore: GreatnessScore = {
    version: GREATNESS_ENGINE_VERSION,
    composite,
    level: levelFromComposite(composite),
    dimensions,
    passesElevation: composite >= GREATNESS_ELEVATION_FLOOR,
    warnings,
  };

  return {
    version: GREATNESS_ENGINE_VERSION,
    evaluatedAt: new Date().toISOString(),
    sceneElevation,
    memorability,
    cinematicImagery,
    bingeability,
    hookIntensity,
    emotionalResonance,
    greatnessScore,
  };
}

export function analyzeGreatness(input: {
  content: string;
  config?: BookConfig;
  chapterIndex?: number;
}): GreatnessScore {
  return computeGreatnessScore(input).greatnessScore;
}
