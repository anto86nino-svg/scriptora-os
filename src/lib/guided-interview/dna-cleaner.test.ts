import { describe, expect, it } from "vitest";
import { sanitizeDnaText, assessDnaQuality, hardSanitizeDnaText, isDnaTooDirtyToShow } from "./dna-cleaner";

describe("dna-cleaner", () => {
  it("removes repetition loops", () => {
    const dirty = "un un un romanzo un romanzo d'amore intenso";
    const clean = hardSanitizeDnaText(dirty);
    expect(clean).not.toMatch(/un un un/);
    expect(clean.toLowerCase()).toContain("romanzo");
  });

  it("dedupes phrase repetition", () => {
    const dirty = "un romanzo un romanzo d'amore";
    expect(hardSanitizeDnaText(dirty).toLowerCase()).not.toMatch(/romanzo un romanzo/);
  });

  it("flags dirty DNA for hiding", () => {
    expect(isDnaTooDirtyToShow({ promise: "un un un romanzo un romanzo" })).toBe(true);
  });

  it("blocks dirty repetitive DNA", () => {
    const report = assessDnaQuality(
      { promise: "un un un romanzo un romanzo" },
      { missingCount: 6, confidence: 0.5 },
    );
    expect(report.pass).toBe(false);
    expect(report.isRepetitive || report.isDirty).toBe(true);
  });
});
