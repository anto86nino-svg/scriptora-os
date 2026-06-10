import type { BookConfig } from "@/types/book";
import { sanitizeChapterOutput } from "@/lib/chapter-generation-guard";
import { THERAPIST_DIALOGUE_RE } from "./human-contradiction";

const LEAK_PATTERNS: RegExp[] = [
  /\b(To be generated|Chapter setup|Genre Coach|Assistant says|NARRATIVE BRAIN|CHARACTER PSYCHOLOGY ENGINE|LONG BOOK MEMORY|DEVELOPMENTAL EDITOR)\b/gi,
  /\b(prompt|debug|placeholder|lorem ipsum|todo:?|tbd)\b/gi,
  /^#{1,6}\s+/gm,
  /\[(?:INST|SYSTEM|USER)\]/gi,
];

const ENGLISH_BLEED_IN_ITALIAN = /\b(the|and|was|were|she said|he said|however|therefore)\b/gi;

export function sanitizeNarrativeOutput(
  content: string,
  config: BookConfig,
  chapterTitle?: string,
): string {
  let text = sanitizeChapterOutput(content, config, chapterTitle);

  for (const pattern of LEAK_PATTERNS) {
    text = text.replace(pattern, "");
  }

  const italian = String(config.language || "").toLowerCase().includes("ital");
  if (italian) {
    const englishHits = (text.match(ENGLISH_BLEED_IN_ITALIAN) || []).length;
    if (englishHits > 8) {
      text = text.replace(ENGLISH_BLEED_IN_ITALIAN, "");
    }
  }

  text = text.replace(THERAPIST_DIALOGUE_RE, (match) => {
    return italian ? "non disse tutto" : "didn't say all of it";
  });

  return text.replace(/\n{3,}/g, "\n\n").trim();
}
