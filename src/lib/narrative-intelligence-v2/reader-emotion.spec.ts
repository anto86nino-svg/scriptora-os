import { describe, expect, it } from "vitest";
import { simulateReaderEmotion } from "./reader-emotion";

describe("reader emotion simulator", () => {
  it("returns bounded scores derived from text signals", () => {
    const chapter = `Who left the message on the door? She didn't know — and maybe she never would.
"But you promised," he said, turning away before she could answer.
The secret still hung between them, unanswered.`;

    const result = simulateReaderEmotion({
      content: chapter,
      chapterIndex: 6,
      config: {
        genre: "thriller",
        bookIntelligence: { layers: { writingBrainId: "thriller-brain", domain: "fiction" } },
        numberOfChapters: 12,
      } as any,
    });

    expect(result.curiosity).toBeGreaterThan(0);
    expect(result.curiosity).toBeLessThanOrEqual(100);
    expect(result.emotionalTension).toBeLessThanOrEqual(100);
    expect(result.whySummary.length).toBeGreaterThan(0);
    expect(result.genreAdjustedNote).toMatch(/Thriller/i);
  });

  it("adjusts for utility nonfiction brains", () => {
    const chapter = `Step 1: Prepare the soil with compost. Step 2: Measure pH before planting.
Common mistake: overwatering seedlings in the first week. Troubleshooting: yellow leaves often mean drainage issues.`;

    const result = simulateReaderEmotion({
      content: chapter,
      chapterIndex: 1,
      config: {
        genre: "gardening",
        bookIntelligence: { layers: { writingBrainId: "horticultural-guide-brain", domain: "nonfiction" } },
      } as any,
    });

    expect(result.genreAdjustedNote).toMatch(/Utility/i);
    expect(result.boredomRisk).toBeLessThanOrEqual(100);
  });
});
