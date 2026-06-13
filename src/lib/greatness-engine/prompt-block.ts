import type { Chapter } from "@/types/book";
import type { PremiumWritingContext } from "@/lib/premium-writing";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { buildHookPowerPromptBlock } from "./hook-power";
import { buildChapterEndingPromptBlock } from "./chapter-ending";
import { buildMemorabilityPromptBlock } from "./memorability";
import { buildReaderAddictionPromptBlock } from "./reader-addiction";
import { buildEmotionalAftertastePromptBlock } from "./emotional-aftertaste";
import { buildSceneImpactPromptBlock } from "./scene-impact";
import { buildMarketWinnerPromptBlock, resolveMarketWinnerMode } from "./market-winner";
import { buildGreatnessOptimizationBlock, evaluateGreatnessChapter } from "./evaluator";

function lastChapterContent(chapters: Chapter[]): string {
  const last = chapters[chapters.length - 1];
  if (!last) return "";
  const subs = (last.subchapters || []).map((sub) => sub.content).join("\n");
  return `${last.content}\n${subs}`.trim();
}

export function buildGreatnessEnginePromptBlock(ctx: PremiumWritingContext): string {
  const family = resolveBookTypeDefinition(
    ctx.config.genre,
    ctx.config.subcategory,
    ctx.config.subgenre,
    ctx.config.bookTypeId,
  ).family;
  const fiction = family === "narrative" || family === "poetry";
  const mode = resolveMarketWinnerMode(ctx.config.genre, family);
  const position = ctx.chapterIndex + 1;
  const total = ctx.config.numberOfChapters || 12;
  const arcPhase =
    position / total <= 0.25 ? "OPENING — hook massimo, promessa genere, curiosity debt"
      : position / total <= 0.5 ? "RISING — ritarda payoff, aumenta tensione"
        : position / total <= 0.75 ? "ESCALATION — accelerazione conseguenze"
          : "APPROACH — momentum senza appiattire";

  const previousContent = lastChapterContent(ctx.previousChapters);
  const previousReport = previousContent.length > 120
    ? evaluateGreatnessChapter({
        content: previousContent,
        chapterIndex: Math.max(0, ctx.chapterIndex - 1),
        genre: ctx.config.genre,
        subcategory: ctx.config.subcategory,
        subgenre: ctx.config.subgenre,
        bookTypeId: ctx.config.bookTypeId,
      })
    : null;

  const optimization = previousReport ? buildGreatnessOptimizationBlock(previousReport) : "";

  return [
    "SCRIPTORA GREATNESS ENGINE — Hook Power + Memorability + Reader Addiction + Emotional Resonance",
    `Chapter ${position}/${total} — ${arcPhase}`,
    buildHookPowerPromptBlock(fiction),
    buildChapterEndingPromptBlock(),
    buildMemorabilityPromptBlock(),
    buildReaderAddictionPromptBlock(previousReport?.scores.compulsiveReadability ?? 65),
    buildEmotionalAftertastePromptBlock(),
    buildSceneImpactPromptBlock(),
    buildMarketWinnerPromptBlock(mode),
    optimization,
    "HARD RULES:",
    "- Non sacrificare canon/memoria per shock — greatness deve sembrare guadagnata.",
    "- Ogni capitolo deve essere difficile da posare: page-turn + residue emotivo.",
  ].filter(Boolean).join("\n\n");
}
