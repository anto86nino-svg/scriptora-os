import type { BookBlueprint, BookConfig, BookProject, Chapter } from "@/types/book";
import type { CharacterMemoryState } from "@/lib/long-book-memory/types";
import type { CharacterPsychologyProfile } from "@/lib/narrative-intelligence-v2/types";
import { buildLongBookMemory } from "@/lib/long-book-memory";
import { buildCharacterPsychologyProfiles } from "@/lib/narrative-intelligence-v2/character-psychology";
import type { MemoryConsistencyV25Snapshot } from "./types";
import { buildCharacterLiveMemories } from "./character-memory";
import { buildRelationshipMemories } from "./relationship-memory";
import { buildStoryPromiseTracker } from "./story-promise-tracker";
import { buildEmotionalContinuity } from "./emotional-continuity";
import { buildTensionMemory } from "./tension-memory";
import { buildCallbackAnchors } from "./callback-engine";
import { buildCompressedMemorySnapshot } from "./memory-compression";
import { chapterCorpus } from "./utils";

export function buildMemoryConsistencyV25Snapshot(input: {
  config: BookConfig;
  blueprint: BookBlueprint | null;
  chapters: Chapter[];
  chapterIndex?: number;
  existing?: MemoryConsistencyV25Snapshot;
  psychology?: CharacterPsychologyProfile[];
  characterStates?: CharacterMemoryState[];
}): MemoryConsistencyV25Snapshot {
  const written = input.chapters.filter((chapter) => chapterCorpus(chapter).length > 40);
  const baseMemory = buildLongBookMemory({
    config: input.config,
    blueprint: input.blueprint,
    chapters: input.chapters,
  });
  const psychology = input.psychology?.length
    ? input.psychology
    : buildCharacterPsychologyProfiles({
        config: input.config,
        blueprint: input.blueprint,
        chapters: input.chapters,
        characterStates: input.characterStates || baseMemory.characterStates,
        existing: input.existing ? undefined : input.psychology,
      });

  const characterMemories = buildCharacterLiveMemories({
    config: input.config,
    blueprint: input.blueprint,
    chapters: input.chapters,
    characterStates: input.characterStates || baseMemory.characterStates,
    psychology,
  });
  const relationships = buildRelationshipMemories({
    config: input.config,
    blueprint: input.blueprint,
    chapters: input.chapters,
  });
  const storyPromises = buildStoryPromiseTracker(
    written,
    input.blueprint,
    input.config.numberOfChapters,
  );
  const emotionalContinuity = buildEmotionalContinuity(written);
  const tensionMemory = buildTensionMemory(
    input.config,
    written,
    input.chapterIndex ?? Math.max(0, written.length),
  );
  const callbacks = buildCallbackAnchors(input.config, written);

  const partial = {
    version: 25 as const,
    updatedAt: new Date().toISOString(),
    chaptersIndexed: written.length,
    characterMemories,
    relationships,
    storyPromises,
    emotionalContinuity,
    tensionMemory,
    callbacks,
  };

  return {
    ...partial,
    compressedPromptSnapshot: buildCompressedMemorySnapshot(
      partial,
      input.chapterIndex ?? Math.max(0, written.length),
    ),
  };
}

export function refreshProjectMemoryConsistencyV25(project: BookProject): BookProject {
  const psychology = project.longBookMemory?.characterPsychology
    || buildCharacterPsychologyProfiles({
      config: project.config,
      blueprint: project.blueprint,
      chapters: project.chapters,
      characterStates: project.longBookMemory?.characterStates,
      existing: project.longBookMemory?.characterPsychology,
    });

  const baseMemory = buildLongBookMemory({
    config: project.config,
    blueprint: project.blueprint,
    chapters: project.chapters,
  });

  const memoryConsistencyV25 = buildMemoryConsistencyV25Snapshot({
    config: project.config,
    blueprint: project.blueprint,
    chapters: project.chapters,
    psychology,
    characterStates: baseMemory.characterStates,
    existing: project.longBookMemory?.memoryConsistencyV25,
  });

  return {
    ...project,
    longBookMemory: {
      ...baseMemory,
      characterPsychology: psychology,
      memoryConsistencyV25,
    },
  };
}
