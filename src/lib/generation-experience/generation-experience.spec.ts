import { describe, expect, it } from "vitest";
import {
  editorialStatusMessage,
  resolveOutlineSummaryForDisplay,
  sanitizePlaceholderText,
  splitManuscriptParagraphs,
} from "@/lib/generation-experience";

describe("Generation Experience V2", () => {
  it("hides blueprint placeholders", () => {
    expect(sanitizePlaceholderText("To be generated")).toBe("");
    expect(sanitizePlaceholderText("Dark romance opening")).toBe("Dark romance opening");
  });

  it("resolves outline summary from editorial preview when blueprint is still pending", () => {
    expect(resolveOutlineSummaryForDisplay("To be generated", "")).toMatch(/Opening chapter|Chapter 1/i);
    expect(resolveOutlineSummaryForDisplay("Hero meets the antagonist", "Long chapter body…")).toBe(
      "Hero meets the antagonist",
    );
    const preview = resolveOutlineSummaryForDisplay(
      "To be generated",
      "The rain fell hard on the city streets as Elena stepped out of the carriage. She had waited years for this moment.",
      { title: "The Arrival", chapterIndex: 1, totalChapters: 10 },
    );
    expect(preview).not.toContain("rain fell");
    expect(preview).not.toContain("carriage");
    expect(preview.length).toBeLessThanOrEqual(181);
  });

  it("builds editorial status before content", () => {
    expect(editorialStatusMessage(false, "To be generated")).toContain("preparing");
    expect(editorialStatusMessage(false, "Hero meets the antagonist")).toContain("objective");
    expect(editorialStatusMessage(true, "")).toContain("taking shape");
  });

  it("splits manuscript paragraphs for preview", () => {
    const parts = splitManuscriptParagraphs("First paragraph.\n\nSecond paragraph.");
    expect(parts.length).toBe(2);
  });
});
