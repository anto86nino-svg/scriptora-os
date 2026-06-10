import type { BookProject } from "@/types/book";
import { buildLongBookMemoryPromptBlock } from "@/lib/long-book-memory";
import { refreshProjectNarrativeIntelligenceV2 } from "@/lib/narrative-intelligence-v2";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";

export function buildLongMemoryV3Block(
  memory: LongBookMemorySnapshot | null | undefined,
  chapterIndex: number,
): string {
  if (!memory) {
    return `LONG MEMORY V3:
No prior chapters indexed. Plant durable promises, secrets, objects, and relationship asymmetry that can pay off later.`;
  }

  const base = buildLongBookMemoryPromptBlock(memory, chapterIndex);
  const psych = memory.characterPsychology?.length
    ? `\nPSYCHOLOGY STATES LOCKED:\n${memory.characterPsychology.map((p) => `• ${p.name}: wound=${p.woundLabel}; coping=${p.copingLabel}`).join("\n")}`
    : "";

  return `${base}${psych}

LONG MEMORY V3 CONTINUITY SCAN:
Before writing — verify no reset of trauma, names, secrets, or overdue promises.
Advance at least one open arc OR pay one off with cost.`;
}

export function refreshLongMemoryV3(project: BookProject): BookProject {
  return refreshProjectNarrativeIntelligenceV2(project);
}
