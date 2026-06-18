import type { StoryConstitutionRuleId } from "./types";

/** Active rollout phase — default 1 (measure only). Advance only after impact review. */
export const SCE_CURRENT_PHASE = 1 as const;

export type StoryConstitutionPhase = 1 | 2 | 3;

export const SCE_PHASE_2_AUTO_RULES: StoryConstitutionRuleId[] = [
  "anti_repetition",
  "canon_supremacy",
  "remove_dead_scenes",
];

export const SCE_PHASE_3_OPTIMIZATION_RULES: StoryConstitutionRuleId[] = [
  "reader_attention",
  "page_turn_check",
  "payoff_engine",
  "story_momentum",
  "ending_destination_lock",
];

export type SCEPhaseConfig = {
  phase: StoryConstitutionPhase;
  measureOnly: boolean;
  autoInterventionRules: StoryConstitutionRuleId[];
  narrativeOptimizationRules: StoryConstitutionRuleId[];
  enablePromptGovernance: boolean;
  enableSurgicalRetry: boolean;
};

export function resolveSCEPhase(override?: StoryConstitutionPhase): StoryConstitutionPhase {
  return override ?? SCE_CURRENT_PHASE;
}

export function getSCEPhaseConfig(phase?: StoryConstitutionPhase): SCEPhaseConfig {
  const p = resolveSCEPhase(phase);
  switch (p) {
    case 1:
      return {
        phase: 1,
        measureOnly: true,
        autoInterventionRules: [],
        narrativeOptimizationRules: [],
        enablePromptGovernance: false,
        enableSurgicalRetry: false,
      };
    case 2:
      return {
        phase: 2,
        measureOnly: false,
        autoInterventionRules: [...SCE_PHASE_2_AUTO_RULES],
        narrativeOptimizationRules: [],
        enablePromptGovernance: true,
        enableSurgicalRetry: true,
      };
    case 3:
      return {
        phase: 3,
        measureOnly: false,
        autoInterventionRules: [...SCE_PHASE_2_AUTO_RULES],
        narrativeOptimizationRules: [...SCE_PHASE_3_OPTIMIZATION_RULES],
        enablePromptGovernance: true,
        enableSurgicalRetry: true,
      };
  }
}

export function isRuleAutoInterventionEnabled(
  ruleId: StoryConstitutionRuleId,
  phase?: StoryConstitutionPhase,
): boolean {
  return getSCEPhaseConfig(phase).autoInterventionRules.includes(ruleId);
}

export function isRuleNarrativeOptimizationEnabled(
  ruleId: StoryConstitutionRuleId,
  phase?: StoryConstitutionPhase,
): boolean {
  return getSCEPhaseConfig(phase).narrativeOptimizationRules.includes(ruleId);
}

export function filterWarningsForPhaseInterventions(
  ruleIds: StoryConstitutionRuleId[],
  phase?: StoryConstitutionPhase,
): StoryConstitutionRuleId[] {
  const cfg = getSCEPhaseConfig(phase);
  const allowed = new Set([
    ...cfg.autoInterventionRules,
    ...cfg.narrativeOptimizationRules,
  ]);
  return ruleIds.filter((id) => allowed.has(id));
}
