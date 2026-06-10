import type { BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import type { CharacterPsychologyProfile } from "@/lib/narrative-intelligence-v2/types";

export interface NarrativeGenerationPlan {
  genre: string;
  subgenre: string;
  targetReader: string;
  marketplaceLane: string;
  toneDirective: string;
  narrativePromise: string;
  tensionLevel: "low" | "moderate" | "high" | "extreme";
  pacingDirective: string;
  dialogueDirective: string;
  subtextLevel: "light" | "balanced" | "heavy";
  romanceRules?: string[];
  thrillerRules?: string[];
  fantasyRules?: string[];
  forbiddenPatterns: string[];
  mandatoryPatterns: string[];
  hookStrengthTarget: number;
  curiosityDensityTarget: number;
}

export interface SceneContinuityReport {
  blockedBeats: string[];
  repeatedFears: string[];
  repeatedConfessions: string[];
  warnings: string[];
}

export interface ReaderAddictionMetrics {
  hookStrength: number;
  curiosityDensity: number;
  retentionRisk: "low" | "medium" | "high";
  compulsiveReadability: number;
  belowThreshold: boolean;
}

export interface DevelopmentalEditorReport {
  score: number;
  issues: Array<{ priority: "high" | "medium" | "low"; area: string; message: string }>;
  surgicalFixes: string[];
}

export interface NarrativeBrainV3Context {
  config: BookConfig;
  chapterIndex: number;
  outlineSummary: string;
  outlineTitle: string;
  previousChapters: Chapter[];
  longBookMemory?: LongBookMemorySnapshot | null;
  masterpieceMode?: boolean;
}

export interface CharacterDialogueDirective {
  name: string;
  dominantFear: string;
  dominantDesire: string;
  dominantWound: string;
  defenseMechanism: string;
  selfDeception: string;
  emotionalTriggers: string[];
  dialogueStyle: string;
  forbiddenDialogue: string[];
}

export type { CharacterPsychologyProfile };
