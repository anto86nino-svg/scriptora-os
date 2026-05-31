import { describe, expect, it } from "vitest";
import {
  marketDataStatusDescriptionKey,
  marketDataStatusLabelKey,
  statusFromGrounding,
  statusFromRadarSearch,
  statusFromTitleFallback,
} from "@/lib/market-intelligence/marketDataStatus";

describe("marketDataStatus", () => {
  it("maps status to i18n label keys", () => {
    expect(marketDataStatusLabelKey("live")).toBe("market_data_status_live_label");
    expect(marketDataStatusLabelKey("estimated")).toBe("market_data_status_estimated_label");
    expect(marketDataStatusDescriptionKey("example")).toBe("market_data_status_example_desc");
  });

  it("title intelligence fallback → estimated", () => {
    expect(statusFromTitleFallback(undefined)).toBe("live");
    expect(statusFromTitleFallback("any reason")).toBe("estimated");
  });

  it("radar initial state → example; failed search → unavailable", () => {
    expect(statusFromRadarSearch({ searched: false, hasLiveResults: false, hasError: false })).toBe(
      "example",
    );
    expect(statusFromRadarSearch({ searched: true, hasLiveResults: false, hasError: true })).toBe(
      "unavailable",
    );
    expect(statusFromRadarSearch({ searched: true, hasLiveResults: true, hasError: false })).toBe(
      "live",
    );
  });

  it("grounding flag maps to live vs estimated", () => {
    expect(statusFromGrounding(true)).toBe("live");
    expect(statusFromGrounding(false)).toBe("estimated");
  });
});
