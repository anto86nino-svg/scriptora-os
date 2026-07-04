import { describe, expect, it } from "vitest";
import {
  hasCleanableChapterContent,
  runEditorialCleanup,
  validateEditorialCleanupResult,
} from "./editorial-cleanup";

describe("editorial cleanup", () => {
  it("detects and fixes repeated non non", () => {
    const result = runEditorialCleanup({
      title: "Narcisismo",
      content: "Non non era solo vanita. Era un modo di chiedere conferma allo specchio.",
    });

    expect(result.cleanedContent).toContain("Non era solo");
    expect(result.issuesFound.some((issue) => issue.type === "typo" && issue.before === "non non")).toBe(true);
  });

  it("detects and fixes corrupted sentences like a fissare il a", () => {
    const result = runEditorialCleanup({
      title: "Lo specchio",
      content: "Marco restava a fissare il a, come se da quella crepa potesse arrivare una risposta.",
    });

    expect(result.cleanedContent).toContain("a fissare il vuoto");
    expect(result.issuesFound.some((issue) => issue.type === "corrupted_sentence" && issue.severity === "high")).toBe(true);
  });

  it("removes duplicate chapter headings inside the chapter body", () => {
    const result = runEditorialCleanup({
      title: "Capitolo 2",
      content: "# Capitolo 2\n\nIl capitolo comincia davvero qui.",
    });

    expect(result.cleanedContent).not.toMatch(/^# Capitolo 2/);
    expect(result.cleanedContent).toContain("Il capitolo comincia davvero qui.");
    expect(result.issuesFound.some((issue) => issue.type === "duplicate_heading")).toBe(true);
  });

  it("does not expose cleanup for empty chapter content", () => {
    expect(hasCleanableChapterContent("   ", [])).toBe(false);
  });

  it("rejects cleaned content that is too short", () => {
    const original = "Questo e' un capitolo abbastanza lungo. ".repeat(20);
    const validation = validateEditorialCleanupResult(original, {
      cleanedContent: "Troppo corto.",
      issuesFound: [],
      changesApplied: [],
      summary: "",
      stats: { errorsCorrected: 0, repetitionsReduced: 0, incompleteSentencesFixed: 0, typosRemoved: 0 },
      confidence: 0.2,
    });

    expect(validation.valid).toBe(false);
  });

  it("keeps subchapter coverage coherent after cleanup", () => {
    const result = runEditorialCleanup({
      title: "Specchi",
      content: "Testo aggregato sporco.",
      subchapters: [
        { title: "Specchio", content: "Non non era solo vanita." },
        { title: "Crepa", content: "Marco restava a fissare il a." },
      ],
    });

    expect(result.cleanedSubchapters).toHaveLength(2);
    expect(result.cleanedSubchapters?.[0]?.content).toContain("Non era solo");
    expect(result.cleanedSubchapters?.[1]?.content).toContain("a fissare il vuoto");
    expect(result.cleanedContent).toContain("Specchio");
    expect(result.cleanedContent).toContain("Crepa");
  });

  it("repairs split words across subchapter boundaries during cleanup", () => {
    const result = runEditorialCleanup({
      title: "Lasciare andare",
      content: "",
      subchapters: [
        { title: "1.1", content: "Il primo passo non è correre più forte: è capire perché acceleri p" },
        { title: "1.2", content: "er non cadere nella vecchia urgenza. Nessuna par" },
        { title: "1.3", content: "te di te deve dimostrare valore attraverso la fretta." },
      ],
    });

    expect(result.cleanedContent).not.toContain("acceleri p er");
    expect(result.cleanedContent).toContain("acceleri per non cadere");
    expect(result.cleanedContent).toContain("Nessuna parte");
    expect(result.issuesFound.some((issue) => issue.type === "corrupted_sentence" && issue.severity === "high")).toBe(true);
  });
});
