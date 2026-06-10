import type { BookProject, SectionId } from "@/types/book";

export type MollyBrainMood = "sleeping" | "observing" | "writing" | "analyzing" | "worried" | "happy";

export type MollyAppContext = "writing" | "generating" | "market" | "study" | "voice" | "export";

export type MollyQuickActionId =
  | "more_human"
  | "more_friction"
  | "more_subtext"
  | "more_tension"
  | "more_suspense"
  | "cliffhanger"
  | "more_danger"
  | "slow_burn"
  | "more_desire_held"
  | "reduce_confessions"
  | "more_clarity"
  | "more_authoritative"
  | "more_engaging"
  | "reduce_repetition"
  | "reduce_ai_feeling"
  | "more_natural"
  | "strengthen_hook"
  | "more_bingeability"
  | "more_immersion"
  | "more_emotion"
  | "more_commercial";

export interface MollyQuickAction {
  id: MollyQuickActionId;
  label: string;
}

export interface MollyBrainScore {
  narrativeQuality: number;
  immersion: number;
  humanAuthenticity: number;
  readerDropRisk: number;
  commercialStrength: number;
  repetitionRisk: number;
  emotionalRealism: number;
  composite: number;
}

export interface MollyBrainInsight {
  id: string;
  comic: string;
  trigger: string;
  actions: MollyQuickAction[];
  priority: "low" | "medium" | "high";
  mood: MollyBrainMood;
  score: MollyBrainScore;
}

export interface MollyBrainAnalyzeInput {
  project: BookProject;
  activeSection: SectionId | null;
  appContext?: MollyAppContext;
  studyText?: string;
  voiceFeedback?: string;
}

export interface MollyBrainActionContext {
  project: BookProject;
  chapterIndex: number;
  subIndex?: number | null;
  text: string;
}

export interface MollyBrainActionResult {
  text: string;
  changed: boolean;
  changePercent: number;
  memoryNote?: string;
}
