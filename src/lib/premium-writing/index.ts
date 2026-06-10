import type { BookConfig, Chapter } from "@/types/book";
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
import { applyPremiumOutputGuard } from "./output-sanitization-guard";
import { runUltraHumanFinalPass } from "./ultra-human-pipeline";

export interface PremiumWritingContext {
  config: BookConfig;
  previousChapters: Chapter[];
  chapterIndex: number;
  outlineSummary?: string;
}

/** Ultra Human Manuscript Engine V2 — editorial injection block for generation prompts */
export function buildPremiumWritingBlock(ctx: PremiumWritingContext): string {
  const blocks = [
    buildGlobalNovelBrainBlock(ctx.previousChapters, ctx.chapterIndex),
    buildNarrativeConsequenceBlock(ctx.previousChapters, ctx.chapterIndex),
    buildNarrativeBeatAntiRepetitionBlock(ctx),
    buildEditorialSelectionBlock(),
    buildHumanDialogueMasterBlock(ctx.config.language),
    buildShowDontTellBlock(ctx.config.language),
    buildCharacterDepthLockBlock(ctx.config),
    buildRomanceSlowBurnMaxBlock(ctx.config, ctx.chapterIndex),
    buildScenePurposeBlock(),
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
