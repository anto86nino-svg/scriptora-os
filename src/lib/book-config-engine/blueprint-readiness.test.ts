import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  autoCompleteBookConfig,
  validateBookReadinessForBlueprint,
} from "./blueprint-readiness";

function baseConfig(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "La distanza tra noi",
    subtitle: "Un romance slow burn su paura, scelta e fiducia",
    idea: "Una storia slow burn in cui due protagonisti devono scegliere se restare insieme mentre un ostacolo esterno e una ferita emotiva li costringono a cambiare.",
    tone: "intimo, trattenuto, sensoriale, slow burn",
    authorStyle: "Romance premium",
    language: "Italian",
    genre: "romance",
    category: "Fiction",
    subcategory: "Slow burn romance",
    subgenre: "slow burn",
    targetReader: "Lettrici di romance contemporaneo che cercano desiderio, attrito e payoff emotivo graduale.",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 12,
    subchaptersEnabled: false,
    characters: [{ name: "Emma", role: "protagonista", wound: "paura dell'abbandono" }],
    ...overrides,
  };
}

describe("validateBookReadinessForBlueprint", () => {
  it("blocks an incomplete romance before blueprint generation", () => {
    const report = validateBookReadinessForBlueprint(baseConfig({
      title: "Romanzo senza titolo",
      subtitle: "",
      idea: "",
      targetReader: "",
      subcategory: "General",
      characters: [],
    }));

    expect(report.ready).toBe(false);
    expect(report.score).toBeLessThan(75);
    expect(report.missingFields).toContain("Titolo libro");
    expect(report.weakFields).toContain("Idea centrale / promessa");
  });

  it("allows a complete romance configuration", () => {
    const report = validateBookReadinessForBlueprint(baseConfig());

    expect(report.ready).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(75);
    expect(report.missingFields).toEqual([]);
  });

  it("allows a complete self-help configuration with practical promise", () => {
    const report = validateBookReadinessForBlueprint(baseConfig({
      title: "Metodo 30 giorni",
      subtitle: "Un metodo pratico per cambiare abitudini",
      idea: "Un framework in passi, esercizi e checklist per aiutare il lettore a trasformare abitudini e ottenere risultati concreti.",
      genre: "self-help",
      category: "Non-Fiction",
      subcategory: "Mindset pratico",
      subgenre: "mindset",
      targetReader: "Lettori che vogliono un metodo concreto, esempi e azioni quotidiane misurabili.",
      tone: "chiaro, autorevole, pratico, umano",
      characters: [],
    }));

    expect(report.ready).toBe(true);
    expect(report.genreSpecificWarnings).toEqual([]);
  });

  it("allows an educational configuration with level and checks", () => {
    const report = validateBookReadinessForBlueprint(baseConfig({
      title: "Capire la Rivoluzione francese",
      subtitle: "Unità didattiche per studenti",
      idea: "Un percorso di lezioni, moduli, esercizi, verifiche e glossario per studenti di scuola superiore.",
      genre: "education",
      category: "Education",
      subcategory: "Storia scuola superiore",
      targetReader: "Studenti di scuola superiore che devono studiare cause, eventi, conseguenze e lessico storico.",
      tone: "chiaro, didattico, progressivo, concreto",
      characters: [],
    }));

    expect(report.ready).toBe(true);
  });

  it("auto-completes poetry as a poetic collection, not as a novel setup", () => {
    const result = autoCompleteBookConfig(baseConfig({
      title: "La memoria delle stanze",
      subtitle: "",
      idea: "",
      genre: "poetry",
      category: "Poesia",
      subcategory: "General",
      targetReader: "",
      tone: "",
      characters: [],
    }));

    expect(result.completedFields).toContain("Idea centrale");
    expect(result.config.idea).toMatch(/raccolta/i);
    expect(result.config.idea).not.toMatch(/conflitto centrale/i);
  });
});
