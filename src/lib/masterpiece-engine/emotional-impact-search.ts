import type { EmotionalImpactReport, EmotionalTone } from "./types";
import { clamp100, endingChars, openingWords, splitSentences } from "./utils";

const TONE_PATTERNS: Record<EmotionalTone, RegExp> = {
  shock: /\b(suddenly|without warning|wrong|impossible|never expected|improvvisamente|sbagliato)\b/gi,
  sadness: /\b(unread|unanswered|alone|empty|silence|ring|unopened|abbandon|silenz|vuot)\b/gi,
  desire: /\b(wanted|needed|couldn't look away|attraction|desider|voleva|non poteva)\b/gi,
  nostalgia: /\b(remember|used to|once|before|ricord|un tempo|prima)\b/gi,
  relief: /\b(breathed|exhaled|finally|for a moment|per un attimo|finalmente)\b/gi,
  fear: /\b(danger|blood|knock|footsteps|dark|pericolo|sangue|busso|buio)\b/gi,
};

const FORCED_CRINGE = /\b(you've got this|believe in yourself|everything happens for a reason|manifest|vibes|crush your goals)\b/gi;

export function analyzeEmotionalImpact(content: string): EmotionalImpactReport {
  const text = String(content || "");
  const tones = {} as Record<EmotionalTone, number>;

  for (const [tone, pattern] of Object.entries(TONE_PATTERNS) as Array<[EmotionalTone, RegExp]>) {
    pattern.lastIndex = 0;
    tones[tone] = clamp100((text.match(pattern) || []).length * 14);
  }

  const dominant = (Object.entries(tones) as Array<[EmotionalTone, number]>).sort((a, b) => b[1] - a[1])[0];
  const dominantTone = dominant[1] >= 20 ? dominant[0] : "mixed";

  const open = openingWords(text, 60).toLowerCase();
  const end = endingChars(text, 200).toLowerCase();
  let persistenceScore = 42;
  const lastingBeats: string[] = [];

  for (const sentence of splitSentences(text).slice(0, 12)) {
    if (/\b(but|yet|still|unanswered|waiting|phone|door|promise|secret)\b/i.test(sentence)) {
      lastingBeats.push(sentence.trim().slice(0, 90));
    }
  }

  if (lastingBeats.length >= 2) persistenceScore += 18;
  if (open && end && /\b(phone|door|promise|rain|silence|key)\w*/i.test(open)) {
    const token = open.match(/\b(phone|door|promise|rain|silence|key)\w*/i)?.[0];
    if (token && end.includes(token.toLowerCase())) persistenceScore += 16;
  }
  if (dominant[1] >= 28 && !FORCED_CRINGE.test(text)) persistenceScore += 12;
  if (/(understood everything|all was well|tutto risolto)/i.test(end)) persistenceScore -= 14;

  persistenceScore = clamp100(persistenceScore);

  return {
    tones,
    dominantTone,
    persistenceScore,
    lastingBeats: lastingBeats.slice(0, 4),
    passesGate: persistenceScore >= 58 && !FORCED_CRINGE.test(text),
  };
}
