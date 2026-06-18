import { describe, expect, it } from "vitest";
import {
  detectAiRepetitionPatterns,
  detectSceneContextLeaks,
  normalizeMarkdownItalics,
  reduceAiRepetitionPatterns,
  removeDuplicateChapterHeading,
  removeUiLabelsFromManuscript,
  repairObviousSceneLeaks,
  sanitizeGeneratedChapterContent,
} from "./manuscript-integrity-guard";

describe("removeDuplicateChapterHeading", () => {
  it("removes Capitolo N: Titolo duplicate", () => {
    const body = "Capitolo 1: La notte in cui la foresta si svegliò\n\nLa luna non c'era, quella notte.";
    const result = removeDuplicateChapterHeading(body, "La notte in cui la foresta si svegliò", 0);
    expect(result.removed).toBe(true);
    expect(result.content.startsWith("La luna")).toBe(true);
  });

  it("removes bare title duplicate", () => {
    const body = "La notte in cui la foresta si svegliò\n\nLa luna non c'era.";
    const result = removeDuplicateChapterHeading(body, "La notte in cui la foresta si svegliò", 0);
    expect(result.removed).toBe(true);
    expect(result.content.startsWith("La luna")).toBe(true);
  });
});

describe("removeUiLabelsFromManuscript", () => {
  it("removes isolated UI labels", () => {
    const input = "Prima riga narrativa.\n\nLunghezza Capitolo\n\nBreve\n\nMedio\n\nSeconda riga.";
    const { content, removed } = removeUiLabelsFromManuscript(input);
    expect(removed).toContain("Lunghezza Capitolo");
    expect(removed).toContain("Breve");
    expect(content).toContain("Prima riga narrativa");
    expect(content).toContain("Seconda riga");
    expect(content).not.toMatch(/^Breve$/m);
  });

  it("does not remove words inside narrative sentences", () => {
    const input = "Il piano era semplice: entrare nel bosco e uscire vivi.";
    const { content, removed } = removeUiLabelsFromManuscript(input);
    expect(removed).toHaveLength(0);
    expect(content).toBe(input);
  });
});

describe("normalizeMarkdownItalics", () => {
  it("fixes spaced italics", () => {
    const { content } = normalizeMarkdownItalics("* quando trovi il sorbo spezzato, la foresta ti ha già scelto. *");
    expect(content).toBe("*Quando trovi il sorbo spezzato, la foresta ti ha già scelto.*");
  });

  it("fixes trailing space before closing asterisk", () => {
    const { content } = normalizeMarkdownItalics("*non fidarti mai di un bosco che tace. *");
    expect(content).toBe("*Non fidarti mai di un bosco che tace.*");
  });
});

describe("scene context leaks", () => {
  it("detects cattedrale in forest setting", () => {
    const leaks = detectSceneContextLeaks("La cattedrale cadeva a pezzi.", {
      expectedSetting: "foresta, radura, Selva Nera",
      bookSetting: "villaggio nella foresta",
    });
    expect(leaks).toContain("cattedrale");
  });

  it("does not flag cattedrale when expected", () => {
    const leaks = detectSceneContextLeaks("La cattedrale era antica.", {
      expectedSetting: "cattedrale gotica",
    });
    expect(leaks).not.toContain("cattedrale");
  });

  it("repairs obvious cathedral leak in forest", () => {
    const { content, repaired } = repairObviousSceneLeaks(
      "La cattedrale cadeva a pezzi. Da qualche parte cadde una goccia d'acqua.",
      ["cattedrale"],
      { expectedSetting: "foresta, radura" },
    );
    expect(repaired.length).toBeGreaterThan(0);
    expect(content.toLowerCase()).not.toContain("cattedrale");
    expect(content).toContain("radura");
  });
});

describe("anti-AI repetition", () => {
  it("reduces annuì occurrences", () => {
    const input =
      "Kael annuì. Elena annuì lentamente. Poi Kael annuì di nuovo. Ancora una volta annuì.";
    const { content, corrections } = reduceAiRepetitionPatterns(input, { chapterLength: "medium" });
    const count = (content.match(/annu[iì]/gi) || []).length;
    expect(count).toBeLessThanOrEqual(1);
    expect(corrections.some((c) => c.type === "ai_repetition_reduced")).toBe(true);
  });

  it("does not replace every annuì with assentì", () => {
    const { content } = reduceAiRepetitionPatterns("Kael annuì. Elena annuì.", { chapterLength: "short" });
    expect(content.toLowerCase()).not.toContain("assentì");
  });

  it("reduces repeated silenzio patterns", () => {
    const input =
      "Il silenzio cadde. Parlarono ancora. Il silenzio si allungò. Il silenzio cadde di nuovo.";
    const { content } = reduceAiRepetitionPatterns(input, { chapterLength: "short" });
    const silenzioCount = (content.match(/silenzio/gi) || []).length;
    expect(silenzioCount).toBeLessThan(4);
  });

  it("returns repeatedPatterns in sanitize pipeline", () => {
    const result = sanitizeGeneratedChapterContent("Kael annuì. Elena annuì. Il silenzio cadde.", {
      chapterTitle: "Test",
      expectedSetting: "foresta",
    });
    expect(result.content.length).toBeGreaterThan(0);
    expect(Array.isArray(result.corrections)).toBe(true);
    expect(Array.isArray(result.repeatedPatterns)).toBe(true);
  });
});

describe("sanitizeGeneratedChapterContent end-to-end", () => {
  it("produces narrative opening after cleanup", () => {
    const raw = `Capitolo 1: La notte in cui la foresta si svegliò

Lunghezza Capitolo
Breve

La luna non c'era, quella notte.

*non fidarti mai di un bosco che tace. *`;

    const result = sanitizeGeneratedChapterContent(raw, {
      chapterTitle: "La notte in cui la foresta si svegliò",
      chapterNumber: 0,
      expectedSetting: "foresta, radura",
    });

    expect(result.content.startsWith("La luna")).toBe(true);
    expect(result.content).toContain("*Non fidarti mai di un bosco che tace.*");
    expect(result.content).not.toMatch(/^Breve$/m);
  });
});

describe("detectAiRepetitionPatterns", () => {
  it("flags high come se count", () => {
    const text = "come se fosse vero. come se non bastasse. come se tutto fosse facile. come se niente contasse.";
    const found = detectAiRepetitionPatterns(text);
    expect(found.some((f) => f.pattern === "come_se")).toBe(true);
  });
});
