/**
 * KDP Money Engine — backend client.
 *
 * Talks to /functions/v1/kdp-money-engine which routes to DeepSeek (and, when
 * the Perplexity connector is linked server-side, augments with web grounding).
 *
 * UX framing: this module powers "creating a product that sells", not "writing".
 */

import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/plan";

/* ============ Types ============ */

export type Level = "low" | "medium" | "high";

/** Web grounding metadata, attached to handlers that consult Brave Search. */
export interface GroundingMeta {
  groundingUsed?: boolean;
  groundingProvider?: "brave" | null;
  groundingResultsCount?: number;
  groundingQuery?: string | null;
  analyzedAt?: string;
}

export interface MarketAnalysis extends GroundingMeta {
  nicheScore: number;            // 0-10
  demandLevel: Level;
  competitionLevel: Level;
  profitabilityScore: number;    // 0-10
  recommendedAngle: string;
  subNiche?: string;
  reasoning?: string;
}

export interface BookData {
  title: string;
  subtitle?: string;
  promise?: string;
  genre?: string;
  language?: string;
  outline?: { title: string; summary?: string }[];
}

export interface SuccessPrediction {
  successScore: number;           // 0-100
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
}

export interface TitleVariants extends GroundingMeta {
  titles: string[];               // 15
  subtitles: string[];            // 15
  topPicks: { title: string; subtitle: string; reason: string }[]; // 3
}

export interface CoverIntelligence {
  visualStyle: string;
  palette: string[];              // hex codes
  fonts: { heading: string; body: string };
  mood: string;
  composition: string;
}

export interface KDPPackaging extends GroundingMeta {
  amazonDescription: string;      // HTML-light, conversion-optimised
  backendKeywords: string[];      // 7 max, KDP rules
  categories: string[];           // 2-3 KDP browse paths
  bulletPoints: string[];         // 5 sales bullets
}

/* ============ Title Domination ============ */

export interface DominateTitlesInput {
  idea: string;
  genre?: string;
  language?: string;
  marketplace?: "amazon.com" | "amazon.it" | "amazon.co.uk" | string;
  bookType?: string;
  targetReader?: string;
  mainProblem?: string;
  desiredPromise?: string;
  titleTone?: "emotional" | "premium" | "direct" | "provocative" | "elegant" | "viral" | "practical" | string;
}

export interface TitleCandidate {
  title: string;
  subtitle: string;
  positioning: string;
  targetReader: string;
  mainKeyword: string;
  secondaryKeywords: string[];
  emotionalHook: string;
  commercialPromise: string;
  differentiationAngle: string;
  kdpScore: number;
  clarityScore: number;
  emotionScore: number;
  keywordScore: number;
  originalityScore: number;
  saturationRisk: "low" | "medium" | "high";
  whyItCanSell: string;
  weakness: string;
  improvementSuggestion: string;
}

export interface TitleDominationResult extends GroundingMeta {
  groundingQueries?: string[];
  marketSignals: {
    dominantKeywords: string[];
    recurringPromises: string[];
    competitorPatterns: string[];
    saturatedAngles: string[];
    openAngles: string[];
    readerPainPoints: string[];
    emotionalTriggers: string[];
  };
  competitorInsights: Array<{
    titleSignal: string;
    source: string;
    whyItMatters: string;
    riskLevel: "low" | "medium" | "high";
  }>;
  titleCandidates: TitleCandidate[];
  winner: {
    title: string;
    subtitle: string;
    reason: string;
    bestMarketplace: string;
    finalScore: number;
  };
  nextActions: string[];
}

/* ============ Trending Niches (multi-market playlist) ============ */

export interface TrendingNiche {
  name: string;
  parentGenre: string;
  marketplace: "amazon.com" | "amazon.it" | "apple-books" | "cross-market";
  demandLevel: Level;
  competitionLevel: Level;
  opportunityScore: number; // 0-100
  trendDirection: "rising" | "stable" | "declining";
  dominantPromise: string;
  targetReader: string;
  suggestedAngle: string;
  dominantKeywords: string[];
  whyItMatters: string;
  saturationRisk: "low" | "medium" | "high";
}

export interface TrendingNichesResult extends GroundingMeta {
  groundingQueries?: string[];
  marketplaces: string[];
  marketOverview: string;
  niches: TrendingNiche[];
}

export interface TrendingNichesInput {
  language?: string;
  focus?: string;
  marketplaces?: Array<"amazon.com" | "amazon.it" | "apple-books">;
  seed?: number;
}

/* ============ Action union ============ */

type Action =
  | { kind: "analyzeMarket"; idea: string; genre?: string; language?: string }
  | { kind: "predictSuccess"; book: BookData }
  | {
      kind: "generateTitleVariants";
      idea: string;
      genre?: string;
      language?: string;
      subNiche?: string;
      recommendedAngle?: string;
      keywords?: string[];
    }
  | { kind: "coverIntelligence"; genre: string; mood?: string; language?: string }
  | { kind: "kdpPackaging"; book: BookData }
  | ({ kind: "dominateTitles" } & DominateTitlesInput)
  | ({ kind: "trendingNiches" } & TrendingNichesInput);

async function invoke<T>(action: Action, plan: PlanTier): Promise<T> {
  const { data, error } = await supabase.functions.invoke("kdp-money-engine", {
    body: { action: action.kind, payload: action, plan },
  });
  if (error) throw new Error(error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

/* ============ Public API ============ */

export async function analyzeMarket(
  idea: string,
  opts: { genre?: string; language?: string; plan: PlanTier },
): Promise<MarketAnalysis> {
  return invoke<MarketAnalysis>(
    { kind: "analyzeMarket", idea, genre: opts.genre, language: opts.language },
    opts.plan,
  );
}

export async function predictSuccess(book: BookData, plan: PlanTier): Promise<SuccessPrediction> {
  return invoke<SuccessPrediction>({ kind: "predictSuccess", book }, plan);
}

export async function generateTitleVariants(
  idea: string,
  opts: {
    genre?: string;
    language?: string;
    plan: PlanTier;
    subNiche?: string;
    recommendedAngle?: string;
    keywords?: string[];
  },
): Promise<TitleVariants> {
  return invoke<TitleVariants>(
    {
      kind: "generateTitleVariants",
      idea,
      genre: opts.genre,
      language: opts.language,
      subNiche: opts.subNiche,
      recommendedAngle: opts.recommendedAngle,
      keywords: opts.keywords,
    },
    opts.plan,
  );
}

export async function coverIntelligence(
  opts: { genre: string; mood?: string; language?: string; plan: PlanTier },
): Promise<CoverIntelligence> {
  return invoke<CoverIntelligence>(
    { kind: "coverIntelligence", genre: opts.genre, mood: opts.mood, language: opts.language },
    opts.plan,
  );
}

export async function kdpPackaging(book: BookData, plan: PlanTier): Promise<KDPPackaging> {
  return invoke<KDPPackaging>({ kind: "kdpPackaging", book }, plan);
}

export async function dominateTitles(
  input: DominateTitlesInput,
  plan: PlanTier,
): Promise<TitleDominationResult> {
  return invoke<TitleDominationResult>({ kind: "dominateTitles", ...input }, plan);
}

export async function fetchTrendingNiches(
  input: TrendingNichesInput,
  plan: PlanTier,
): Promise<TrendingNichesResult> {
  return invoke<TrendingNichesResult>({ kind: "trendingNiches", ...input }, plan);
}

/* ============ UX score helpers ============ */

export function bestsellerProbabilityLabel(score: number): { label: string; tone: "low" | "mid" | "high" } {
  if (score >= 80) return { label: "Bestseller potential 🔥", tone: "high" };
  if (score >= 60) return { label: "Solid product", tone: "mid" };
  return { label: "Needs sharpening", tone: "low" };
}

export function profitabilityLabel(score: number): { label: string; tone: "low" | "mid" | "high" } {
  if (score >= 8) return { label: "High profitability", tone: "high" };
  if (score >= 5.5) return { label: "Decent margin", tone: "mid" };
  return { label: "Low margin niche", tone: "low" };
}
