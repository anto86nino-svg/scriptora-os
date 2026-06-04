import { describe, expect, it } from "vitest";
import { guardFinalManuscriptText } from "@/lib/final-manuscript-guard";

describe("guardFinalManuscriptText", () => {
  it("removes technical prompt leakage from Italian manuscript output", () => {
    const result = guardFinalManuscriptText(
      [
        "Chapter plan: reveal the conflict.",
        "SCENE CONTINUITY CONTRACT: add a new consequence.",
        "Luca rimase fermo sulla soglia.",
        "Return ONLY the chapter text.",
        "Manoscritto live: contenuto in scrittura.",
      ].join("\n"),
      { config: { language: "Italian" } },
    );

    expect(result).toContain("Luca rimase fermo sulla soglia.");
    expect(result).not.toMatch(/Chapter plan|SCENE CONTINUITY|Return ONLY|Manoscritto live/i);
  });

  it("deduplicates repeated paragraphs and sentences without removing clean prose", () => {
    const repeated = "La porta rimase aperta. Nessuno si mosse.";
    const result = guardFinalManuscriptText(
      `${repeated}\n\n${repeated}\n\nAnna prese le chiavi. Anna prese le chiavi.`,
      { config: { language: "Italian" } },
    );

    expect(result.match(/La porta rimase aperta/g) || []).toHaveLength(1);
    expect(result.match(/Anna prese le chiavi/g) || []).toHaveLength(1);
  });
});
