import { computePremiumEditorialScores } from "@/lib/editorial-intelligence-premium";
import type { BookProject } from "@/types/book";
import type { MollyBrainScore } from "./types";

function repetitionRisk(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length < 80) return 20;
  const trigrams = new Map<string, number>();
  for (let i = 0; i < words.length - 2; i++) {
    const tri = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    trigrams.set(tri, (trigrams.get(tri) || 0) + 1);
  }
  const repeats = [...trigrams.values()].filter((c) => c >= 3).length;
  return Math.round(Math.min(92, repeats * 11 + 8));
}

export function scoreMollyBrainContext(input: {
  content: string;
  project: BookProject;
  chapterIndex?: number;
}): MollyBrainScore {
  const content = String(input.content || "").trim();
  const genre = input.project.config.genre || "fiction";
  const premium = computePremiumEditorialScores({
    content,
    genre,
    language: input.project.config.language,
    chapterIndex: input.chapterIndex,
  });

  const repetition = repetitionRisk(content);

  return {
    narrativeQuality: premium.composite,
    immersion: Math.round((premium.scenePacing + premium.emotionalRealism) / 2),
    humanAuthenticity: Math.round((premium.dialogueHumanity + premium.emotionalRealism) / 2),
    readerDropRisk: premium.readerDropRisk,
    commercialStrength: Math.round((premium.hookStrength + premium.bingeability + premium.commercialReadability) / 3),
    repetitionRisk: repetition,
    emotionalRealism: premium.emotionalRealism,
    composite: Math.round(
      premium.composite * 0.45 +
        (100 - premium.readerDropRisk) * 0.2 +
        premium.dialogueHumanity * 0.2 +
        (100 - repetition) * 0.15,
    ),
  };
}
