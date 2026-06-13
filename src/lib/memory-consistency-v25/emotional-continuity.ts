import type { Chapter } from "@/types/book";
import type { EmotionalContinuityBeat } from "./types";
import { chapterCorpus } from "./utils";

const EMOTION_LEXICON: Record<string, string[]> = {
  fear: ["paura", "afraid", "terror", "ansia", "anxious"],
  desire: ["desire", "desiderio", "attrazione", "longing", "want"],
  anger: ["rabbia", "anger", "furious", "rage", "litig"],
  grief: ["grief", "dolore", "loss", "perdita", "lutto"],
  hope: ["hope", "speranza", "faith", "fiducia"],
  vulnerability: ["vulnerab", "open", "apert", "confess", "trem"],
  healing: ["guarito", "healed", "tutto\s+va\s+bene", "everything\s+is\s+fine", "capisco\s+tutto", "i\s+understand\s+now"],
};

const RESET_PATTERNS = [
  /\b(tutto\s+va\s+bene|everything\s+is\s+fine|finalmente\s+capisco|i\s+understand\s+now|ti\s+amo\s+senza\s+paura)\b/i,
  /\b(completely\s+healed|guarito\s+del\s+tutto|no\s+more\s+fear|senza\s+più\s+paura)\b/i,
];

function dominantEmotion(text: string): { emotion: string; intensity: number } {
  const lower = text.toLowerCase();
  let best = "neutral";
  let bestCount = 0;
  for (const [emotion, words] of Object.entries(EMOTION_LEXICON)) {
    if (emotion === "healing") continue;
    const count = words.reduce((sum, word) => sum + (lower.match(new RegExp(`\\b${word}\\b`, "g"))?.length || 0), 0);
    if (count > bestCount) {
      best = emotion;
      bestCount = count;
    }
  }
  return { emotion: best, intensity: Math.min(10, 3 + bestCount * 2) };
}

export function buildEmotionalContinuity(chapters: Chapter[]): EmotionalContinuityBeat[] {
  const beats: EmotionalContinuityBeat[] = [];
  let previousIntensity = 0;
  let previousEmotion = "neutral";

  chapters.forEach((chapter, index) => {
    const text = chapterCorpus(chapter);
    if (text.length < 40) return;
    const { emotion, intensity } = dominantEmotion(text);
    const regressionRisk = RESET_PATTERNS.some((pattern) => pattern.test(text))
      || (previousEmotion === "fear" && emotion === "hope" && intensity >= 7 && index > 0)
      || (previousIntensity >= 7 && intensity <= 3 && index > 0);

    beats.push({
      chapter: index + 1,
      emotion,
      intensity,
      regressionRisk,
    });

    previousEmotion = emotion;
    previousIntensity = intensity;
  });

  return beats;
}

export function hasUnjustifiedEmotionalReset(
  previousBeat: EmotionalContinuityBeat | undefined,
  currentBeat: EmotionalContinuityBeat,
  chapterText: string,
): boolean {
  if (!previousBeat) return false;
  if (!currentBeat.regressionRisk) return false;
  const justified = /\b(perché|because|dopo|after|finalmente|at\s+last|years?\s+later|mesi\s+dopo)\b/i.test(chapterText);
  return !justified && previousBeat.intensity >= 6 && currentBeat.intensity <= 4;
}
