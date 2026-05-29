import { describe, expect, it } from "vitest";
import {
  editorialStatusMessage,
  sanitizePlaceholderText,
  splitManuscriptParagraphs,
} from "@/lib/generation-experience";

describe("Generation Experience V2", () => {
  it("hides blueprint placeholders", () => {
    expect(sanitizePlaceholderText("To be generated")).toBe("");
    expect(sanitizePlaceholderText("Dark romance opening")).toBe("Dark romance opening");
  });

  it("builds editorial status before content", () => {
    expect(editorialStatusMessage(false, "To be generated")).toContain("preparando");
    expect(editorialStatusMessage(false, "Hero meets the antagonist")).toContain("Obiettivo");
    expect(editorialStatusMessage(true, "")).toContain("prendendo forma");
  });

  it("splits manuscript paragraphs for preview", () => {
    const parts = splitManuscriptParagraphs("First paragraph.\n\nSecond paragraph.");
    expect(parts.length).toBe(2);
  });
});
