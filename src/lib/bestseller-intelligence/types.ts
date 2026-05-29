export type BestsellerGrade = "weak" | "developing" | "strong" | "bestseller";
export type BestsellerConfidence = "low" | "medium" | "high";

export interface BestsellerScoreBreakdown {
  hookStrength: number;
  bingeability: number;
  readerRetention: number;
  emotionalMomentum: number;
  bookTokIntensity: number;
  compulsiveReadability: number;
  commercialPacing: number;
  overall: number;
}

export interface BestsellerChapterSnapshot {
  version: 2;
  chapterIndex: number;
  evaluatedAt: string;
  scores: BestsellerScoreBreakdown;
  grade: BestsellerGrade;
  confidence: BestsellerConfidence;
  risks: string[];
  strengths: string[];
  optimizations: string[];
}

export interface BestsellerEvaluationInput {
  content: string;
  chapterIndex: number;
  totalChapters?: number;
  chapterTitle?: string;
  genre?: string;
  bookIntelligence?: {
    layers?: {
      writingBrainId?: string;
      domain?: string;
      bestsellerMode?: string;
    };
  };
}
