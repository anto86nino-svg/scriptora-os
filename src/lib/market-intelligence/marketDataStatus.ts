/**
 * Shared data-honesty labels for market / title / KDP intelligence UI.
 */
export type MarketDataStatus = "live" | "estimated" | "example" | "unavailable";

export function marketDataStatusLabelKey(status: MarketDataStatus): string {
  return `market_data_status_${status}_label`;
}

export function marketDataStatusDescriptionKey(status: MarketDataStatus): string {
  return `market_data_status_${status}_desc`;
}

/** Edge function succeeded with external grounding (Brave, etc.). */
export function statusFromGrounding(groundingUsed?: boolean): MarketDataStatus {
  return groundingUsed ? "live" : "estimated";
}

/** Title Intelligence: local editorial fallback after API miss. */
export function statusFromTitleFallback(fallbackReason?: string | null): MarketDataStatus {
  return fallbackReason ? "estimated" : "live";
}

/** Bestseller Radar search outcome. */
export function statusFromRadarSearch(input: {
  searched: boolean;
  hasLiveResults: boolean;
  hasError: boolean;
}): MarketDataStatus {
  if (!input.searched) return "example";
  if (input.hasError || !input.hasLiveResults) return "unavailable";
  return "live";
}

/** Premium intel derived locally from text heuristics (not external API). */
export function statusForLocalMarketIntel(): MarketDataStatus {
  return "estimated";
}
