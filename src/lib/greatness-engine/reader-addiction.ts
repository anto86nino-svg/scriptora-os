import { clampScore, endingText, openingText } from "./utils";
import { scoreChapterEndingMagnetism } from "./chapter-ending";
import { scoreHookPower } from "./hook-power";

const DRAG_PATTERNS = [
  /\b(pensò che|she thought that|he wondered|si chiese se|in conclusion|in sintesi)\b/gi,
  /\b(felt sad|era triste|felt anxious|era ansioso)\b/gi,
];

const MOMENTUM_PATTERNS = [
  /\b(improvvisamente|suddenly|but then|ma poi|before|prima che|only then)\b/gi,
  /\b(realized|capì|saw|vide|heard|sentì|found|trovò)\b/gi,
];

export interface ReaderAddictionResult {
  score: number;
  bingeability: number;
  narrativeDrag: number;
  emotionalMomentum: number;
  dropRisk: number;
  risks: string[];
  strengths: string[];
}

function countPatternMatches(text: string, patterns: readonly RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (text.match(pattern)?.length || 0), 0);
}

export function scoreReaderAddiction(text: string, fiction: boolean): ReaderAddictionResult {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const dragHits = countPatternMatches(text, DRAG_PATTERNS);
  const momentumHits = countPatternMatches(text, MOMENTUM_PATTERNS);
  const hook = scoreHookPower(text, fiction);
  const ending = scoreChapterEndingMagnetism(text);

  const narrativeDrag = clampScore(18 + dragHits * 9);
  const emotionalMomentum = clampScore(40 + momentumHits * 5 - dragHits * 4);
  const bingeability = clampScore((ending.score + hook.score) / 2);
  const dropRisk = clampScore(narrativeDrag * 0.45 + (100 - emotionalMomentum) * 0.35 + (fiction ? 0 : -8));
  const score = clampScore(
    bingeability * 0.35 +
    emotionalMomentum * 0.3 +
    (100 - dropRisk) * 0.2 +
    (100 - narrativeDrag) * 0.15,
  );

  const risks: string[] = [];
  const strengths: string[] = [];
  if (dropRisk >= 58) risks.push("Drop risk alto — troppo riflessione, poco avanzamento");
  if (narrativeDrag >= 55) risks.push("Narrative drag — monologhi o spiegazioni rallentano");
  if (bingeability >= 65) strengths.push("Bingeability forte verso il capitolo successivo");
  if (emotionalMomentum >= 62) strengths.push("Momentum emotivo sostenuto");
  if (words > 900 && momentumHits < 4) risks.push("Capitolo lungo con pochi turning point");

  return { score, bingeability, narrativeDrag, emotionalMomentum, dropRisk, risks, strengths };
}

export function buildReaderAddictionPromptBlock(compulsiveTarget = 65): string {
  return `READER ADDICTION ENGINE:
- Target compulsive readability: ${compulsiveTarget}+/100
- Ogni 400–600 parole: nuova informazione, turno di scena, o conseguenza.
- Se il momentum cala: accorcia esposizione e chiudi la scena con tensione irrisolta.
- Misura bingeability, narrative drag, emotional momentum, drop risk mentre scrivi.`;
}
