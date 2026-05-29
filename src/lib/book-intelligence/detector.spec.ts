import { describe, expect, it } from "vitest";
import { detectBookIntelligence, refineDetectedGenre } from "@/lib/book-intelligence";

describe("Book Intelligence Engine V2", () => {
  it("detects horticultural manual instead of self-help for tomato growing guide", () => {
    const report = detectBookIntelligence({
      idea: "Manuale di coltivazione del pomodoro per principianti",
      genre: "self-help",
    });

    expect(report.resolvedGenre).toBe("gardening");
    expect(report.layers.writingBrainId).toBe("horticultural-guide-brain");
    expect(report.layers.domain).toBe("nonfiction");
    expect(report.avoidPatterns.some((item) => /motivational/i.test(item))).toBe(true);
  });

  it("detects self-help for overthinking psychology book", () => {
    const report = detectBookIntelligence({
      idea: "How to Stop Overthinking and Regulate Your Emotions",
    });

    expect(report.layers.writingBrainId).toBe("psychology-brain");
    expect(report.resolvedGenre).toBe("psychology");
  });

  it("detects dark romance for mafia romance", () => {
    const report = detectBookIntelligence({
      idea: "Dark Mafia Romance slow burn forbidden attraction",
    });

    expect(report.layers.writingBrainId).toBe("dark-romance-brain");
    expect(report.resolvedGenre).toBe("dark-romance");
  });

  it("refines API misclassification from self-help to gardening", () => {
    const refined = refineDetectedGenre({
      idea: "How to Grow Tomatoes in your backyard",
      genre: "self-help",
      subcategory: "mindset",
      tone: "conversational",
    });

    expect(refined.genre).toBe("gardening");
    expect(refined.brainId).toBe("horticultural-guide-brain");
  });
});
