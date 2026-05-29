import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";

export interface MarketPremiumScores {
  hookStrength: number;
  bookTokPotential: number | null;
  bingeability: number;
  readerRetentionRisk: "low" | "medium" | "high";
  emotionalMomentum: number;
  genreAlignment: number;
  genreAlignmentNote: string;
  composite: number;
}

const BOOKTOK_GENRES = /romance|dark-romance|thriller|fantasy|memoir|fiction/i;

function openingText(content: string, words = 180): string {
  return content.split(/\s+/).slice(0, words).join(" ");
}

function genreExpectationNote(genre: string, best: ReturnType<typeof evaluateBestsellerChapter>, editorial: ReturnType<typeof analyzeNovel>): string {
  const g = genre.toLowerCase();
  if (/romance|dark-romance/.test(g) && best.scores.bingeability < 62) {
    return "Slow burn romance lacks enough unresolved emotional friction for the genre.";
  }
  if (/thriller|crime|mystery/.test(g) && best.scores.hookStrength < 65) {
    return "Thriller opening needs sharper mystery or threat in the first page.";
  }
  if (/self-help|business/.test(g) && editorial.warnings.some(w => w.type === "generic_advice")) {
    return "Nonfiction reads generic — strengthen specific, actionable authority.";
  }
  if (/garden|horticult|practical|manual/.test(g) && /believe|journey|manifest/i.test(g)) {
    return "Practical guide drifts into motivational tone — tighten instructional focus.";
  }
  if (best.scores.readerRetention < 58) {
    return "Middle sections may lose readers before payoff.";
  }
  return "Genre expectations are broadly met with room for sharper commercial hooks.";
}

export function computeMarketPremiumScores(input: {
  content: string;
  genre?: string;
  language?: string;
}): MarketPremiumScores {
  const content = String(input.content || "").trim();
  const genre = input.genre || "fiction";
  const opening = openingText(content);
  const editorial = analyzeNovel(content);
  const openingEditorial = analyzeNovel(opening);
  const best = evaluateBestsellerChapter({ content, chapterIndex: 0, genre });
  const openingBest = evaluateBestsellerChapter({ content: opening, chapterIndex: 0, genre });
  const reader = simulateReaderEmotion({ content, chapterIndex: 0, config: { genre, language: input.language || "English" } as any });

  const hookStrength = Math.round((openingBest.scores.hookStrength * 0.6 + openingEditorial.subtextScore * 0.4));
  const bookTokPotential = BOOKTOK_GENRES.test(genre)
    ? Math.round(best.scores.bookTokIntensity)
    : null;
  const bingeability = Math.round(best.scores.bingeability);
  const emotionalMomentum = Math.round((reader.curiosity + reader.emotionalTension + reader.compulsiveReadability) / 3);

  let readerRetentionRisk: "low" | "medium" | "high" = "low";
  if (best.scores.readerRetention < 52 || reader.compulsiveReadability < 45) readerRetentionRisk = "high";
  else if (best.scores.readerRetention < 68) readerRetentionRisk = "medium";

  const genreAlignment = Math.round(
    Math.max(40, Math.min(92, best.scores.overall * 0.55 + editorial.pacingConsistencyScore * 0.25 + (100 - editorial.warnings.length * 8) * 0.2)),
  );

  const composite = Math.round(
    hookStrength * 0.22 +
      bingeability * 0.2 +
      emotionalMomentum * 0.18 +
      genreAlignment * 0.2 +
      (readerRetentionRisk === "low" ? 80 : readerRetentionRisk === "medium" ? 58 : 38) * 0.2,
  );

  return {
    hookStrength,
    bookTokPotential,
    bingeability,
    readerRetentionRisk,
    emotionalMomentum,
    genreAlignment,
    genreAlignmentNote: genreExpectationNote(genre, best, editorial),
    composite,
  };
}
