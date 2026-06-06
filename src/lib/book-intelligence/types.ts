import type { Genre } from "@/types/book";

/** Layer 1 — Fiction vs Non-Fiction */
export type BookDomain = "fiction" | "nonfiction" | "hybrid";

/** Layer 7 — Specialized writing brain IDs (20+ brains) */
export type WritingBrainId =
  // Fiction
  | "romance-brain"
  | "dark-romance-brain"
  | "enemies-to-lovers-brain"
  | "slow-burn-brain"
  | "fantasy-brain"
  | "epic-fantasy-brain"
  | "thriller-brain"
  | "psychological-thriller-brain"
  | "crime-brain"
  | "mafia-brain"
  | "mystery-brain"
  | "cozy-mystery-brain"
  | "horror-brain"
  | "dystopian-brain"
  | "ya-brain"
  | "sci-fi-brain"
  | "paranormal-brain"
  // Non-fiction
  | "self-help-brain"
  | "productivity-brain"
  | "psychology-brain"
  | "memoir-brain"
  | "business-brain"
  | "spirituality-brain"
  | "education-brain"
  | "practical-manual-brain"
  | "horticultural-guide-brain"
  | "fitness-brain"
  | "health-brain"
  | "finance-brain"
  | "parenting-brain"
  | "study-guide-brain"
  | "biography-brain"
  | "cookbook-brain"
  | "technical-manual-brain"
  // Fallback
  | "general-narrative-brain";

export interface BookIntelligenceLayers {
  /** Layer 1 — Fiction vs Non-Fiction */
  domain: BookDomain;
  /** Layer 2 — Primary genre */
  primaryGenre: string;
  /** Layer 3 — Subgenre / niche */
  subgenre: string;
  /** Layer 4 — Book archetype */
  archetype: string;
  /** Layer 5 — Reader expectation model */
  readerExpectations: string[];
  /** Layer 6 — Commercial structure logic */
  commercialStructure: string;
  /** Layer 7 — Writing engine selection */
  writingBrainId: WritingBrainId;
  /** Layer 8 — Bestseller optimization mode */
  bestsellerMode: string;
}

export interface BookIntelligenceInput {
  idea?: string;
  title?: string;
  genre?: string;
  category?: string;
  subcategory?: string;
  tone?: string;
}

export interface BookIntelligenceReport {
  layers: BookIntelligenceLayers;
  /** Maps to existing Genre type for backward-compatible pipelines */
  resolvedGenre: Genre;
  subcategory: string;
  tone: string;
  confidence: number;
  signals: string[];
  structureElements: string[];
  avoidPatterns: string[];
}

/** Snapshot stored on project at creation — mirrors GenreLock pattern */
export interface BookIntelligenceSnapshot {
  version: 2;
  layers: BookIntelligenceLayers;
  resolvedGenre: Genre;
  subcategory: string;
  tone: string;
  confidence: number;
  lockedAt: string;
}
