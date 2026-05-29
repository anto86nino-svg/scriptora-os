import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { getNarrativeTelemetrySnapshot } from "@/lib/narrative-intelligence";
import type { BookConfig } from "@/types/book";
import type { ChapterScenePurposeSnapshot, ReaderEmotionDisplayRow, ReaderEmotionLevel, ReaderEmotionSnapshot } from "./types";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function levelFromScore(score: number): ReaderEmotionLevel {
  if (score >= 68) return "high";
  if (score >= 38) return "medium";
  return "low";
}

function isFictionConfig(config?: BookConfig): boolean {
  const domain = config?.bookIntelligence?.layers?.domain;
  const brainId = config?.bookIntelligence?.layers?.writingBrainId || "";
  if (domain === "nonfiction") return false;
  if (domain === "fiction") return true;
  return !/manual|horticultural|self-help|productivity|business|education|cookbook|technical|study|finance|health|fitness|parenting|biography/.test(brainId);
}

function isRomanceBrain(config?: BookConfig): boolean {
  const brainId = config?.bookIntelligence?.layers?.writingBrainId || "";
  return /romance|dark-romance/.test(brainId) || config?.genre === "romance";
}

function isThrillerBrain(config?: BookConfig): boolean {
  const brainId = config?.bookIntelligence?.layers?.writingBrainId || "";
  return /thriller|crime|mystery|suspense/.test(brainId) || /thriller|mystery|crime/.test(config?.genre || "");
}

function isUtilityBrain(config?: BookConfig): boolean {
  const brainId = config?.bookIntelligence?.layers?.writingBrainId || "";
  return /horticultural|manual|practical|cookbook|technical|education/.test(brainId);
}

export function simulateReaderEmotion(input: {
  content: string;
  chapterIndex: number;
  config?: BookConfig;
  scenePurpose?: ChapterScenePurposeSnapshot;
  totalChapters?: number;
}): ReaderEmotionSnapshot {
  const text = String(input.content || "").trim();
  const fiction = isFictionConfig(input.config);
  const bestseller = evaluateBestsellerChapter({
    content: text,
    chapterIndex: input.chapterIndex,
    totalChapters: input.totalChapters,
    genre: input.config?.genre,
    bookIntelligence: input.config?.bookIntelligence,
  });
  const editorial = analyzeNovel(text);
  const telemetry = getNarrativeTelemetrySnapshot({
    config: {
      genre: (input.config?.genre || "literary-fiction") as any,
      bookIntelligence: input.config?.bookIntelligence as any,
    },
    currentText: text,
  });

  const openQuestions = (text.match(/\?/g) || []).length;
  const mysterySignals = (text.match(/\b(secret|segreto|unknown|mystery|mistero|who|chi|why|perché)\b/gi) || []).length;

  let curiosity = clamp(
    bestseller.scores.hookStrength * 0.35 +
      bestseller.scores.bingeability * 0.25 +
      openQuestions * 8 +
      mysterySignals * 6 +
      (telemetry.flags.weakHookRisk ? -12 : 0),
  );

  let emotionalTension = clamp(
    bestseller.scores.emotionalMomentum * 0.45 +
      editorial.subtextScore * 0.25 +
      (telemetry.flags.earlyPayoffRisk ? -10 : 8) +
      (fiction ? 10 : 0),
  );

  let confusion = clamp(
    (editorial.warnings.filter(w => w.type === "weak_subtext").length * 12) +
      (text.match(/\b(confus|unclear|non cap|didn't understand|lost)\b/gi)?.length || 0) * 8,
  );

  let emotionalPayoff = clamp(
    bestseller.scores.emotionalMomentum * 0.4 +
      (telemetry.flags.earlyPayoffRisk ? 55 : 25) +
      (editorial.warnings.some(w => w.type === "climax_oversaturation") ? 40 : 0),
  );
  if (telemetry.flags.earlyPayoffRisk) emotionalPayoff = clamp(emotionalPayoff * 0.7);

  let boredomRisk = clamp(
    telemetry.scores.readerDropRiskEstimate * 0.55 +
      (telemetry.flags.pacingCollapseRisk ? 18 : 0) +
      (input.scenePurpose?.warnings.some(w => /introspection|repetition/i.test(w)) ? 15 : 0),
  );

  let obsessionPotential = clamp(
    bestseller.scores.compulsiveReadability * 0.35 +
      bestseller.scores.bookTokIntensity * 0.25 +
      bestseller.scores.bingeability * 0.25 +
      emotionalTension * 0.15,
  );

  let emotionalFatigue = clamp(
    (editorial.warnings.filter(w => w.type === "emotional_redundancy").length * 14) +
      (input.scenePurpose?.scenes.filter(s => s.primaryPurpose === "emotional_progression").length || 0) * 6,
  );

  let compulsiveReadability = clamp(
    bestseller.scores.compulsiveReadability * 0.5 +
      bestseller.scores.readerRetention * 0.3 +
      (100 - boredomRisk) * 0.2,
  );

  if (isRomanceBrain(input.config)) {
    emotionalTension = clamp(emotionalTension * 0.55 + bestseller.scores.emotionalMomentum * 0.45);
    if (telemetry.flags.earlyPayoffRisk) {
      obsessionPotential = clamp(obsessionPotential + 12);
    }
  }

  if (isThrillerBrain(input.config)) {
    curiosity = clamp(curiosity * 0.4 + bestseller.scores.commercialPacing * 0.35 + mysterySignals * 8);
    emotionalTension = clamp(emotionalTension * 0.5 + bestseller.scores.commercialPacing * 0.5);
  }

  if (isUtilityBrain(input.config)) {
    curiosity = clamp(bestseller.scores.hookStrength * 0.5 + bestseller.scores.commercialPacing * 0.5);
    emotionalTension = clamp(emotionalTension * 0.35);
    boredomRisk = clamp(
      (editorial.warnings.filter(w => w.type === "repetitive_symbolism").length * 15) +
        (input.scenePurpose?.scenes.filter(s => s.primaryPurpose === "unclear").length || 0) * 12,
    );
    obsessionPotential = clamp(bestseller.scores.commercialPacing * 0.6 + curiosity * 0.4);
  }

  const whySummary: string[] = [];
  if (openQuestions >= 1 || mysterySignals >= 2) whySummary.push("Unresolved questions keep curiosity active");
  if (emotionalTension >= 60) whySummary.push("Strong emotional friction on the page");
  if (telemetry.flags.earlyPayoffRisk) whySummary.push("Emotional payoff deliberately delayed");
  if (bestseller.scores.bingeability >= 65) whySummary.push("Forward pull into the next chapter");
  if (boredomRisk >= 55) whySummary.push("Pacing or repetition may stall some readers");
  if (obsessionPotential >= 65) whySummary.push("High compulsive readability signals");
  if (!whySummary.length) whySummary.push("Reader state derived from hook, pacing, and emotional signals in text");

  const dominantReaderState =
    obsessionPotential >= 68
      ? "High obsession potential"
      : curiosity >= 65 && emotionalTension >= 55
        ? "Curious and emotionally engaged"
        : boredomRisk >= 58
          ? "Engagement at risk"
          : emotionalFatigue >= 55
            ? "Emotional fatigue risk"
            : "Steady narrative engagement";

  let genreAdjustedNote: string | undefined;
  if (isRomanceBrain(input.config)) genreAdjustedNote = "Romance lens: yearning and delayed payoff weighted heavily";
  else if (isThrillerBrain(input.config)) genreAdjustedNote = "Thriller lens: escalation and mystery drive reader state";
  else if (isUtilityBrain(input.config)) genreAdjustedNote = "Utility lens: clarity and usefulness drive reader retention";

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    curiosity,
    emotionalTension,
    confusion,
    emotionalPayoff,
    boredomRisk,
    obsessionPotential,
    emotionalFatigue,
    compulsiveReadability,
    dominantReaderState,
    whySummary: whySummary.slice(0, 4),
    genreAdjustedNote,
  };
}

export function readerEmotionDisplayRows(snapshot: ReaderEmotionSnapshot): ReaderEmotionDisplayRow[] {
  return [
    { label: "Curiosity", score: snapshot.curiosity, level: levelFromScore(snapshot.curiosity) },
    { label: "Emotional Tension", score: snapshot.emotionalTension, level: levelFromScore(snapshot.emotionalTension) },
    { label: "Confusion", score: snapshot.confusion, level: levelFromScore(snapshot.confusion) },
    { label: "Emotional Payoff", score: snapshot.emotionalPayoff, level: levelFromScore(snapshot.emotionalPayoff) },
    { label: "Boredom Risk", score: snapshot.boredomRisk, level: levelFromScore(100 - snapshot.boredomRisk) },
    { label: "Obsession Potential", score: snapshot.obsessionPotential, level: levelFromScore(snapshot.obsessionPotential) },
    { label: "Emotional Fatigue", score: snapshot.emotionalFatigue, level: levelFromScore(100 - snapshot.emotionalFatigue) },
    { label: "Compulsive Readability", score: snapshot.compulsiveReadability, level: levelFromScore(snapshot.compulsiveReadability) },
  ];
}

export function levelLabel(level: ReaderEmotionLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}
