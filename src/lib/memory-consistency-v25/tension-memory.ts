import type { BookConfig, Chapter } from "@/types/book";
import type { TensionMemoryState } from "./types";
import { allChapterCorpus, chapterCorpus } from "./utils";

const ROMANCE_GENRES = /romance|dark-romance|gothic|thriller|suspense|noir/i;
const SLOW_BURN_MARKERS = /\b(slow\s+burn|lenta\s+seduzione|non\s+ancora|not\s+yet|resist|resistenza|pull\s+away|si\s+tira\s+indietro)\b/i;
const FRICTION_MARKERS = /\b(attrito|friction|tensione|tension|guarded|diffidenza|mistrust|sospett)\b/i;
const DISTANCE_MARKERS = /\b(distanza|distance|cold|freddo|avoid|evita|silenzio|silence)\b/i;
const AMBIVALENCE_MARKERS = /\b(ambivalent|vuole\s+ma|wants\s+but|desire.*fear|paura.*desider)\b/i;

export function buildTensionMemory(
  config: BookConfig,
  chapters: Chapter[],
  chapterIndex: number,
): TensionMemoryState {
  const corpus = allChapterCorpus(chapters);
  const genreMode = `${config.genre}${config.subcategory ? ` / ${config.subcategory}` : ""}`;
  const romanceFamily = ROMANCE_GENRES.test(genreMode);

  const frictionSignals = corpus
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => FRICTION_MARKERS.test(sentence))
    .slice(-3)
    .map((sentence) => sentence.slice(0, 120));
  const distanceSignals = corpus
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => DISTANCE_MARKERS.test(sentence))
    .slice(-3)
    .map((sentence) => sentence.slice(0, 120));
  const ambivalenceSignals = corpus
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => AMBIVALENCE_MARKERS.test(sentence))
    .slice(-2)
    .map((sentence) => sentence.slice(0, 120));

  let tensionLevel = romanceFamily ? 42 : 28;
  if (frictionSignals.length) tensionLevel += 16;
  if (distanceSignals.length) tensionLevel += 12;
  if (ambivalenceSignals.length) tensionLevel += 10;

  let lastEscalationChapter: number | undefined;
  chapters.forEach((chapter, index) => {
    const text = chapterCorpus(chapter);
    if (/\b(kiss|bacio|conflict|litig|reveal|rivel|climax|almost)\b/i.test(text)) {
      lastEscalationChapter = index + 1;
    }
  });

  const slowBurnActive = romanceFamily
    && (SLOW_BURN_MARKERS.test(corpus) || chapterIndex < Math.floor(config.numberOfChapters * 0.65));

  return {
    genreMode,
    slowBurnActive,
    tensionLevel: Math.min(100, tensionLevel),
    frictionSignals,
    distanceSignals,
    ambivalenceSignals,
    lastEscalationChapter,
  };
}
