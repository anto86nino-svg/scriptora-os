import type { EmotionalResonanceReport } from "./types";
import { clamp100, endingChars, openingWords, splitSentences } from "./utils";

const TOLD_EMOTION = /\b(?:felt|feel|feeling|was sad|was happy|era triste|era felice|si sentiva|understood who|capisco tutto)\b/gi;
const CONCRETE_BEAT = /\b(?:phone|telefono|hand|mano|door|porta|breath|respiro|silence|silenz|looked|guardò|turned|girò|waited|aspettò|refused|rifiutò)\b/gi;

export function analyzeEmotionalResonance(content: string): EmotionalResonanceReport {
  const text = String(content || "").trim();
  const warnings: string[] = [];
  const sentences = splitSentences(text);

  TOLD_EMOTION.lastIndex = 0;
  CONCRETE_BEAT.lastIndex = 0;
  const toldCount = (text.match(TOLD_EMOTION) || []).length;
  const concreteBeats = (text.match(CONCRETE_BEAT) || []).length;
  const toldEmotionRatio = clamp100((toldCount / Math.max(1, sentences.length)) * 120);

  const open = openingWords(text, 40).toLowerCase();
  const end = endingChars(text, 200).toLowerCase();
  let echoStrength = 40;
  const openTokens = open.match(/\b(?:phone|door|rain|promise|silence|telefono|porta|pioggia|promess|silenz)\w*/gi) || [];
  for (const token of openTokens) {
    if (end.includes(token.toLowerCase())) echoStrength += 18;
  }
  if (/\b(?:still|yet|still|unanswered|unread|waiting)\b/i.test(end)) echoStrength += 12;
  echoStrength = clamp100(echoStrength);

  let persistenceScore = 50;
  if (concreteBeats >= 3) persistenceScore += 18;
  if (concreteBeats >= 6) persistenceScore += 10;
  if (toldCount === 0) persistenceScore += 12;
  if (toldCount >= 3) persistenceScore -= 16;
  if (echoStrength >= 58) persistenceScore += 14;
  persistenceScore = clamp100(persistenceScore);

  if (toldCount >= 2) {
    warnings.push("Emotion is named but may not persist after reading");
  }
  if (echoStrength < 50) {
    warnings.push("Closing does not echo opening — low emotional persistence");
  }

  return {
    persistenceScore,
    concreteBeats,
    toldEmotionRatio,
    echoStrength,
    passesGate: persistenceScore >= 58 && toldCount <= 2,
    warnings,
  };
}
