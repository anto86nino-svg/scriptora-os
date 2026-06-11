import { describe, expect, it } from "vitest";
import { runManuscriptQualityV3 } from "./index";

describe("ManuscriptQualityV3", () => {
  it("strips prompt leakage and duplicate paragraphs", () => {
    const raw = `Marco guardò fuori.\n\nMarco guardò fuori.\n\nAs an AI language model, I cannot help.`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Test", genre: "thriller", language: "Italian", numberOfChapters: 10 } as any,
    });
    expect(result.text).not.toContain("As an AI");
    expect(result.sanitized).toBe(true);
  });

  it("returns antiRepetitionRemoved count", () => {
    const result = runManuscriptQualityV3("Un paragrafo unico e pulito.", { language: "Italian" });
    expect(result.antiRepetitionRemoved).toBeGreaterThanOrEqual(0);
    expect(result.text.length).toBeGreaterThan(0);
  });
});
