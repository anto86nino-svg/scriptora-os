import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { detectBookIntelligence } from "@/lib/book-intelligence";
import {
  calibrateChapterQualityScore,
  countCalibrationPenaltySignals,
  tierFromCalibratedScore,
} from "@/lib/intelligence-stabilization/score-calibration";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import type { BookConfig } from "@/types/book";
import type { CorpusGenreKey } from "./fixtures/competitor-corpus";

export type RubricDimension =
  | "humanFeel"
  | "emotionalRealism"
  | "continuity"
  | "characterConsistency"
  | "readerEngagement"
  | "bingeability"
  | "commercialStrength"
  | "genreAccuracy"
  | "voicePreservation";

export interface RubricScores {
  humanFeel: number;
  emotionalRealism: number;
  continuity: number;
  characterConsistency: number;
  readerEngagement: number;
  bingeability: number;
  commercialStrength: number;
  genreAccuracy: number;
  voicePreservation: number;
  composite: number;
  tier: string;
}

export interface RubricInput {
  content: string;
  config?: Partial<BookConfig>;
  genreKey: CorpusGenreKey;
  chapterIndex?: number;
  /** 0–1 proxy for long-book continuity when testing memory */
  continuityProxy?: number;
  /** 0–1 voice stability proxy for author identity tests */
  voiceProxy?: number;
}

function toTen(score100: number): number {
  return Number((score100 / 10).toFixed(2));
}

export function scoreEditorialRubric(input: RubricInput): RubricScores {
  const text = String(input.content || "").trim();
  const corpus = text.length > 400 ? text : text.repeat(6);
  const editorial = analyzeNovel(corpus);
  const bestseller = evaluateBestsellerChapter({
    content: corpus,
    chapterIndex: input.chapterIndex ?? 2,
    genre: input.config?.genre,
    bookIntelligence: input.config?.bookIntelligence as any,
  });
  const reader = simulateReaderEmotion({
    content: corpus,
    chapterIndex: input.chapterIndex ?? 2,
    config: input.config as BookConfig,
    totalChapters: input.config?.numberOfChapters,
  });
  const scene = analyzeChapterScenePurpose({
    content: corpus,
    chapterIndex: input.chapterIndex ?? 0,
    config: input.config as BookConfig,
  });

  const penalties = countCalibrationPenaltySignals(corpus);
  const calibrated = calibrateChapterQualityScore({
    dialogueHumanity: editorial.dialogueHumanityScore,
    subtext: editorial.subtextScore,
    characterDepth: editorial.characterConsistencyScore,
    pacing: editorial.pacingConsistencyScore,
    emotionalRealism: editorial.emotionalRedundancyScore,
    bestsellerOverall: bestseller.scores.overall,
    warningCount: editorial.warnings.length,
    riskCount: bestseller.risks.length,
    penaltySignals: penalties,
  });

  const humanFeel = Number(
    Math.max(0, Math.min(10, toTen(editorial.dialogueHumanityScore) - penalties * 0.35)).toFixed(2),
  );
  const emotionalRealism = Number(
    Math.max(0, Math.min(10, toTen(editorial.emotionalRedundancyScore) - penalties * 0.25)).toFixed(2),
  );
  const continuity = Number(((input.continuityProxy ?? 0.75) * 10).toFixed(2));
  const characterConsistency = Number(Math.min(10, toTen(editorial.characterConsistencyScore)).toFixed(2));
  const readerEngagement = Number(((reader.curiosity * 0.45 + reader.compulsiveReadability * 0.55) / 10).toFixed(2));
  const bingeability = Number((bestseller.scores.bingeability / 10).toFixed(2));
  const commercialStrength = calibrated.calibrated;

  let genreAccuracy = 6.5;
  if (input.config?.title || input.config?.genre) {
    const detection = detectBookIntelligence({
      title: input.config.title || "",
      genre: input.config.genre || "",
      idea: corpus.slice(0, 200),
    });
    const expectedBrain = input.config.bookIntelligence?.layers?.writingBrainId;
    if (expectedBrain && detection.layers.writingBrainId === expectedBrain) genreAccuracy = 9.2;
    else if (input.genreKey === "horticultural" && detection.resolvedGenre !== "self-help") genreAccuracy = 9.0;
    else if (detection.confidence >= 0.6) genreAccuracy = 7.8;
    else genreAccuracy = 6.0;
  }
  if (input.genreKey === "horticultural" && /inner growth|believe in yourself|journey of cultivation/i.test(corpus)) {
    genreAccuracy = Math.min(genreAccuracy, 4.5);
  }
  if (scene.overallHealth === "healthy") genreAccuracy = Math.min(10, genreAccuracy + 0.4);

  const voicePreservation = Number(((input.voiceProxy ?? 0.8) * 10).toFixed(2));

  const composite = Number(
    (
      humanFeel * 0.14 +
      emotionalRealism * 0.12 +
      continuity * 0.1 +
      characterConsistency * 0.1 +
      readerEngagement * 0.14 +
      bingeability * 0.12 +
      commercialStrength * 0.14 +
      genreAccuracy * 0.1 +
      voicePreservation * 0.04
    ).toFixed(2),
  );

  return {
    humanFeel,
    emotionalRealism,
    continuity,
    characterConsistency,
    readerEngagement,
    bingeability,
    commercialStrength,
    genreAccuracy,
    voicePreservation,
    composite,
    tier: tierFromCalibratedScore(commercialStrength),
  };
}

export const RUBRIC_DIMENSION_LABELS: Record<RubricDimension, string> = {
  humanFeel: "Human feel",
  emotionalRealism: "Emotional realism",
  continuity: "Continuity",
  characterConsistency: "Character consistency",
  readerEngagement: "Reader engagement",
  bingeability: "Bingeability",
  commercialStrength: "Commercial strength",
  genreAccuracy: "Genre accuracy",
  voicePreservation: "Voice preservation",
};

export function compareRubricScores(a: RubricScores, b: RubricScores): number {
  return a.composite - b.composite;
}
