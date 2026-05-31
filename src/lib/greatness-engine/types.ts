export const GREATNESS_ENGINE_VERSION = "scriptora-greatness-engine-v1";

export const GREATNESS_ELEVATION_FLOOR = 70;

export type GreatnessLevel = "weak" | "good" | "strong" | "memorable" | "iconic";

export type SceneElevationOpportunity = {
  sceneIndex: number;
  original: string;
  suggested: string;
  reason: string;
  dimension: "visual" | "tension" | "uniqueness" | "emotion" | "pace";
};

export type SceneElevationReport = {
  sceneCount: number;
  weakScenes: number;
  opportunities: SceneElevationOpportunity[];
  averageScenePower: number;
  passesGate: boolean;
};

export type MemorabilityReport = {
  memorableMoments: string[];
  sceneSignature: string[];
  readerRecallScore: number;
  quotableLines: string[];
  passesGate: boolean;
  warnings: string[];
};

export type CinematicImageryReport = {
  visualClarity: number;
  sensoryPresence: number;
  sceneAnchoring: number;
  concreteNounRatio: number;
  passesGate: boolean;
};

export type BingeabilityReport = {
  pageTurnPressure: number;
  curiosityMomentum: number;
  narrativePull: number;
  compulsiveReadability: number;
  passesGate: boolean;
  warnings: string[];
};

export type HookIntensityReport = {
  openingHook: number;
  midpointHook: number;
  closingHook: number;
  openingExcerpt: string;
  closingExcerpt: string;
  passesGate: boolean;
};

export type EmotionalResonanceReport = {
  persistenceScore: number;
  concreteBeats: number;
  toldEmotionRatio: number;
  echoStrength: number;
  passesGate: boolean;
  warnings: string[];
};

export type GreatnessDimensions = {
  memorability: number;
  scenePower: number;
  readerRecall: number;
  visualStrength: number;
  emotionalResonance: number;
  bingeability: number;
  hookIntensity: number;
  narrativeMomentum: number;
};

export type GreatnessScore = {
  version: typeof GREATNESS_ENGINE_VERSION;
  composite: number;
  level: GreatnessLevel;
  dimensions: GreatnessDimensions;
  passesElevation: boolean;
  warnings: string[];
};

export type GreatnessAnalysisSnapshot = {
  version: typeof GREATNESS_ENGINE_VERSION;
  evaluatedAt: string;
  sceneElevation: SceneElevationReport;
  memorability: MemorabilityReport;
  cinematicImagery: CinematicImageryReport;
  bingeability: BingeabilityReport;
  hookIntensity: HookIntensityReport;
  emotionalResonance: EmotionalResonanceReport;
  greatnessScore: GreatnessScore;
};

export type ElevationPassResult = {
  content: string;
  rewritten: boolean;
  elevatesApplied: number;
  beforeScore: GreatnessScore;
  afterScore: GreatnessScore;
  analysis: GreatnessAnalysisSnapshot;
};
