import { describe, expect, it } from "vitest";
import { buildInitialDnaLock } from "./dna-lock";
import {
  getEditorialBlockedPrompt,
  humanizeMissingField,
} from "./interview-ui-copy";

describe("interview-ui-copy", () => {
  it("never exposes raw field keys in missing-field prompts", () => {
    for (const field of [
      "emotionalTone",
      "genreDNA",
      "setting",
      "targetReader",
      "centralConflict",
    ]) {
      const prompt = humanizeMissingField(field);
      expect(prompt).not.toContain(field);
      expect(prompt.length).toBeGreaterThan(20);
    }
  });

  it("returns editorial blocked prompt instead of technical missing list", () => {
    const lock = buildInitialDnaLock();
    const prompt = getEditorialBlockedPrompt(lock);
    expect(prompt).not.toMatch(/emotionalTone|genreDNA|95%/);
    expect(prompt.length).toBeGreaterThan(10);
  });
});
