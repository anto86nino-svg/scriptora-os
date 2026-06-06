import type { BookProject } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { buildLongBookMemory, refreshProjectLongBookMemory } from "@/lib/long-book-memory";
import { buildCharacterPsychologyProfiles, buildCharacterPsychologyPromptBlock } from "./character-psychology";
import { analyzeChapterScenePurpose } from "./scene-purpose";
import { simulateReaderEmotion } from "./reader-emotion";
import type { BookConfig } from "@/types/book";

function chapterContent(chapter: BookProject["chapters"][number]): string {
  const subs = (chapter.subchapters || []).map(s => s.content).join("\n");
  return `${chapter.content}\n${subs}`.trim();
}

export function buildLongBookMemoryWithPsychology(input: {
  config: BookConfig;
  blueprint: BookProject["blueprint"];
  chapters: BookProject["chapters"];
  existingMemory?: LongBookMemorySnapshot;
}): LongBookMemorySnapshot {
  const base = buildLongBookMemory(input);
  const psychology = buildCharacterPsychologyProfiles({
    config: input.config,
    blueprint: input.blueprint,
    chapters: input.chapters,
    characterStates: base.characterStates,
    existing: input.existingMemory?.characterPsychology,
  });

  return {
    ...base,
    characterPsychology: psychology,
  };
}

export function refreshProjectNarrativeIntelligenceV2(project: BookProject): BookProject {
  const memory = buildLongBookMemoryWithPsychology({
    config: project.config,
    blueprint: project.blueprint,
    chapters: project.chapters,
    existingMemory: project.longBookMemory,
  });

  const chapters = project.chapters.map((chapter, index) => {
    const content = chapterContent(chapter);
    if (content.length < 60) return chapter;

    const scenePurposeIntel = analyzeChapterScenePurpose({
      content,
      chapterIndex: index,
      config: project.config,
    });

    const readerEmotionState = simulateReaderEmotion({
      content,
      chapterIndex: index,
      config: project.config,
      scenePurpose: scenePurposeIntel,
      totalChapters: project.config.numberOfChapters,
    });

    return {
      ...chapter,
      scenePurposeIntel,
      readerEmotionState,
    };
  });

  return {
    ...project,
    longBookMemory: memory,
    chapters,
  };
}

/** Backward-compatible alias: extends existing refresh with V2 intelligence */
export function refreshProjectLongBookMemoryV2(project: BookProject): BookProject {
  return refreshProjectNarrativeIntelligenceV2(project);
}

export function buildNarrativeIntelligencePromptBlock(
  memory: LongBookMemorySnapshot,
  config?: BookConfig,
): string {
  const psychologyBlock = memory.characterPsychology?.length
    ? buildCharacterPsychologyPromptBlock(memory.characterPsychology)
    : "";

  if (!psychologyBlock) return "";

  const brainNote = config?.bookIntelligence?.layers?.writingBrainId
    ? `Genre brain: ${config.bookIntelligence.layers.writingBrainId}`
    : "";

  return [psychologyBlock, brainNote].filter(Boolean).join("\n\n");
}

export {
  buildCharacterPsychologyProfiles,
  buildCharacterPsychologyPromptBlock,
} from "./character-psychology";
export { analyzeChapterScenePurpose, formatScenePurposeLabel } from "./scene-purpose";
export { simulateReaderEmotion, readerEmotionDisplayRows, levelLabel } from "./reader-emotion";

export type {
  CharacterPsychologyProfile,
  ChapterScenePurposeSnapshot,
  ReaderEmotionSnapshot,
  ScenePurpose,
  ScenePurposeEntry,
} from "./types";

export const NARRATIVE_INTELLIGENCE_V2_KEY = "scriptora-narrative-intelligence-v2";

export function isNarrativeIntelligenceV2Enabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_NARRATIVE_INTEL_V2 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(NARRATIVE_INTELLIGENCE_V2_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

// Re-export for callers that only need base memory refresh without chapter snapshots
export { refreshProjectLongBookMemory };
