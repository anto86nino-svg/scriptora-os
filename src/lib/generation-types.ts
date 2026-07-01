/** Lightweight types — import without pulling the full generation module. */

export type RewriteLevel = "light" | "deep" | "bestseller";

export type ChunkProgressPhase = "OPENING" | "DEVELOPMENT" | "EXPANSION" | "TRANSITION" | "CLOSURE";
export type ChunkProgressSize = "LARGE" | "MEDIUM" | "SMALL" | "MICRO";

export interface ChunkProgress {
  chunkIndex: number;
  totalChunks: number;
  currentWords: number;
  targetWords: number;
  phase: ChunkProgressPhase;
  content: string;
  subchapters?: Array<{ title: string; content: string }>;
  chunkSize?: ChunkProgressSize;
  statusMessage?: string;
}
