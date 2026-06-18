export * from "./types";
export * from "./phases";
export { buildStoryConstitutionPromptBlock } from "./constitution-prompt";
export { runStoryConstitutionAnalysis, buildStoryConstitutionRetryInstruction } from "./analyze";
export { runEditorialPassSupreme } from "./editorial-pass-supreme";
export { runNarrativeDirectorV2, buildNarrativeDirectorV2Block } from "./narrative-director-v2";
export { runReaderSimulationEngine, buildReaderSimulationGovernanceBlock } from "./reader-simulation-bridge";
export { evaluateGenreTruthLock, buildGenreTruthLockBlock } from "./genre-truth-lock";
export { evaluatePayoffEngine, buildPayoffEngineBlock } from "./payoff-engine";
export { evaluateCharacterEvolutionLock, buildCharacterEvolutionLockBlock } from "./character-evolution-lock";
export { evaluateStoryConstitutionRules } from "./rules";
export {
  applySCEAutoInterventions,
  applyAntiRepetitionIntervention,
  applyCanonConsistencyIntervention,
  applyDeadSceneRemoval,
} from "./auto-interventions";

import { buildStoryConstitutionPromptBlock } from "./constitution-prompt";
import { runStoryConstitutionAnalysis } from "./analyze";
import { runEditorialPassSupreme } from "./editorial-pass-supreme";
import { runNarrativeDirectorV2 } from "./narrative-director-v2";
import { runReaderSimulationEngine } from "./reader-simulation-bridge";
import { SCE_CURRENT_PHASE, getSCEPhaseConfig } from "./phases";

export const StoryConstitutionEngine = {
  phase: SCE_CURRENT_PHASE,
  getPhaseConfig: getSCEPhaseConfig,
  buildPromptBlock: buildStoryConstitutionPromptBlock,
  analyze: runStoryConstitutionAnalysis,
  editorialPassSupreme: runEditorialPassSupreme,
  narrativeDirectorV2: runNarrativeDirectorV2,
  readerSimulation: runReaderSimulationEngine,
};
