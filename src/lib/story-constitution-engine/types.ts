import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { MemoryGraphSnapshot } from "@/lib/memory-graph/types";
import type { StoryConstitutionPhase } from "./phases";

export type StoryConstitutionRuleId =
  | "scene_purpose_lock"
  | "consequence_chain"
  | "character_truth"
  | "canon_supremacy"
  | "anti_repetition"
  | "emotional_truth"
  | "page_turn_check"
  | "reader_attention"
  | "remove_dead_scenes"
  | "story_momentum"
  | "character_evolution"
  | "payoff_engine"
  | "genre_truth_lock"
  | "ending_destination_lock";

export type ConstitutionSeverity = "info" | "warning" | "critical";

export type ConstitutionWarning = {
  ruleId: StoryConstitutionRuleId;
  severity: ConstitutionSeverity;
  message: string;
  suggestion?: string;
};

export type ReaderMomentumScores = {
  readerMomentumScore: number;
  readerCuriosityScore: number;
  readerEmotionalScore: number;
  readerRetentionScore: number;
};

export type StoryConstitutionContext = {
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  previousChapters: Chapter[];
  chapterIndex: number;
  outlineSummary?: string;
  memoryGraph?: MemoryGraphSnapshot | null;
  priorText?: string;
  /** Override rollout phase (defaults to SCE_CURRENT_PHASE) */
  phase?: StoryConstitutionPhase;
};

export type SCEInterventionReport = {
  phase: StoryConstitutionPhase;
  measureOnly: boolean;
  interventionsApplied: StoryConstitutionRuleId[];
  optimizationsApplied: StoryConstitutionRuleId[];
  textModified: boolean;
};

export type NarrativeDirectorV2Result = {
  score: number;
  warnings: ConstitutionWarning[];
  directives: string[];
};

export type StoryConstitutionAnalysis = {
  constitutionScore: number;
  warnings: ConstitutionWarning[];
  readerScores: ReaderMomentumScores;
  director: NarrativeDirectorV2Result;
  passed: boolean;
  retryHints: string[];
  phase: StoryConstitutionPhase;
  measureOnly: boolean;
};

export type EditorialPassSupremeResult = {
  text: string;
  analysis: StoryConstitutionAnalysis;
  polished: boolean;
  interventionReport: SCEInterventionReport;
};
