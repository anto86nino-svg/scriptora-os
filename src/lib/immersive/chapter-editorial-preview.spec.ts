import { describe, expect, it } from "vitest";
import { generateChapterEditorialPreview } from "@/lib/immersive/chapter-editorial-preview";

describe("generateChapterEditorialPreview", () => {
  it("prefers blueprint summary over body text", () => {
    const preview = generateChapterEditorialPreview({
      summary: "Hero meets the antagonist under uneasy terms.",
      content: "The rain fell hard on the city streets as Elena stepped out of the carriage.",
      chapterIndex: 2,
      totalChapters: 12,
    });
    expect(preview).toBe("Hero meets the antagonist under uneasy terms.");
    expect(preview).not.toContain("rain fell");
  });

  it("never clones verbatim body paragraphs when outline is pending", () => {
    const body =
      "The rain fell hard on the city streets as Elena stepped out of the carriage. She had waited years for this moment and every detail of the plaza felt sharpened by memory.";
    const preview = generateChapterEditorialPreview({
      summary: "To be generated",
      title: "The Plaza",
      content: body,
      chapterIndex: 1,
      totalChapters: 10,
    });
    expect(preview).not.toContain("rain fell");
    expect(preview).not.toContain("carriage");
    expect(preview.length).toBeLessThanOrEqual(181);
    expect(preview).toMatch(/Plaza|Chapter 2|momentum|arc/i);
  });

  it("caps long summaries without spilling into spoiler-length prose", () => {
    const long =
      "This chapter orchestrates a slow reveal of the protagonist's hidden motive while the supporting cast closes in with competing agendas that will reshape the alliance before the midpoint turn arrives in the next section.";
    const preview = generateChapterEditorialPreview({
      summary: long,
      chapterIndex: 4,
      totalChapters: 14,
    });
    expect(preview.length).toBeLessThanOrEqual(181);
  });

  it("returns elegant fallback when empty", () => {
    expect(generateChapterEditorialPreview({ chapterIndex: 0, totalChapters: 8 })).toMatch(/Opening chapter/i);
    expect(generateChapterEditorialPreview({ chapterIndex: 3, totalChapters: 8 })).toMatch(/Chapter 4 of 8/i);
  });

  it("rejects summary that mirrors body opening", () => {
    const body = "Elena crossed the plaza at dawn while the city still slept.";
    const preview = generateChapterEditorialPreview({
      summary: "Elena crossed the plaza at dawn while the city still slept and the bells rang.",
      content: body,
      title: "Dawn Crossing",
      chapterIndex: 0,
      totalChapters: 6,
    });
    expect(preview).not.toContain("Elena crossed");
    expect(preview).toMatch(/Dawn Crossing|opens|entry/i);
  });
});
