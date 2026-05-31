import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import { buildNarrativeMemoryCore } from "./extractor";
import type { NarrativeMemoryCoreSnapshot } from "./types";

export type LongBookContinuityCheck = {
  passed: boolean;
  chapterCount: number;
  forgottenCharacters: string[];
  forgottenPromises: string[];
  forgottenObjects: string[];
  incompleteArcs: string[];
  brokenItems: number;
};

export function checkLongBookContinuity(input: {
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  chapters: Chapter[];
  minChapters?: number;
}): LongBookContinuityCheck {
  const memory = buildNarrativeMemoryCore(input);
  const min = input.minChapters ?? 15;
  const forgottenPromises = memory.items
    .filter(i => i.kind === "promise" && (i.status === "BROKEN" || (i.status === "OPEN" && input.chapters.length - i.introducedChapter > 8)))
    .map(i => i.label);

  return {
    passed:
      memory.brokenItems === 0 &&
      memory.forgottenCharacterRisk.length === 0 &&
      forgottenPromises.length === 0 &&
      input.chapters.length >= min,
    chapterCount: input.chapters.length,
    forgottenCharacters: memory.forgottenCharacterRisk,
    forgottenPromises,
    forgottenObjects: memory.forgottenObjectRisk,
    incompleteArcs: memory.incompleteArcs,
    brokenItems: memory.brokenItems,
  };
}

export function simulateLongBookMemory(input: {
  genre: string;
  chapterCount: number;
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  chapterFactory: (index: number, cast: string[]) => Chapter;
}): NarrativeMemoryCoreSnapshot {
  const chapters: Chapter[] = [];
  const cast = (input.config.characters || []).map(c => c.name).filter(Boolean);
  for (let i = 0; i < input.chapterCount; i++) {
    chapters.push(input.chapterFactory(i, cast));
  }
  return buildNarrativeMemoryCore({
    config: input.config,
    blueprint: input.blueprint,
    chapters,
  });
}
