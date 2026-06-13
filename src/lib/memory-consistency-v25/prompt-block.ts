import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { buildMemoryConsistencyV25Snapshot } from "./extractor";

export interface MemoryConsistencyV25Context {
  config: BookConfig;
  previousChapters: Chapter[];
  chapterIndex: number;
  blueprint?: BookBlueprint | null;
  longBookMemory?: LongBookMemorySnapshot;
}

export function buildMemoryConsistencyV25PromptBlock(ctx: MemoryConsistencyV25Context): string {
  const snapshot = ctx.longBookMemory?.memoryConsistencyV25
    || buildMemoryConsistencyV25Snapshot({
      config: ctx.config,
      blueprint: ctx.blueprint ?? null,
      chapters: ctx.previousChapters,
      chapterIndex: ctx.chapterIndex,
      psychology: ctx.longBookMemory?.characterPsychology,
      characterStates: ctx.longBookMemory?.characterStates,
      existing: ctx.longBookMemory?.memoryConsistencyV25,
    });

  const compressed = snapshot.compressedPromptSnapshot
    || buildMemoryConsistencyV25Snapshot({
      config: ctx.config,
      blueprint: ctx.blueprint ?? null,
      chapters: ctx.previousChapters,
      chapterIndex: ctx.chapterIndex,
      psychology: ctx.longBookMemory?.characterPsychology,
      characterStates: ctx.longBookMemory?.characterStates,
    }).compressedPromptSnapshot;

  return `MEMORY & CONSISTENCY ENGINE V2.5
${compressed}

ENFORCEMENT:
- This snapshot is canon. Do not contradict living memory without explicit on-page cause.
- Reuse callbacks, objects, tics, and relationship friction already established.
- If a prior chapter ended in conflict, carry residue forward — no emotional amnesia.`;
}
