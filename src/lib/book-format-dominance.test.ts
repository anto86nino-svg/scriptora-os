import { describe, expect, it } from "vitest";
import { applyFormatDominance, assertFormatIntegrity, resolveDominantFormat } from "@/lib/book-format-dominance";

describe("book-format-dominance", () => {
  it("locks cookbook as dominant over conflicting genre labels", () => {
    const resolved = resolveDominantFormat({
      bookFormat: "cookbook",
      genre: "philosophy",
      subgenre: "literary-fiction",
    });
    expect(resolved.dominantFormat).toBe("cookbook");
    expect(resolved.source).toBe("bookFormat");
  });

  it("applies hard fields for cookbook dominance", () => {
    const next = applyFormatDominance({
      bookFormat: "cookbook",
      genre: "philosophy",
      bookTypeId: "cookbook",
    });
    expect(next.genre).toBe("cookbook");
    expect(next.family).toBe("cookbook");
    expect(next.brain).toBe("cookbook-brain");
    expect(next.blueprintType).toBe("CookbookBlueprint");
  });

  it("reports integrity errors for forbidden cookbook genre drift", () => {
    const report = assertFormatIntegrity({
      bookFormat: "cookbook",
      genre: "philosophy",
      subgenre: "literary-fiction",
    });
    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
