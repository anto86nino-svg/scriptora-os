import { describe, expect, it } from "vitest";
import { applyRepetitionGuard, detectRepetitionIssues } from "./repetition-guard";

describe("repetition-guard", () => {
  it("detects repeated gesture clichés beyond cap", () => {
    const text = [
      "Si passò una mano sul viso.",
      "Guardò fuori dalla finestra.",
      "Il silenzio cadde.",
      "Si passò una mano sul viso ancora.",
    ].join(" ");

    const issues = detectRepetitionIssues(text);
    expect(issues.some((issue) => /mano sul viso/i.test(issue.phrase))).toBe(true);
  });

  it("removes excess occurrences keeping max one per chapter", () => {
    const text = "Si passò una mano sul viso. Poi rise. Si passò una mano sul viso di nuovo.";
    const result = applyRepetitionGuard(text);
    expect((result.text.match(/si passò una mano sul viso/gi) || []).length).toBe(1);
    expect(result.fixesApplied).toBeGreaterThan(0);
  });

  it("detects repeated sentence openings that make prose feel recycled", () => {
    const text = [
      "Nora aprì la porta senza respirare.",
      "Nora aprì il cassetto e trovò la lettera.",
      "Nora aprì gli occhi quando la casa scricchiolò.",
      "Elia restò immobile nel corridoio.",
    ].join(" ");

    const issues = detectRepetitionIssues(text);
    expect(issues.some((issue) => issue.type === "sentence_opening" && /nora apri/.test(issue.phrase))).toBe(true);
  });
});
