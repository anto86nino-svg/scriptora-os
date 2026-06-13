import type { BookProject } from "@/types/book";
import type { PremiumWritingContext } from "@/lib/premium-writing";
import { buildMemoryConsistencyV25PromptBlock } from "./prompt-block";

export const MEMORY_CONSISTENCY_V25_KEY = "scriptora-memory-consistency-v25";

export function isMemoryConsistencyV25Enabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_MEMORY_V25 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(MEMORY_CONSISTENCY_V25_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

export function buildMemoryConsistencyV25Block(ctx: PremiumWritingContext & {
  longBookMemory?: BookProject["longBookMemory"];
}): string {
  if (!isMemoryConsistencyV25Enabled()) return "";
  return buildMemoryConsistencyV25PromptBlock({
    config: ctx.config,
    previousChapters: ctx.previousChapters,
    chapterIndex: ctx.chapterIndex,
    blueprint: ctx.blueprint,
    longBookMemory: ctx.longBookMemory,
  });
}

export { buildMemoryConsistencyV25PromptBlock } from "./prompt-block";
export { buildMemoryConsistencyV25Snapshot, refreshProjectMemoryConsistencyV25 } from "./extractor";
export { runDevelopmentalMemoryCheck, formatDevelopmentalMemoryIssues } from "./developmental-check";
export { buildCompressedMemorySnapshot } from "./memory-compression";
export type {
  MemoryConsistencyV25Snapshot,
  CharacterLiveMemory,
  RelationshipMemory,
  StoryPromiseItem,
  DevelopmentalMemoryReport,
  DevelopmentalMemoryIssue,
} from "./types";
