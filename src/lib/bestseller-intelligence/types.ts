/**
 * bestseller-intelligence/types.ts
 * Shared type definitions for the bestseller scoring pipeline.
 */

export type BestsellerGrade = "bestseller" | "strong" | "developing" | "weak";

export type BestsellerConfidence = "high" | "medium" | "low";

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

export interface BestsellerEvaluationInput {
  content: string;
  chapterIndex: number;
  totalChapters?: number;
  genre?: string;
  bookIntelligence?: {
    layers?: {
      writingBrainId?: string;
      domain?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface BestsellerChapterSnapshot {
  version: number;
  chapterIndex: number;
  evaluatedAt: string;
  scores: BestsellerScoreBreakdown;
  grade: BestsellerGrade;
  confidence: BestsellerConfidence;
  risks: string[];
  strengths: string[];
  optimizations: string[];
}
