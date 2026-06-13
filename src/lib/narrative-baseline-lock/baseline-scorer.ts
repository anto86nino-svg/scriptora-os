import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { scoreHumanNarrativeRealism } from "@/lib/human-narrative-realism-v3/post-process";
import { scoreGenerationExcellence } from "@/lib/human-narrative-realism-v3/excellence-scores";
import { evaluateGreatnessChapter } from "@/lib/greatness-engine";
import { resolveMarketWinnerMode } from "@/lib/greatness-engine/market-winner";
import { scoreSceneProgression } from "@/lib/premium-writing/scene-purpose-validator";
import type { BookConfig } from "@/types/book";
import type { BaselineGenreId, NarrativeBaselineMetrics, NarrativeBaselineSnapshot } from "./types";

const THERAPY_PATTERNS = [
  /\b(capisco perfettamente|i completely understand|it's okay|va tutto bene|i love you and i'm not afraid)\b/gi,
  /\b(i finally understand myself|ho capito il mio trauma|processed my trauma)\b/gi,
];

function therapySpeechScore(text: string): number {
  const hits = THERAPY_PATTERNS.reduce((sum, pattern) => sum + (text.match(pattern) || []).length, 0);
  return Math.max(0, Math.min(100, 100 - hits * 22));
}

function genreAlignmentScore(text: string, config: BookConfig): number {
  const family = resolveBookTypeDefinition(
    config.genre,
    config.subcategory,
    config.subgenre,
    config.bookTypeId,
  ).family;
  const mode = resolveMarketWinnerMode(config.genre, family);
  let score = 58;

  if (family === "educational" || family === "manual") {
    if (/\b(step|passo|exam|esame|prerequisite|warning|note|sequence|causality|prerequisites)\b/i.test(text)) {
      score += 16;
    }
    if (/\b(very interesting|molto interessante|in this chapter we|in questo capitolo)\b/i.test(text)) {
      score -= 14;
    }
    return Math.max(20, Math.min(100, score));
  }

  if (mode === "actionable_momentum") {
    if (/\b(step|passo|tool|strumento|%|warning|prerequisite)\b/i.test(text)) score += 18;
    if (/\b(once upon|beautiful morning|mysterious statue)\b/i.test(text)) score -= 12;
  } else if (mode === "compulsive_mystery") {
    if (/\b(secret|segreto|danger|pericolo|wrong|sbagliat|key|chiave)\b/i.test(text)) score += 16;
    if (/\b(in conclusion|in questo capitolo parleremo)\b/i.test(text)) score -= 14;
  } else if (mode === "emotional_addiction") {
    if (/\b(silence|silenzio|wrist|polso|avoid|evita|desire|desider)\b/i.test(text)) score += 14;
    if (/\b(everything was fine|tutto risolto)\b/i.test(text)) score -= 16;
  } else if (mode === "wonder_momentum") {
    if (/\b(rune|river|kingdom|regno|leaf|foglia|awakened)\b/i.test(text)) score += 14;
  } else {
    if (/\b(i learned|ho imparato|kitchen|truth|verità)\b/i.test(text)) score += 10;
  }

  return Math.max(20, Math.min(100, score));
}

function coherenceScore(text: string, config: BookConfig): number {
  const names = (config.characters || []).map((c) => c.name).filter(Boolean);
  if (!names.length) return 72;
  const lower = text.toLowerCase();
  const present = names.filter((name) => lower.includes(name.toLowerCase())).length;
  const resetPenalty = /\b(best friends|migliori amici|everything was fine|tutto a posto)\b/i.test(text) ? 18 : 0;
  return Math.max(25, Math.min(95, 60 + present * 8 - resetPenalty));
}

export function scoreNarrativeBaseline(
  text: string,
  config: BookConfig,
  chapterIndex = 0,
): NarrativeBaselineMetrics {
  const realism = scoreHumanNarrativeRealism(text);
  const excellence = scoreGenerationExcellence(text, { config });
  const greatness = evaluateGreatnessChapter({
    content: text,
    chapterIndex,
    genre: config.genre,
    subcategory: config.subcategory,
    subgenre: config.subgenre,
    bookTypeId: config.bookTypeId,
  });
  const pacing = scoreSceneProgression(text);
  const therapySpeech = therapySpeechScore(text);

  const emotionalPacing = Math.round((excellence.emotionalRealism + pacing + excellence.narrativeEscalation) / 3);
  const coherence = coherenceScore(text, config);
  const genreAlignment = genreAlignmentScore(text, config);

  const composite = Math.round(
    realism.aiSmell * 0.14 +
    realism.dialogueHumanity * 0.12 +
    therapySpeech * 0.1 +
    emotionalPacing * 0.1 +
    greatness.scores.hookPower * 0.12 +
    greatness.scores.memorability * 0.1 +
    coherence * 0.1 +
    genreAlignment * 0.12 +
    greatness.scores.compulsiveReadability * 0.1,
  );

  return {
    aiSmell: realism.aiSmell,
    dialogueHumanity: realism.dialogueHumanity,
    therapySpeech,
    emotionalPacing,
    hookStrength: greatness.scores.hookPower,
    memorability: greatness.scores.memorability,
    coherence,
    genreAlignment,
    compulsiveReadability: greatness.scores.compulsiveReadability,
    composite,
  };
}

export function buildBaselineSnapshot(
  genre: BaselineGenreId,
  text: string,
  config: BookConfig,
): NarrativeBaselineSnapshot {
  return {
    version: 1,
    tag: "scriptora-narrative-baseline-v1",
    evaluatedAt: new Date().toISOString(),
    genre,
    metrics: scoreNarrativeBaseline(text, config),
  };
}
