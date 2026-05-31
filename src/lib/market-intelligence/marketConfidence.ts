import type { MarketDataStatus } from "@/lib/market-intelligence/marketDataStatus";

/** Deterministic editorial confidence — not a probability score. */
export type MarketConfidenceLevel = "high" | "medium" | "exploratory";

export type SignalStrength = "strong" | "partial" | "weak";
export type SignalConsistency = "consistent" | "mixed" | "conflicting";
export type DatasetRichness = "rich" | "moderate" | "sparse";

export interface MarketConfidenceInput {
  dataStatus: MarketDataStatus;
  groundingUsed?: boolean;
  fallbackReason?: string | null;
  signalStrength?: SignalStrength;
  signalConsistency?: SignalConsistency;
  datasetRichness?: DatasetRichness;
}

export function marketConfidenceLabelKey(level: MarketConfidenceLevel): string {
  return `market_confidence_${level}_label`;
}

export function marketConfidenceMicrocopyKey(level: MarketConfidenceLevel): string {
  return `market_confidence_${level}_microcopy`;
}

/** Returns null when confidence cannot be assigned (e.g. unavailable). */
export function resolveMarketConfidence(input: MarketConfidenceInput): MarketConfidenceLevel | null {
  const {
    dataStatus,
    groundingUsed = false,
    fallbackReason,
    signalStrength = "partial",
    signalConsistency = "mixed",
    datasetRichness = "moderate",
  } = input;

  if (dataStatus === "unavailable") return null;

  if (dataStatus === "example") return "exploratory";

  if (dataStatus === "estimated") {
    if (fallbackReason || signalConsistency === "conflicting" || datasetRichness === "sparse" || signalStrength === "weak") {
      return "exploratory";
    }
    return "medium";
  }

  // live
  if (groundingUsed && signalStrength === "strong" && signalConsistency === "consistent" && datasetRichness !== "sparse") {
    return "high";
  }

  if (groundingUsed && (signalStrength === "partial" || signalConsistency === "mixed" || datasetRichness === "moderate")) {
    return "medium";
  }

  if (groundingUsed) return "medium";

  return "exploratory";
}

function avgScore(scores: number[]): number {
  if (!scores.length) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function scoreToStrength(avg: number, count: number): SignalStrength {
  if (count >= 4 && avg >= 78) return "strong";
  if (count >= 2 && avg >= 60) return "partial";
  return "weak";
}

function levelsToConsistency(levels: string[]): SignalConsistency {
  if (levels.length <= 1) return "consistent";
  const unique = new Set(levels);
  if (unique.size === 1) return "consistent";
  if (unique.size >= 3) return "conflicting";
  return "mixed";
}

function countToRichness(count: number): DatasetRichness {
  if (count >= 5) return "rich";
  if (count >= 2) return "moderate";
  return "sparse";
}

/** Title Intelligence confidence from result shape. */
export function confidenceFromTitleIntelligence(input: {
  dataStatus: MarketDataStatus;
  fallbackReason?: string | null;
  topTitles?: Array<{ opportunityScore: number; conversionScore: number }>;
  coreKeywords?: unknown[];
  marketSnapshot?: { topSubNiches?: unknown[] } | null;
}): MarketConfidenceLevel | null {
  const titles = input.topTitles ?? [];
  const scores = titles.flatMap((t) => [t.opportunityScore, t.conversionScore]);
  const avg = avgScore(scores);
  const nicheCount = input.marketSnapshot?.topSubNiches?.length ?? 0;
  const keywordCount = input.coreKeywords?.length ?? 0;
  const richness = countToRichness(titles.length + nicheCount + keywordCount);

  const demandLevels = titles.map(() => "medium");
  return resolveMarketConfidence({
    dataStatus: input.dataStatus,
    fallbackReason: input.fallbackReason,
    groundingUsed: input.dataStatus === "live",
    signalStrength: input.fallbackReason ? "weak" : scoreToStrength(avg, titles.length),
    signalConsistency: input.fallbackReason ? "mixed" : levelsToConsistency(demandLevels),
    datasetRichness: richness,
  });
}

/** Bestseller Radar confidence from search outcome. */
export function confidenceFromRadar(input: {
  dataStatus: MarketDataStatus;
  resultCount?: number;
  marketScore?: number | null;
}): MarketConfidenceLevel | null {
  const count = input.resultCount ?? 0;
  const score = input.marketScore ?? 0;
  const strength: SignalStrength =
    count >= 5 && score >= 70 ? "strong" : count >= 2 ? "partial" : "weak";

  return resolveMarketConfidence({
    dataStatus: input.dataStatus,
    groundingUsed: input.dataStatus === "live",
    signalStrength: strength,
    signalConsistency: count >= 3 ? "consistent" : count >= 1 ? "mixed" : "conflicting",
    datasetRichness: countToRichness(count),
  });
}

/** KDP / grounding-backed tools. */
export function confidenceFromGrounding(input: {
  dataStatus: MarketDataStatus;
  groundingUsed?: boolean;
  fallbackReason?: string | null;
  itemCount?: number;
  avgScore?: number;
}): MarketConfidenceLevel | null {
  const count = input.itemCount ?? 0;
  const avg = input.avgScore ?? 0;

  return resolveMarketConfidence({
    dataStatus: input.dataStatus,
    groundingUsed: input.groundingUsed,
    fallbackReason: input.fallbackReason,
    signalStrength: input.groundingUsed
      ? scoreToStrength(avg, count)
      : "weak",
    signalConsistency: count >= 3 ? "consistent" : count >= 1 ? "mixed" : "conflicting",
    datasetRichness: countToRichness(count),
  });
}

/** Local heuristic intel (premium scores derived from text). */
export function confidenceForLocalIntel(): MarketConfidenceLevel {
  return "exploratory";
}
