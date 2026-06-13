import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { buildCharacterMemoryDeepLock } from "./character-memory-lock";
import { buildSceneContinuityBlock } from "./scene-continuity-v2";
import { buildNarrativeBeatAntiRepetitionBlock } from "./narrative-beat-engine";
import { buildHumanDialogueMasterBlock } from "./human-dialogue-master";
import { buildShowDontTellBlock } from "./show-dont-tell";
import { buildCharacterDepthLockBlock } from "./character-depth-lock";
import { buildRomanceSlowBurnMaxBlock } from "./romance-slow-burn-max";
import { buildScenePurposeBlock } from "./scene-purpose-validator";
import { buildAiDetectionReductionBlock } from "./ai-detection-reduction";
import { buildAuthorVoicePreserveBlock } from "./author-voice-preserve";
import { buildNarrativeConsequenceBlock } from "./narrative-consequence-engine";
import { buildEditorialSelectionBlock } from "./editorial-selection-engine";
import { buildGlobalNovelBrainBlock } from "./global-novel-brain";
import { buildReaderSimulationBlock } from "./reader-simulation-engine";
import { buildHumanNarrativeRealismV3Block } from "@/lib/human-narrative-realism-v3";
import { buildMemoryConsistencyV25Block } from "@/lib/memory-consistency-v25";
import { buildGreatnessEngineBlock } from "@/lib/greatness-engine";
import {
  buildCrossGenreProtectionBlock,
  buildOverOptimizationGuardBlock,
} from "@/lib/narrative-baseline-lock";
import { applyPremiumOutputGuard } from "./output-sanitization-guard";
import { runUltraHumanFinalPass } from "./ultra-human-pipeline";

export interface PremiumWritingContext {
  config: BookConfig;
  previousChapters: Chapter[];
  chapterIndex: number;
  outlineSummary?: string;
  blueprint?: BookBlueprint | null;
  longBookMemory?: LongBookMemorySnapshot;
}

/** Ultra Human Manuscript Engine V2 — editorial injection block for generation prompts */
export function buildPremiumWritingBlock(ctx: PremiumWritingContext): string {
  const family = resolveBookTypeDefinition(
    ctx.config.genre,
    ctx.config.subcategory,
    ctx.config.subgenre,
    ctx.config.bookTypeId,
  ).family;
  const narrativeOnly = family === "narrative" || family === "poetry";
  const instructionalFamily = family === "nonfiction" || family === "educational" || family === "manual";

  const blocks = [
    buildHumanNarrativeRealismV3Block(ctx),
    narrativeOnly ? buildMemoryConsistencyV25Block(ctx) : "",
    (narrativeOnly || instructionalFamily) ? buildCrossGenreProtectionBlock(ctx.config) : "",
    buildOverOptimizationGuardBlock(),
    buildGreatnessEngineBlock(ctx),
    narrativeOnly ? buildGlobalNovelBrainBlock(ctx.previousChapters, ctx.chapterIndex) : "",
    narrativeOnly ? buildNarrativeConsequenceBlock(ctx.previousChapters, ctx.chapterIndex) : "",
    narrativeOnly ? buildNarrativeBeatAntiRepetitionBlock(ctx) : "",
    buildEditorialSelectionBlock(),
    narrativeOnly ? buildHumanDialogueMasterBlock(ctx.config.language) : "",
    narrativeOnly ? buildShowDontTellBlock(ctx.config.language) : "",
    buildCharacterDepthLockBlock(ctx.config),
    narrativeOnly ? buildCharacterMemoryDeepLock(ctx.config) : "",
    narrativeOnly ? buildSceneContinuityBlock(ctx) : "",
    narrativeOnly ? buildRomanceSlowBurnMaxBlock(ctx.config, ctx.chapterIndex) : "",
    narrativeOnly ? buildScenePurposeBlock() : "",
    buildReaderSimulationBlock(ctx.chapterIndex),
    buildAiDetectionReductionBlock(),
    buildAuthorVoicePreserveBlock(ctx.config),
  ].filter(Boolean);

  return blocks.join("\n\n");
}

export { applyPremiumOutputGuard };
export { runUltraHumanFinalPass };
export {
  evaluateManuscriptQuality,
  buildManuscriptQualityRetryInstruction,
  type ManuscriptQualityScores,
} from "./manuscript-quality-gate";

/** @deprecated Use evaluateManuscriptQuality */
export { scoreGeneratedOutput, buildQualityRetryInstruction } from "./quality-gate";
