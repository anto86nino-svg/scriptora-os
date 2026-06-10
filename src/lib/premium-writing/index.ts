import type { BookConfig, Chapter } from "@/types/book";
import { buildSceneContinuityBlock } from "./scene-continuity-v2";
import { buildHumanDialogueBlock } from "./human-dialogue-v3";
import { buildRomanceSlowBurnBlock } from "./romance-slow-burn";
import { buildCharacterMemoryDeepLock } from "./character-memory-lock";
import { applyPremiumOutputGuard } from "./output-sanitization-guard";

export interface PremiumWritingContext {
  config: BookConfig;
  previousChapters: Chapter[];
  chapterIndex: number;
  outlineSummary?: string;
}

export function buildPremiumWritingBlock(ctx: PremiumWritingContext): string {
  const blocks = [
    buildSceneContinuityBlock(ctx),
    buildHumanDialogueBlock(ctx.config.language),
    buildRomanceSlowBurnBlock(ctx.config, ctx.chapterIndex),
    buildCharacterMemoryDeepLock(ctx.config),
  ].filter(Boolean);

  return blocks.join("\n\n");
}

export { applyPremiumOutputGuard };
