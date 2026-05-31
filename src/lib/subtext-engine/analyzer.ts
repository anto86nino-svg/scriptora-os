import type { SubtextAnalysis } from "./types";

const EXPLAINED_EMOTION = [
  /\b(?:was|were|felt|feel|feeling|era|erano|si sentiva|si sentivano)\s+(?:sad|happy|angry|triste|felice|arrabbiat\w*|ansios\w*|afraid|spaventat\w*)[^.!?]*\b(?:because|perch[eé])\b/gi,
  /\b(?:era|erano|was|were)\s+(?:triste|felice|arrabbiat\w*|ansios\w*|afraid|sad|happy|angry)[^.!?]*\b(?:perch[eé]|because)\b/gi,
  /\b(?:felt?|sentiva|sentivano)\s+(?:abandoned|betrayed|rejected|alone|abbandonat\w*|tradit\w*|rifiutat\w*|sol[oa])[^.!?]*\b(?:because|perch[eé])\b/gi,
  /\b(?:triste|sad|felice|happy)\s+perch[eé]\s+[^.!?]+[.!?]/gi,
];

const DIRECT_EMOTION = [
  /\bI (?:was|am|felt|feel)\s+(?:sad|happy|angry|afraid|in love|devastated|triste|felice|arrabbiat|spaventat|innamorat)/gi,
  /\b(?:she|he|they) (?:was|were|felt|feeling)\s+(?:sad|happy|angry|afraid|triste|felice|arrabbiat|spaventat)/gi,
  /\b(?:my|his|her|their) (?:heart|cuore) (?:was|felt|ache|dol)/gi,
];

const EMOTIONAL_MONOLOGUE = [
  /(?:^|[.!?]\s+)(?:I|She|He|They|Io|Lei|Lui)[^.!?]{80,280}(?:understand|realize|capisco|capì|finalmente|because|perché)/gim,
];

const SHOW_SIGNALS = [
  /\b(?:looked|guardò|stared|fissò|phone|telefono|message|messaggio|silence|silenz|door|porta|hand|mano|breath|respiro)\b/gi,
  /\b(?:no one|nessuno|empty|vuot|unread|non letto)\b/gi,
];

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function analyzeSubtext(input: { content: string; chapterIndex: number }): SubtextAnalysis {
  const text = String(input.content || "");
  const weakPassages: string[] = [];

  let explainedEmotion = 0;
  for (const p of EXPLAINED_EMOTION) {
    p.lastIndex = 0;
    const matches = text.match(p) || [];
    explainedEmotion += matches.length;
    matches.slice(0, 2).forEach(m => weakPassages.push(m.trim().slice(0, 100)));
  }

  let directEmotionalStatements = 0;
  for (const p of DIRECT_EMOTION) {
    p.lastIndex = 0;
    directEmotionalStatements += (text.match(p) || []).length;
  }

  let emotionalMonologues = 0;
  for (const p of EMOTIONAL_MONOLOGUE) {
    p.lastIndex = 0;
    emotionalMonologues += (text.match(p) || []).length;
  }

  const showCount = SHOW_SIGNALS.reduce((n, p) => {
    p.lastIndex = 0;
    return n + (text.match(p) || []).length;
  }, 0);
  const tellCount = explainedEmotion + directEmotionalStatements + emotionalMonologues;
  const showDontTellRatio = tellCount > 0 ? showCount / tellCount : showCount > 0 ? 2 : 1;

  const penalty = explainedEmotion * 14 + directEmotionalStatements * 8 + emotionalMonologues * 12;
  const subtextScore = clamp100(88 - penalty + Math.min(20, showCount * 2));

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    metrics: {
      explainedEmotion,
      directEmotionalStatements,
      emotionalMonologues,
      showDontTellRatio: Math.round(showDontTellRatio * 100) / 100,
    },
    subtextScore,
    weakPassages: weakPassages.slice(0, 5),
    passesGate: explainedEmotion === 0 && emotionalMonologues <= 1 && subtextScore >= 55,
  };
}
