import { describe, expect, it } from "vitest";
import { buildBookDna } from "./book-dna-engine";

function expectVisible(dna: ReturnType<typeof buildBookDna>, fields: string[]) {
  expect(dna.visibleFields).toEqual(expect.arrayContaining(fields));
}

function expectHidden(dna: ReturnType<typeof buildBookDna>, fields: string[]) {
  expect(dna.hiddenFields).toEqual(expect.arrayContaining(fields));
  for (const field of fields) {
    expect(dna.visibleFields).not.toContain(field);
  }
}

describe("Book DNA Engine content family routing", () => {
  it("routes deferred-life/procrastination books to Self Help without narrative fields", () => {
    const dna = buildBookDna({ title: "La Vita Che Rimandi Sempre" });

    expect(dna.family).toBe("SELF_HELP");
    expect(dna.detectedLabel).toBe("Ho rilevato: Self Help");
    expect(dna.genre).toBe("self_help");
    expect(dna.subgenre).toMatch(/procrastinazione|crescita personale/i);
    expectVisible(dna, ["readerProblem", "transformation", "method", "framework", "exercises"]);
    expectHidden(dna, ["protagonist", "antagonist", "worldbuilding", "pov"]);
  });

  it("routes Sicilian cooking books to Cookbook without story fields", () => {
    const dna = buildBookDna({ title: "La Cucina Siciliana Delle Nonne" });

    expect(dna.family).toBe("COOKBOOK");
    expect(dna.genre).toBe("cookbook");
    expectVisible(dna, ["cuisineType", "difficulty", "recipeCount", "recipeCategories", "nutrition"]);
    expectHidden(dna, ["protagonist", "antagonist", "plot", "conflict", "worldbuilding"]);
  });

  it("routes lyrical collection titles to Poetry without novel structure", () => {
    const dna = buildBookDna({ title: "Le Cose Che Non Ho Detto Al Mare" });

    expect(dna.family).toBe("POETRY");
    expect(dna.genre).toBe("poetry");
    expectVisible(dna, ["collectionTheme", "poeticStyle", "tone", "structure", "symbolicField"]);
    expectHidden(dna, ["plot", "protagonist", "antagonist", "cast", "conflict"]);
    expect(dna.blueprintStages).not.toEqual(expect.arrayContaining(["Progressione atti", "Personaggi"]));
  });

  it("routes intimate father/child life stories to Memoir without fantasy worldbuilding", () => {
    const dna = buildBookDna({ title: "Mio Padre Non Mi Ha Mai Insegnato Ad Andare In Bicicletta" });

    expect(dna.family).toBe("MEMOIR");
    expect(dna.genre).toBe("memoir");
    expectVisible(dna, ["lifePeriod", "keyEvents", "personalTransformation", "lessons"]);
    expectHidden(dna, ["worldbuilding", "magicSystem", "fantasyAntagonist"]);
  });

  it("keeps classic fantasy in Fiction with full narrative fields", () => {
    const dna = buildBookDna({
      title: "Il Regno delle Stelle Perdute",
      idea: "Un romanzo fantasy classico con una giovane maga, un antagonista antico, un regno spezzato e una magia che costa memoria.",
    });

    expect(dna.family).toBe("FICTION");
    expect(dna.genre).toBe("fantasy");
    expectVisible(dna, ["protagonist", "antagonist", "cast", "setting", "conflict", "pov", "worldbuilding"]);
    expect(dna.hiddenFields).not.toContain("protagonist");
  });
});
