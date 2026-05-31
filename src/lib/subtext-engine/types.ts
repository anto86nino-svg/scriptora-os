export type SubtextMetric = {
  explainedEmotion: number;
  directEmotionalStatements: number;
  emotionalMonologues: number;
  showDontTellRatio: number;
};

export type SubtextAnalysis = {
  version: 1;
  chapterIndex: number;
  evaluatedAt: string;
  metrics: SubtextMetric;
  subtextScore: number;
  weakPassages: string[];
  passesGate: boolean;
};
