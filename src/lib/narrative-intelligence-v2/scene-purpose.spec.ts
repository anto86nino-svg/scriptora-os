import { describe, expect, it } from "vitest";
import { analyzeChapterScenePurpose } from "./scene-purpose";

describe("scene purpose intelligence", () => {
  it("detects weak repetitive introspection scenes", () => {
    const chapter = [
      "She felt the weight of everything. Her heart ached with feeling.",
      "He felt the silence between them. Emotion filled the room.",
      "She felt again the same ache. Tears came easily.",
      "Another wave of feeling passed through her heart.",
    ].join("\n\n");

    const result = analyzeChapterScenePurpose({
      content: chapter,
      chapterIndex: 3,
      config: { genre: "literary-fiction", bookIntelligence: { layers: { domain: "fiction" } } } as any,
    });

    expect(result.scenes.length).toBeGreaterThanOrEqual(4);
    expect(result.warnings.some(w => /introspection|repetition/i.test(w))).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("flags low-purpose scenic prose", () => {
    const chapter =
      "The light fell across the table. The room was quiet. Nothing moved except dust in the air.";

    const result = analyzeChapterScenePurpose({
      content: chapter,
      chapterIndex: 0,
      config: { genre: "literary-fiction" } as any,
    });

    expect(result.scenes[0].wordCount).toBeGreaterThan(10);
    expect(["weak", "adequate"]).toContain(result.scenes[0].health);
  });
});
