export interface GreatnessChapterScores {
  hookPower: number;
  endingMagnetism: number;
  memorability: number;
  compulsiveReadability: number;
  emotionalAftertaste: number;
  sceneImpactAverage: number;
  marketWinnerLite: number;
  overall: number;
}

export interface SceneImpactScore {
  sceneIndex: number;
  excerpt: string;
  memorability: number;
  emotionalWeight: number;
  tension: number;
  pageTurningPower: number;
  uniqueness: number;
  payoffValue: number;
  average: number;
  weak: boolean;
  microSurgery?: string;
}

export interface GreatnessChapterReport {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  scores: GreatnessChapterScores;
  scenes: SceneImpactScore[];
  optimizations: string[];
  microSurgeries: string[];
  genreMode: string;
}

export type MarketWinnerMode =
  | "emotional_addiction"
  | "compulsive_mystery"
  | "wonder_momentum"
  | "actionable_momentum"
  | "commercial_narrative";
