import { describe, expect, it } from "vitest";
import {
  containsForbiddenMarketCopy,
  normalizeMarketCopy,
} from "@/lib/market-intelligence/marketCopyNormalizer";

describe("normalizeMarketCopy", () => {
  it("softens absolute performance claims", () => {
    expect(normalizeMarketCopy("This title will perform strongly.")).toBe(
      "This title shows promising commercial characteristics.",
    );
  });

  it("replaces trending keyword phrasing", () => {
    expect(normalizeMarketCopy("Trending keyword in self-help")).toBe(
      "Keyword showing positive editorial signals in self-help",
    );
  });

  it("replaces strong market opportunity", () => {
    expect(normalizeMarketCopy("Strong market opportunity here")).toBe(
      "Potential opportunity based on detected patterns here",
    );
  });

  it("replaces high-converting niche", () => {
    expect(normalizeMarketCopy("High-converting niche for planners")).toBe(
      "Niche with encouraging editorial indicators for planners",
    );
  });

  it("removes guaranteed wording", () => {
    const out = normalizeMarketCopy("Guaranteed bestseller success");
    expect(out.toLowerCase()).not.toContain("guaranteed");
    expect(containsForbiddenMarketCopy(out)).toBe(false);
  });

  it("leaves neutral copy unchanged", () => {
    const neutral = "Editorial signals suggest moderate alignment.";
    expect(normalizeMarketCopy(neutral)).toBe(neutral);
  });
});
