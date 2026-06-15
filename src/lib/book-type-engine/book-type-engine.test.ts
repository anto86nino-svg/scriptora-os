import { describe, expect, it } from "vitest";
import {
  BOOK_TYPE_REGISTRY,
  buildBookTypeEngineBlock,
  buildBookTypeLock,
  resolveBookTypeDefinition,
  studioGenresFromRegistry,
} from "./index";
import { isForbiddenGenericTitle, fallbackTitleForFamily } from "./title-engine";

describe("BookTypeEngine", () => {
  it("registry covers all major families", () => {
    const families = new Set(BOOK_TYPE_REGISTRY.map((t) => t.family));
    expect(families.has("narrative")).toBe(true);
    expect(families.has("nonfiction")).toBe(true);
    expect(families.has("educational")).toBe(true);
    expect(families.has("manual")).toBe(true);
    expect(families.has("cookbook")).toBe(true);
    expect(families.has("poetry")).toBe(true);
  });

  it("resolves educational from subcategory hints", () => {
    const def = resolveBookTypeDefinition("education", "storia");
    expect(def.family).toBe("educational");
  });

  it("resolves memoir, children and biography without falling back to romance", () => {
    expect(resolveBookTypeDefinition("memoir", "memorie").id).toBe("memoir");
    expect(resolveBookTypeDefinition("children", "bambini").id).toBe("children");
    expect(resolveBookTypeDefinition("biography", "biografia").id).toBe("biography");
  });

  it("buildBookTypeEngineBlock includes real title engine", () => {
    const block = buildBookTypeEngineBlock({
      title: "Test",
      genre: "education",
      subcategory: "storia",
      language: "Italian",
      numberOfChapters: 10,
    } as any);
    expect(block).toContain("REAL TITLE ENGINE");
    expect(block).toContain("UNIVERSAL BOOK TYPE ENGINE");
  });

  it("buildBookTypeLock respects subchapter defaults per family", () => {
    const edu = buildBookTypeLock({
      title: "Storia",
      genre: "education",
      language: "Italian",
      numberOfChapters: 8,
    } as any);
    expect(edu.hasSubchapters).toBe(true);

    const poetry = buildBookTypeLock({
      title: "Versi",
      genre: "poetry",
      language: "Italian",
      numberOfChapters: 6,
    } as any);
    expect(poetry.hasSubchapters).toBe(false);
  });

  it("studioGenresFromRegistry uses registry ids", () => {
    const genres = studioGenresFromRegistry();
    expect(genres.length).toBe(BOOK_TYPE_REGISTRY.length);
    expect(genres.some((g) => g.id === "cozy-fantasy" && g.genre === "fantasy")).toBe(true);
    expect(genres.some((g) => g.id === "history-school")).toBe(true);
  });

  it("resolveBookTypeById disambiguates fantasy variants", () => {
    const cozy = resolveBookTypeDefinition("fantasy", "cozy", "", "cozy-fantasy");
    const epic = resolveBookTypeDefinition("fantasy", "epic", "", "fantasy");
    expect(cozy.id).toBe("cozy-fantasy");
    expect(epic.id).toBe("fantasy");
  });
});

describe("RealTitleEngine", () => {
  it("rejects forbidden generic titles", () => {
    expect(isForbiddenGenericTitle("L'inizio del viaggio")).toBe(true);
    expect(isForbiddenGenericTitle("Il segreto nascosto")).toBe(true);
    expect(isForbiddenGenericTitle("Origini Polinesiane e le Prime Navigazioni")).toBe(false);
  });

  it("fallbackTitleForFamily is topic-based for nonfiction", () => {
    expect(fallbackTitleForFamily("educational", 0)).toBe("Periodo e contesto");
    expect(fallbackTitleForFamily("cookbook", 1)).toBe("Tecnica base");
  });
});
