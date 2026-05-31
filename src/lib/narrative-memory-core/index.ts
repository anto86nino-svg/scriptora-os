export {
  NARRATIVE_MEMORY_CORE_VERSION,
  type MemoryItemKind,
  type MemoryItemStatus,
  type NarrativeMemoryItem,
  type NarrativeMemoryCoreSnapshot,
  type RelationshipMemoryAxis,
  type RelationshipMemoryLink,
  type CanonProtectionReport,
  type CanonViolation,
  type SupremeMemoryReport,
} from "./types";

export { memoryCoreToPromiseRegistry } from "./promise-bridge";
export { buildNarrativeMemoryCore, buildNarrativeMemoryPromptBlock } from "./extractor";
export { updateRelationshipMemory, relationshipHealthScore } from "./relationship-memory";
export { analyzeCanonProtection } from "./canon-protection";
export { generateSupremeMemoryReport } from "./memory-report";
export { checkLongBookContinuity, simulateLongBookMemory, type LongBookContinuityCheck } from "./long-book-check";

/** @deprecated narrative-promise-engine/tracker.ts — use buildNarrativeMemoryCore */
export const LEGACY_MEMORY_SOURCES_SUPERSEDED = [
  "narrative-promise-engine standalone registry (merged into memory core items)",
  "long-book-memory promisePayoffs only (superseded by unified items[])",
  "editorial-orchestrator separate promise tracking (reads memory core)",
] as const;
