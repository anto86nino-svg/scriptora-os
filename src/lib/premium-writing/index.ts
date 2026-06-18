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
import { buildMemoryConsistencyV25Block, isMemoryConsistencyV25Enabled } from "@/lib/memory-consistency-v25";
import { buildLongBookMemory, buildLongBookMemoryPromptBlock } from "@/lib/long-book-memory";
import { buildGreatnessEngineBlock } from "@/lib/greatness-engine";
import { buildStoryConstitutionPromptBlock } from "@/lib/story-constitution-engine";
import type { StoryConstitutionContext } from "@/lib/story-constitution-engine/types";
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
  /** When set, V2.5 / long-book memory blocks are omitted from premium (already in unified source). */
  writerMemorySource?: string;
  /** Story Constitution Engine — invisible governance context */
  storyConstitution?: Omit<StoryConstitutionContext, "config" | "previousChapters" | "chapterIndex">;
}

function compactPromptBlock(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}\n[...canon lock continues — full rules still apply]`;
}

/** Single writer memory block: Intelligence Layer + V2.5 or long-book fallback. */
export function buildWriterMemorySource(
  ctx: PremiumWritingContext & { intelligenceBlock?: string },
): string {
  const family = resolveBookTypeDefinition(
    ctx.config.genre,
    ctx.config.subcategory,
    ctx.config.subgenre,
    ctx.config.bookTypeId,
  ).family;
  const narrativeOnly = family === "narrative" || family === "poetry";
  const parts: string[] = [];

  if (ctx.intelligenceBlock?.trim()) {
    parts.push(ctx.intelligenceBlock.trim());
  }

  if (narrativeOnly) {
    const v25 = isMemoryConsistencyV25Enabled() ? buildMemoryConsistencyV25Block(ctx) : "";
    if (v25.trim()) {
      parts.push(v25.trim());
    } else if (ctx.blueprint) {
      const memory = buildLongBookMemory({
        config: ctx.config,
        blueprint: ctx.blueprint,
        chapters: ctx.previousChapters,
      });
      const longBlock = buildLongBookMemoryPromptBlock(memory, ctx.chapterIndex);
      if (longBlock.trim()) parts.push(longBlock.trim());
    }
  }

  if (!parts.length) return "";
  return `WRITER MEMORY SOURCE (SINGLE CANON — do not contradict):\n\n${parts.join("\n\n")}`;
}

/** Compact canon for continuation chunks — same operative law, fewer tokens. */
export function buildContinuationCanonBlock(input: {
  writerMemorySource?: string;
  characterLock?: string;
  narrativeContinuity?: string;
}): string {
  const parts = [
    input.writerMemorySource?.trim()
      ? compactPromptBlock(input.writerMemorySource, 2800)
      : "",
    input.characterLock?.trim()
      ? compactPromptBlock(input.characterLock, 2200)
      : "",
    input.narrativeContinuity?.trim()
      ? compactPromptBlock(input.narrativeContinuity, 1200)
      : "",
  ].filter(Boolean);

  if (!parts.length) return "";
  return `CONTINUATION MEMORY BLOCK (same canon as chunk 1 — mandatory):\n\n${parts.join("\n\n")}`;
}

export function extractCompactNarrativeContinuity(contextMemory: string): string {
  if (!contextMemory.trim()) return "";
  const lastScene =
    contextMemory.match(/LAST SCENE STATE[\s\S]*?(?=\n\n[A-Z][A-Z ]+:|$)/)?.[0]?.trim() || "";
  const arc = contextMemory.match(/Arc position:[^\n]+/)?.[0]?.trim() || "";
  const themes = contextMemory.match(/Core themes:[^\n]+/)?.[0]?.trim() || "";
  return [arc, themes, lastScene].filter(Boolean).join("\n\n");
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
  const skipInlineMemory = Boolean(ctx.writerMemorySource?.trim());

  const constitutionBlock = buildStoryConstitutionPromptBlock({
    config: ctx.config,
    previousChapters: ctx.previousChapters,
    chapterIndex: ctx.chapterIndex,
    blueprint: ctx.blueprint,
    outlineSummary: ctx.outlineSummary,
    memoryGraph: ctx.storyConstitution?.memoryGraph,
    priorText: ctx.storyConstitution?.priorText,
  });

  const blocks = [
    constitutionBlock,
    ctx.writerMemorySource?.trim() || "",
    buildHumanNarrativeRealismV3Block(ctx),
    narrativeOnly && !skipInlineMemory ? buildMemoryConsistencyV25Block(ctx) : "",
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
