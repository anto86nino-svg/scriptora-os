import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { buildMemoryConsistencyV25Snapshot } from "./extractor";
import type { MemoryConsistencyV25Snapshot } from "./types";

export interface MemoryConsistencyV25Context {
  config: BookConfig;
  previousChapters: Chapter[];
  chapterIndex: number;
  blueprint?: BookBlueprint | null;
  longBookMemory?: LongBookMemorySnapshot;
}

function buildPromisePayoffDirective(
  snapshot: MemoryConsistencyV25Snapshot,
  chapterIndex: number,
): string {
  const chapterNumber = chapterIndex + 1;
  const active = snapshot.storyPromises
    .filter((item) => item.status !== "resolved")
    .sort((a, b) => {
      const urgency = { high: 0, medium: 1, low: 2 };
      return urgency[a.urgency] - urgency[b.urgency];
    })
    .slice(0, 5);

  if (!active.length) {
    return `PROMISE/PAYOFF OPERATING RULES:
- No unresolved promise is currently indexed. Do not invent a major new mystery unless the blueprint requires it.`;
  }

  const focusLines = active.map((item) => {
    const expected = item.expectedPayoffChapter ? `; expected payoff ch.${item.expectedPayoffChapter}` : "";
    const developed = item.developedIn?.length ? `; developed ch.${item.developedIn.join(",")}` : "";
    const action = item.expectedPayoffChapter && chapterNumber >= item.expectedPayoffChapter
      ? "PAY OFF OR EXPLICITLY ADVANCE NOW"
      : item.status === "partial"
        ? "ADVANCE WITHOUT RESETTING"
        : "KEEP ALIVE WITH A CONCRETE BEAT";
    return `- ${action}: [ch.${item.chapterIntroduced}|${item.type}|${item.urgency}] ${item.description}${developed}${expected}`;
  });

  return `PROMISE/PAYOFF OPERATING RULES:
${focusLines.join("\n")}
- Do not drop open mysteries, objects, threats, or questions.
- If a promise cannot be paid off in this chapter, show one concrete development beat.
- Avoid opening new major promises while high-urgency debts remain unpaid.`;
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

${buildPromisePayoffDirective(snapshot, ctx.chapterIndex)}

ENFORCEMENT:
- This snapshot is canon. Do not contradict living memory without explicit on-page cause.
- Reuse callbacks, objects, tics, and relationship friction already established.
- If a prior chapter ended in conflict, carry residue forward — no emotional amnesia.`;
}
