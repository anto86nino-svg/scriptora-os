import { describe, expect, it } from "vitest";
import { validateBlueprintMatchesFormat } from "@/lib/blueprint-recovery";
import type { BookBlueprint, BookConfig } from "@/types/book";

function baseConfig(bookFormat: string): BookConfig {
  return {
    title: "T",
    subtitle: "S",
    tone: "chiaro",
    authorStyle: "A",
    language: "Italian",
    genre: "manual",
    category: "Non-Fiction",
    subcategory: "General",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 2,
    subchaptersEnabled: false,
    bookFormat,
  };
}

function bp(text: string): BookBlueprint {
  return {
    overview: text,
    emotionalArc: text,
    themes: [text],
    chapterOutlines: [{ title: text, summary: text }, { title: text, summary: text }],
  };
}

describe("validateBlueprintMatchesFormat", () => {
  it("fails cookbook on forbidden philosophy markers", () => {
    const errors = validateBlueprintMatchesFormat(
      bp("Tradizione filosofica e Implicazione esistenziale in cucina"),
      baseConfig("cookbook"),
    );
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails poetry on narrative chapter marker", () => {
    const errors = validateBlueprintMatchesFormat(bp("Capitolo 1 Normalità"), baseConfig("poetry_collection"));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails workbook on hero-journey patterns", () => {
    const errors = validateBlueprintMatchesFormat(bp("Hero journey con Escalation e Plot twist"), baseConfig("workbook"));
    expect(errors.length).toBeGreaterThan(0);
  });

  it("fails manual on fiction romance markers", () => {
    const errors = validateBlueprintMatchesFormat(bp("Protagonista con Romance arc"), baseConfig("manual"));
    expect(errors.length).toBeGreaterThan(0);
  });
});
