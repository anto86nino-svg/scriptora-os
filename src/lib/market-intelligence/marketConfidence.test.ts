import { describe, expect, it } from "vitest";
import {
  confidenceForLocalIntel,
  confidenceFromGrounding,
  confidenceFromRadar,
  confidenceFromTitleIntelligence,
  resolveMarketConfidence,
} from "@/lib/market-intelligence/marketConfidence";

describe("resolveMarketConfidence", () => {
  it("returns null for unavailable", () => {
    expect(resolveMarketConfidence({ dataStatus: "unavailable" })).toBeNull();
  });

  it("returns exploratory for example", () => {
    expect(resolveMarketConfidence({ dataStatus: "example" })).toBe("exploratory");
  });

  it("returns medium for estimated with moderate signals", () => {
    expect(
      resolveMarketConfidence({
        dataStatus: "estimated",
        signalStrength: "partial",
        datasetRichness: "moderate",
      }),
    ).toBe("medium");
  });

  it("returns exploratory for estimated with fallback", () => {
    expect(
      resolveMarketConfidence({
        dataStatus: "estimated",
        fallbackReason: "edge timeout",
      }),
    ).toBe("exploratory");
  });

  it("returns high for live + strong consistent signals", () => {
    expect(
      resolveMarketConfidence({
        dataStatus: "live",
        groundingUsed: true,
        signalStrength: "strong",
        signalConsistency: "consistent",
        datasetRichness: "rich",
      }),
    ).toBe("high");
  });

  it("returns medium for live + partial signals", () => {
    expect(
      resolveMarketConfidence({
        dataStatus: "live",
        groundingUsed: true,
        signalStrength: "partial",
        signalConsistency: "mixed",
      }),
    ).toBe("medium");
  });
});

describe("confidence helpers", () => {
  it("title intelligence live with strong titles → high or medium", () => {
    const level = confidenceFromTitleIntelligence({
      dataStatus: "live",
      topTitles: [
        { opportunityScore: 88, conversionScore: 90 },
        { opportunityScore: 85, conversionScore: 87 },
        { opportunityScore: 82, conversionScore: 84 },
        { opportunityScore: 80, conversionScore: 81 },
      ],
      coreKeywords: [{}, {}, {}],
      marketSnapshot: { topSubNiches: [{}, {}] },
    });
    expect(level).toBe("high");
  });

  it("title intelligence fallback → exploratory", () => {
    const level = confidenceFromTitleIntelligence({
      dataStatus: "estimated",
      fallbackReason: "timeout",
      topTitles: [{ opportunityScore: 80, conversionScore: 80 }],
    });
    expect(level).toBe("exploratory");
  });

  it("radar with many results → high", () => {
    expect(
      confidenceFromRadar({
        dataStatus: "live",
        resultCount: 6,
        marketScore: 75,
      }),
    ).toBe("high");
  });

  it("grounding without items → exploratory or medium", () => {
    const level = confidenceFromGrounding({
      dataStatus: "estimated",
      groundingUsed: false,
      itemCount: 0,
    });
    expect(level).toBe("exploratory");
  });

  it("local intel is always exploratory", () => {
    expect(confidenceForLocalIntel()).toBe("exploratory");
  });
});
