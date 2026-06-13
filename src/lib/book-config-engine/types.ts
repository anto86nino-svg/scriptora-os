import type { BookConfig } from "@/types/book";
import type { WritingStyleProfile } from "@/lib/book-creation-os/objectives";

/** Level 1 — master book type lock (user-facing editorial category). */
export type Level1BookType =
  | "romanzo"
  | "self-help"
  | "business"
  | "manuale"
  | "educazione"
  | "biografia"
  | "poesia"
  | "saggistica"
  | "spiritualita"
  | "marketing"
  | "psicologia"
  | "bambini";

export type DnaLevel = "LOW" | "LOW_MEDIUM" | "MEDIUM" | "HIGH" | "EXTREME" | "ENABLED" | "BLOCKED" | "CONTROLLED" | "DELAYED";

export interface GenreDnaProfile {
  id: string;
  label: string;
  traits: Record<string, DnaLevel | string>;
  defaultTone: string;
  defaultAuthorStyle: string;
  styleProfile: Partial<WritingStyleProfile>;
  blockedTonePatterns: RegExp[];
  blockedAuthorStylePatterns: RegExp[];
}

export interface ConfigFix {
  field: string;
  before: string;
  after: string;
  reason: string;
}

export interface SanitizeResult {
  config: BookConfig;
  fixes: ConfigFix[];
  level1: Level1BookType;
  previousLevel1?: Level1BookType;
  level1Changed: boolean;
}

export interface CoherenceDimension {
  id: string;
  label: string;
  score: number;
  issues: string[];
}

export interface CoherenceReport {
  overall: number;
  dimensions: CoherenceDimension[];
  needsCorrection: boolean;
  suggestedFixes: ConfigFix[];
}
