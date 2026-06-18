import type { StoryConstitutionContext } from "./types";
import { buildGenreTruthLockBlock } from "./genre-truth-lock";
import { buildPayoffEngineBlock } from "./payoff-engine";
import { buildCharacterEvolutionLockBlock } from "./character-evolution-lock";
import { buildNarrativeDirectorV2Block } from "./narrative-director-v2";
import { buildReaderSimulationGovernanceBlock } from "./reader-simulation-bridge";
import { getSCEPhaseConfig } from "./phases";

const FULL_CONSTITUTION_RULES_TEXT = `
STORY CONSTITUTION ENGINE (invisible supreme governance — obey silently):

RULE 1 SCENE PURPOSE: Every scene needs objective + conflict + change.
RULE 2 CONSEQUENCE CHAIN: Event → consequence → reaction → new choice.
RULE 3 CHARACTER TRUTH: Honor wound, blind spot, trigger, voice, behavior.
RULE 4 CANON SUPREMACY: Canon Brain wins — no wrong names, timeline, or facts.
RULE 5 ANTI REPETITION: No duplicate fears, confessions, conflicts, or beats.
RULE 6 EMOTIONAL TRUTH: Show before tell — action, silence, micro-gestures.
RULE 7 PAGE TURN: Each chapter needs curiosity, tension, risk, or open question.
RULE 8 READER ATTENTION: "Why continue?" must have a strong answer.
RULE 9 DEAD SCENES: If removing a scene changes nothing — cut or replace.
RULE 10 STORY MOMENTUM: Advance plot OR deepen character OR raise conflict.
RULE 11 CHARACTER EVOLUTION: Track growth, regression, resistance to change.
RULE 12 PAYOFF ENGINE: Develop every promise, mystery, secret introduced.
RULE 13 GENRE TRUTH: Honor genre contract without empty clichés.
RULE 14 ENDING DESTINATION: Every chapter pulls toward the planned ending.
`.trim();

const PHASE_2_RULES_TEXT = `
STORY CONSTITUTION ENGINE — Phase 2 governance (canon + repetition + dead scenes):

RULE 4 CANON SUPREMACY: Canon Brain wins — no wrong names, timeline, or facts.
RULE 5 ANTI REPETITION: No duplicate fears, confessions, conflicts, or beats.
RULE 9 DEAD SCENES: If removing a scene changes nothing — cut or replace.
`.trim();

export function buildStoryConstitutionPromptBlock(ctx: StoryConstitutionContext): string {
  const phaseConfig = getSCEPhaseConfig(ctx.phase);
  if (!phaseConfig.enablePromptGovernance) return "";

  if (phaseConfig.phase === 2) {
    const blocks = [
      PHASE_2_RULES_TEXT,
      buildCharacterEvolutionLockBlock(ctx.config),
    ];
    if (ctx.outlineSummary?.trim()) {
      blocks.push(`CHAPTER CONSTITUTION TARGET: ${ctx.outlineSummary.trim()}`);
    }
    return blocks.filter(Boolean).join("\n\n");
  }

  const blocks = [
    FULL_CONSTITUTION_RULES_TEXT,
    buildGenreTruthLockBlock(ctx.config),
    buildCharacterEvolutionLockBlock(ctx.config),
    buildPayoffEngineBlock(ctx.memoryGraph),
    buildNarrativeDirectorV2Block(ctx.config),
    buildReaderSimulationGovernanceBlock(ctx.chapterIndex),
  ];

  const arch = ctx.config.forgeStoryArchitecture?.trim();
  const ending =
    arch?.match(/Finale[^:\n]*[:\—–-]\s*[^\n]+/i)?.[0] ||
    arch?.match(/ending[^:\n]*[:\—–-]\s*[^\n]+/i)?.[0];
  if (ending) blocks.push(`ENDING DESTINATION LOCK: ${ending}`);

  if (ctx.outlineSummary?.trim()) {
    blocks.push(`CHAPTER CONSTITUTION TARGET: ${ctx.outlineSummary.trim()}`);
  }

  return blocks.filter(Boolean).join("\n\n");
}
