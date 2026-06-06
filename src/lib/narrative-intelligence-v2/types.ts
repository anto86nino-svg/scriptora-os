export type CoreWound =
  | "abandonment"
  | "betrayal"
  | "shame"
  | "rejection"
  | "control"
  | "inadequacy"
  | "loss"
  | "unknown";

export type CopingMechanism =
  | "sarcasm"
  | "avoidance"
  | "anger"
  | "perfectionism"
  | "detachment"
  | "people-pleasing"
  | "control"
  | "unknown";

export interface CharacterPsychologyProfile {
  name: string;
  role?: string;
  coreWound: CoreWound;
  woundLabel: string;
  fear: string;
  desire: string;
  copingMechanism: CopingMechanism;
  copingLabel: string;
  contradiction: string;
  behavioralDirectives: string[];
  forbiddenPatterns: string[];
  confidence: "low" | "medium" | "high";
  source: "blueprint" | "config" | "inferred";
  lastUpdatedChapter?: number;
}

export type ScenePurpose =
  | "tension"
  | "reveal"
  | "emotional_progression"
  | "plot_progression"
  | "foreshadowing"
  | "romance_escalation"
  | "conflict"
  | "world_building"
  | "mystery"
  | "emotional_recovery"
  | "pacing_relief"
  | "character_transformation"
  | "instruction"
  | "unclear";

export interface ScenePurposeEntry {
  sceneIndex: number;
  wordCount: number;
  excerpt: string;
  purposes: ScenePurpose[];
  primaryPurpose: ScenePurpose;
  health: "strong" | "adequate" | "weak";
  issue?: string;
  recommendation?: string;
}

export interface ChapterScenePurposeSnapshot {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  overallHealth: "healthy" | "at-risk" | "weak";
  scenes: ScenePurposeEntry[];
  warnings: string[];
  recommendations: string[];
}

export interface ReaderEmotionSnapshot {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  curiosity: number;
  emotionalTension: number;
  confusion: number;
  emotionalPayoff: number;
  boredomRisk: number;
  obsessionPotential: number;
  emotionalFatigue: number;
  compulsiveReadability: number;
  dominantReaderState: string;
  whySummary: string[];
  genreAdjustedNote?: string;
}

export type ReaderEmotionLevel = "low" | "medium" | "high";

export interface ReaderEmotionDisplayRow {
  label: string;
  score: number;
  level: ReaderEmotionLevel;
}
