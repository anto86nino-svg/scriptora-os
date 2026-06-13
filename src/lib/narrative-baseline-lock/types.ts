import type { BookConfig } from "@/types/book";

export type BaselineGenreId =
  | "gothic-thriller"
  | "romance-slow-burn"
  | "fantasy"
  | "thriller"
  | "self-help"
  | "study-book"
  | "manual"
  | "memoir";

export interface BaselineGenreFixture {
  id: BaselineGenreId;
  label: string;
  config: BookConfig;
  sampleText: string;
  weakText: string;
}

export interface NarrativeBaselineMetrics {
  aiSmell: number;
  dialogueHumanity: number;
  therapySpeech: number;
  emotionalPacing: number;
  hookStrength: number;
  memorability: number;
  coherence: number;
  genreAlignment: number;
  compulsiveReadability: number;
  composite: number;
}

export interface NarrativeBaselineSnapshot {
  version: 1;
  tag: "scriptora-narrative-baseline-v1";
  evaluatedAt: string;
  genre: BaselineGenreId;
  metrics: NarrativeBaselineMetrics;
}

export interface CrossGenreStabilityReport {
  stable: boolean;
  regressions: Array<{ genre: BaselineGenreId; baseline: number; current: number; drop: number }>;
  message: string;
}

export type OverOptimizationReport = import("./over-optimization-guard").OverOptimizationReport;

export interface LongFormStabilityReport {
  chaptersSimulated: number;
  characterDriftRisk: number;
  relationshipResetRisk: number;
  pacingCollapseRisk: number;
  repeatedBeatRisk: number;
  forgottenPromiseRisk: number;
  styleInstabilityRisk: number;
  stable: boolean;
  issues: string[];
}

export type NarrativeReadinessLevel = "frozen" | "stable" | "at-risk" | "unstable";
