import type { EditorialPassSupremeResult, StoryConstitutionContext } from "./types";
import { runStoryConstitutionAnalysis, buildStoryConstitutionRetryInstruction } from "./analyze";
import { getSCEPhaseConfig } from "./phases";
import { applySCEAutoInterventions } from "./auto-interventions";

/**
 * Editorial Pass Supreme — pre-save governance pass.
 * Phase 1: measure only (warnings + scores, zero text mutation).
 * Phase 2+: targeted auto-interventions per rollout config.
 */
export function runEditorialPassSupreme(
  text: string,
  ctx: StoryConstitutionContext,
): EditorialPassSupremeResult {
  const phaseConfig = getSCEPhaseConfig(ctx.phase);
  const analysis = runStoryConstitutionAnalysis(text, ctx);
  const { text: intervened, interventionsApplied, optimizationsApplied } = applySCEAutoInterventions(
    text,
    ctx,
    phaseConfig,
    analysis.warnings,
  );

  const textModified = intervened !== text;
  const interventionReport = {
    phase: phaseConfig.phase,
    measureOnly: phaseConfig.measureOnly,
    interventionsApplied,
    optimizationsApplied,
    textModified,
  };

  return {
    text: intervened,
    analysis,
    polished: textModified,
    interventionReport,
  };
}

export { buildStoryConstitutionRetryInstruction };
