import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { buildRealWorldBenchmarkCorpus } from "@/lib/live-author-validation/corpus/real-world-projects";
import {
  getCompetitorSample,
  type CorpusGenreKey,
} from "@/lib/live-author-validation/fixtures/competitor-corpus";
import type { BestsellerComparisonRow } from "./types";

const GENRE_KEYS: CorpusGenreKey[] = [
  "romance",
  "thriller",
  "fantasy",
  "memoir",
  "selfHelp",
  "business",
  "horticultural",
];

function scoreText(content: string, genre?: string) {
  return evaluateBestsellerChapter({ content, chapterIndex: 2, genre });
}

export function runBestsellerComparisonEngine(): BestsellerComparisonRow[] {
  const corpus = buildRealWorldBenchmarkCorpus();
  const byGenre = new Map<CorpusGenreKey, string>();
  for (const project of corpus) {
    if (!byGenre.has(project.genreKey)) byGenre.set(project.genreKey, project.scriptoraSample);
  }

  return GENRE_KEYS.map(genreKey => {
    const scriptoraText = byGenre.get(genreKey) || corpus[0]?.scriptoraSample || "";
    const genericText = getCompetitorSample(genreKey, "generic-chatgpt");
    const claudeText = getCompetitorSample(genreKey, "claude-style");

    const scriptora = scoreText(scriptoraText);
    const generic = scoreText(genericText);
    const claude = scoreText(claudeText);

    const bestHook = Math.max(scriptora.scores.hookStrength, generic.scores.hookStrength, claude.scores.hookStrength);
    const bestBinge = Math.max(scriptora.scores.bingeability, generic.scores.bingeability, claude.scores.bingeability);

    return {
      genreKey,
      scriptoraHook: scriptora.scores.hookStrength,
      scriptoraBinge: scriptora.scores.bingeability,
      genericHook: generic.scores.hookStrength,
      genericBinge: generic.scores.bingeability,
      claudeHook: claude.scores.hookStrength,
      claudeBinge: claude.scores.bingeability,
      hookGapVsBest: scriptora.scores.hookStrength - bestHook,
      bingeGapVsBest: scriptora.scores.bingeability - bestBinge,
    };
  });
}
