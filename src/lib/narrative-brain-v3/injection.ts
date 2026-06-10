import type { BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { buildNarrativeGenerationPlan } from "./narrative-plan";
import { buildAuthorDnaBlock } from "./author-dna";
import { buildCharacterDialogueDirectives } from "./character-psychology-engine";
import { buildHumanContradictionBlock } from "./human-contradiction";
import { analyzeSceneContinuity, buildSceneContinuityBlock } from "./scene-continuity";
import { buildSubtextEngineBlock } from "./subtext-engine";
import { buildRomanceTensionV2Block } from "./romance-tension-v2";
import { buildLongBookMemoryWithPsychology } from "@/lib/narrative-intelligence-v2";
import { buildLongMemoryV3Block } from "./long-memory-v3";
import { isNarrativeBrainV3Enabled } from "./index";

export interface NarrativeInjectionInput {
  config: BookConfig;
  chapterIndex: number;
  outlineSummary: string;
  outlineTitle?: string;
  previousChapters: Chapter[];
  longBookMemory?: LongBookMemorySnapshot | null;
  compact?: boolean;
}

/** Shared injection for rewrite, subchapter, and continuation chunks */
export function buildNarrativeBrainV3InjectionBlock(input: NarrativeInjectionInput): string {
  if (!isNarrativeBrainV3Enabled()) return "";

  const { config, chapterIndex, outlineSummary, outlineTitle = "", previousChapters, longBookMemory, compact } = input;
  const plan = buildNarrativeGenerationPlan(config);
  const continuity = analyzeSceneContinuity(previousChapters, outlineSummary);
  const memory = longBookMemory || buildLongBookMemoryWithPsychology({
    config,
    blueprint: null,
    chapters: previousChapters,
  });

  const blocks = [
    `NARRATIVE BRAIN V3 — ${compact ? "COMPACT" : "FULL"} INJECTION:`,
    `Genre strategy: ${plan.genre} | tension ${plan.tensionLevel} | subtext ${plan.subtextLevel}`,
    buildAuthorDnaBlock(config),
    buildLongMemoryV3Block(memory, chapterIndex),
    memory.characterPsychology?.length ? buildCharacterDialogueDirectives(memory.characterPsychology) : "",
    buildHumanContradictionBlock(),
    buildSceneContinuityBlock(continuity),
    buildSubtextEngineBlock(plan.subtextLevel),
    buildRomanceTensionV2Block(config, chapterIndex),
    compact ? "" : plan.dialogueDirective,
    "Rewrite/subchapter rule: preserve distinct character voices. Never flatten to generic therapist prose.",
  ].filter(Boolean);

  return blocks.join("\n\n");
}
