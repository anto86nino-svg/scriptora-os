import type { StoryConstitutionAnalysis, StoryConstitutionContext } from "./types";
import { evaluateStoryConstitutionRules } from "./rules";
import { runNarrativeDirectorV2 } from "./narrative-director-v2";
import { runReaderSimulationEngine } from "./reader-simulation-bridge";
import { getSCEPhaseConfig, SCE_PHASE_2_AUTO_RULES, SCE_PHASE_3_OPTIMIZATION_RULES } from "./phases";

export function runStoryConstitutionAnalysis(
  text: string,
  ctx: StoryConstitutionContext,
): StoryConstitutionAnalysis {
  const phaseConfig = getSCEPhaseConfig(ctx.phase);
  const ruleWarnings = evaluateStoryConstitutionRules(text, ctx);
  const director = runNarrativeDirectorV2(text, ctx.config);
  const reader = runReaderSimulationEngine(text, ctx.chapterIndex);

  const warnings = [
    ...ruleWarnings,
    ...director.warnings,
    ...reader.warnings,
  ];

  const criticalCount = warnings.filter((w) => w.severity === "critical").length;
  const warningCount = warnings.filter((w) => w.severity === "warning").length;
  const constitutionScore = Math.max(
    20,
    Math.min(
      98,
      88 -
        criticalCount * 15 -
        warningCount * 6 +
        reader.readerRetentionScore * 0.08,
    ),
  );

  const retryHints = buildPhaseAwareRetryHints(warnings, ctx);

  const passed = constitutionScore >= 62 && criticalCount === 0 && warningCount <= 3;

  return {
    constitutionScore,
    warnings,
    readerScores: {
      readerMomentumScore: reader.readerMomentumScore,
      readerCuriosityScore: reader.readerCuriosityScore,
      readerEmotionalScore: reader.readerEmotionalScore,
      readerRetentionScore: reader.readerRetentionScore,
    },
    director,
    passed,
    retryHints,
    phase: phaseConfig.phase,
    measureOnly: phaseConfig.measureOnly,
  };
}

function buildPhaseAwareRetryHints(
  warnings: StoryConstitutionAnalysis["warnings"],
  ctx: StoryConstitutionContext,
): string[] {
  const phaseConfig = getSCEPhaseConfig(ctx.phase);
  if (!phaseConfig.enableSurgicalRetry) return [];

  const allowedRules = new Set([
    ...phaseConfig.autoInterventionRules,
    ...phaseConfig.narrativeOptimizationRules,
  ]);

  return warnings
    .filter((w) => w.severity !== "info" && allowedRules.has(w.ruleId))
    .map((w) => w.suggestion || w.message)
    .slice(0, 6);
}

export function buildStoryConstitutionRetryInstruction(
  analysis: StoryConstitutionAnalysis,
): string {
  if (analysis.measureOnly || analysis.passed || !analysis.retryHints.length) return "";
  return [
    "STORY CONSTITUTION corrections (preserve meaning, improve narrative robustness):",
    ...analysis.retryHints.map((h) => `- ${h}`),
  ].join("\n");
}

export { SCE_PHASE_2_AUTO_RULES, SCE_PHASE_3_OPTIMIZATION_RULES };
