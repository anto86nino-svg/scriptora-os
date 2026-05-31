import type { BookConfig } from "@/types/book";
import { computeGreatnessScore } from "@/lib/greatness-engine";
import { simulateReaderInLoop } from "@/lib/reader-simulation";
import { analyzeBookTokMoments } from "./booktok-moment-engine";
import { analyzeEmotionalImpact } from "./emotional-impact-search";
import { analyzeQuotePotential } from "./quote-detector";
import type { MasterpieceAnalysisSnapshot, NarrativeMagicDimensions, NarrativeMagicScore } from "./types";
import { MASTERPIECE_ENGINE_VERSION, MASTERPIECE_MAGIC_FLOOR } from "./types";
import { clamp100, openingWords } from "./utils";
import type { MultiDraftReport } from "./types";
import type { SceneCompetitionReport } from "./types";
import type { MasterpieceReviewReport } from "./types";

export function computeNarrativeMagicScore(input: {
  content: string;
  config?: BookConfig;
  chapterIndex?: number;
  totalChapters?: number;
  multiDraft?: MultiDraftReport;
  sceneCompetition?: SceneCompetitionReport;
  reviewer?: MasterpieceReviewReport;
}): NarrativeMagicScore {
  const content = String(input.content || "").trim();
  const emotional = analyzeEmotionalImpact(content);
  const bookTok = analyzeBookTokMoments(content);
  const quotes = analyzeQuotePotential(content);
  const greatness = computeGreatnessScore({
    content,
    config: input.config,
    chapterIndex: input.chapterIndex,
  }).greatnessScore;
  const reader = simulateReaderInLoop({
    content,
    chapterIndex: input.chapterIndex ?? 0,
    config: input.config,
    totalChapters: input.totalChapters ?? 10,
  });

  const draftBonus = input.multiDraft?.selected !== "A" ? Math.min(10, 4 + (input.multiDraft?.margin ?? 0)) : 0;
  const sceneBonus = input.sceneCompetition?.averageImpactGain ?? 0;
  const reviewBonus = input.reviewer ? clamp100(input.reviewer.idealGapScore * 0.1) : 0;
  const quoteBonus = quotes.topQuote ? 8 : 0;
  const bookTokBonus = bookTok.authenticCount >= 1 ? 6 : 0;

  const wonder = clamp100(
    greatness.dimensions.visualStrength * 0.35 +
      (/\?/.test(openingWords(content, 100)) ? 14 : 0) +
      emotional.tones.shock * 0.2 +
      draftBonus,
  );

  const dimensions: NarrativeMagicDimensions = {
    wonder,
    memorability: clamp100(greatness.dimensions.memorability * 0.7 + (quotes.topQuote ? 22 : 0) + sceneBonus * 0.2),
    emotionalPersistence: emotional.persistenceScore,
    readerObsession: clamp100(reader.retention * 0.45 + reader.curiosity * 0.35 + greatness.dimensions.bingeability * 0.2),
    quotePotential: clamp100(
      quotes.averageHighlightProbability * 0.45 +
        (quotes.topQuote?.underlineProbability ?? 0) * 0.35 +
        bookTok.authenticCount * 8,
    ),
    narrativeMagic: 0,
  };

  dimensions.narrativeMagic = clamp100(
    dimensions.wonder * 0.16 +
      dimensions.memorability * 0.18 +
      dimensions.emotionalPersistence * 0.18 +
      dimensions.readerObsession * 0.18 +
      dimensions.quotePotential * 0.16 +
      greatness.composite * 0.14 +
      draftBonus +
      reviewBonus,
  );

  const composite = clamp100(
    dimensions.narrativeMagic +
      Math.min(8, bookTok.authenticCount * 2) +
      draftBonus +
      quoteBonus +
      bookTokBonus,
  );

  const warnings: string[] = [];
  if (bookTok.forcedRisk > 0) warnings.push("Forced viral phrasing detected — authenticity at risk");
  if (!quotes.topQuote) warnings.push("No high-probability quote for reader highlight");
  if (emotional.persistenceScore < 55) warnings.push("Emotional persistence may fade after reading");

  return {
    version: MASTERPIECE_ENGINE_VERSION,
    composite,
    dimensions: { ...dimensions, narrativeMagic: composite },
    passesMasterpiece: composite >= MASTERPIECE_MAGIC_FLOOR,
    warnings: warnings.slice(0, 5),
  };
}

export function buildMasterpieceAnalysis(input: {
  content: string;
  config: BookConfig;
  chapterIndex: number;
  totalChapters: number;
  multiDraft: MultiDraftReport;
  sceneCompetition: SceneCompetitionReport;
  reviewer: MasterpieceReviewReport;
}): MasterpieceAnalysisSnapshot {
  const emotionalImpact = analyzeEmotionalImpact(input.content);
  const bookTok = analyzeBookTokMoments(input.content);
  const quoteDetector = analyzeQuotePotential(input.content);
  const narrativeMagic = computeNarrativeMagicScore({
    content: input.content,
    config: input.config,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    multiDraft: input.multiDraft,
    sceneCompetition: input.sceneCompetition,
    reviewer: input.reviewer,
  });

  return {
    version: MASTERPIECE_ENGINE_VERSION,
    evaluatedAt: new Date().toISOString(),
    multiDraft: input.multiDraft,
    sceneCompetition: input.sceneCompetition,
    emotionalImpact,
    bookTok,
    quoteDetector,
    reviewer: input.reviewer,
    narrativeMagic,
  };
}
