import { describe, expect, it } from "vitest";
import {
  deriveContentFirstChapterTitle,
  isRepeatedTitleStructure,
  isTemplateChapterTitle,
  passesChapterTitleQualityTest,
  resolveIntelligentChapterTitle,
} from "./chapter-title-engine-v2";

const historyConfig = {
  title: "Rome in Brief",
  subtitle: "From village to empire",
  genre: "historical",
  category: "History",
  language: "English" as const,
};

describe("chapter-title-engine-v2", () => {
  it("rejects generic template titles", () => {
    expect(isTemplateChapterTitle("The Threshold", "English")).toBe(true);
    expect(isTemplateChapterTitle("The First Crack", "English")).toBe(true);
    expect(isTemplateChapterTitle("La soglia", "Italian")).toBe(true);
  });

  it("accepts content-specific titles", () => {
    expect(isTemplateChapterTitle("Caesar Crosses the Rubicon", "English")).toBe(false);
    expect(isTemplateChapterTitle("Why Most Startups Die", "English")).toBe(false);
  });

  it("derives titles from chapter summary instead of template pool", () => {
    const title = resolveIntelligentChapterTitle("The Threshold", 0, {
      config: historyConfig,
      summary: "Rome begins as a cluster of villages along the Tiber before republican institutions emerge.",
      previousTitles: [],
    });
    expect(title).not.toBe("The Threshold");
    expect(title.toLowerCase()).toMatch(/rome|tiber|village|republic/);
  });

  it("blocks repeated title structures in the same manuscript", () => {
    expect(isRepeatedTitleStructure("The Hidden Cost", ["The Hidden Truth"])).toBe(true);
    expect(isRepeatedTitleStructure("Caesar Crosses the Rubicon", ["The Tiber, Salt and Seven Hills"])).toBe(false);
  });

  it("passes quality test for specific titles", () => {
    expect(
      passesChapterTitleQualityTest(
        "Caesar Crosses the Rubicon",
        "Caesar crosses the Rubicon and civil war becomes inevitable.",
        historyConfig,
      ),
    ).toBe(true);
    expect(
      passesChapterTitleQualityTest(
        "The Threshold",
        "A generic turning point in the story.",
        historyConfig,
      ),
    ).toBe(false);
  });

  it("generates distinct titles for different books on same subject", () => {
    const a = deriveContentFirstChapterTitle(0, {
      config: { ...historyConfig, title: "Rome in Brief" },
      summary: "The early villages on the Tiber and the mythic founding.",
    });
    const b = deriveContentFirstChapterTitle(0, {
      config: { ...historyConfig, title: "The Hidden Rome" },
      summary: "Secrets beneath the Palatine and invisible power networks.",
    });
    expect(a).not.toEqual(b);
  });
});
