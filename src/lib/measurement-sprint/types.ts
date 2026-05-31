export type WeaknessSeverity = "critical" | "high" | "medium";

export type WeaknessEntry = {
  id: string;
  pillar: string;
  genre?: string;
  severity: WeaknessSeverity;
  metric: string;
  value: number;
  threshold: number;
  gap: number;
  message: string;
  fixHint: string;
};

export type RealBookBenchmarkRow = {
  projectId: string;
  title: string;
  category: string;
  supremeComposite: number;
  greatnessComposite: number;
  narrativeMagicComposite: number;
  rubricComposite: number;
  criticalIssues: number;
  passesPreDelivery: boolean;
};

export type BlindTestSummary = {
  total: number;
  scriptoraWins: number;
  scriptoraWinRate: number;
  rank1Rate: number;
  avgMarginVsGeneric: number;
  avgMarginVsClaude: number;
  claudeBeatsScriptoraCount: number;
  lossesByCategory: Array<{ category: string; scriptoraRank: number; marginVsClaude: number }>;
};

export type BestsellerComparisonRow = {
  genreKey: string;
  scriptoraHook: number;
  scriptoraBinge: number;
  genericHook: number;
  genericBinge: number;
  claudeHook: number;
  claudeBinge: number;
  hookGapVsBest: number;
  bingeGapVsBest: number;
};

export type ReaderRetentionRow = {
  source: string;
  genre?: string;
  curiosity: number;
  retention: number;
  wouldContinue: boolean;
  abandonmentRisk: string;
  passesGate: boolean;
};

export type EditorialExpertRow = {
  source: string;
  genre?: string;
  rubricComposite: number;
  weakestDimension: string;
  weakestScore: number;
  tier: string;
};

export type GenreStressResult = {
  genre: "romance" | "thriller" | "fantasy" | "self-help";
  chapterCount: number;
  avgSupreme: number;
  avgGreatness: number;
  avgNarrativeMagic: number;
  totalCriticalIssues: number;
  preDeliveryPassRate: number;
  topWeaknesses: string[];
  chaptersFailingRetention: number;
};

export type MeasurementSprintReport = {
  version: 1;
  sprintId: "scriptora-measurement-sprint-v1";
  generatedAt: string;
  mode: "measure-only";
  realBookBenchmark: RealBookBenchmarkRow[];
  blindTest: BlindTestSummary;
  bestsellerComparison: BestsellerComparisonRow[];
  readerRetention: ReaderRetentionRow[];
  editorialExpert: EditorialExpertRow[];
  genreStress: GenreStressResult[];
  weaknesses: WeaknessEntry[];
  weaknessSummary: {
    critical: number;
    high: number;
    medium: number;
    topAreas: string[];
  };
  markdown: string;
};

export const MEASUREMENT_THRESHOLDS = {
  supreme: 75,
  greatness: 80,
  narrativeMagic: 75,
  rubricComposite: 7.5,
  rubricDimension: 7.0,
  readerRetention: 50,
  readerCuriosity: 42,
  hookStrength: 52,
  bingeability: 46,
  preDeliveryPass: true,
} as const;
