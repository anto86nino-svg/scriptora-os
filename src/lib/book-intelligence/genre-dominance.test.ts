import { describe, expect, it } from "vitest";
import { resolveGenreDominanceContract, scoreGenreDominance } from "./genre-dominance";

describe("Genre Dominance Engine", () => {
  it("keeps dark romance relationship-dominant over mystery", () => {
    const contract = resolveGenreDominanceContract({
      genre: "dark-romance",
      subcategory: "dark romance",
      bookFormat: "novel",
    });
    const text = "Attrazione, desiderio, tensione emotiva, ferita e relazione dominano; il mistero resta pressione sulla coppia.";
    const score = scoreGenreDominance(text, contract);

    expect(contract.hierarchy.slice(0, 2)).toEqual(["GENERE", "SOTTOGENERE"]);
    expect(score.dominanceRatio).toBeGreaterThanOrEqual(60);
    expect(score.passed).toBe(true);
  });

  it("rejects gothic horror when fantasy quest language dominates", () => {
    const contract = resolveGenreDominanceContract({
      genre: "horror",
      subcategory: "gothic horror",
      bookFormat: "novel",
    });
    const score = scoreGenreDominance("Magia epica, quest, regno e battaglia guidano tutto.", contract);

    expect(contract.requiredElements.join(" ")).toMatch(/atmosfera|inquietudine|decadenza|paura/i);
    expect(score.passed).toBe(false);
    expect(score.forbiddenDominanceHits.length).toBeGreaterThan(0);
  });

  it("keeps self-help practical instead of generic essay", () => {
    const contract = resolveGenreDominanceContract({
      genre: "self-help",
      bookFormat: "manual",
    });
    const score = scoreGenreDominance("Trasformazione con strumenti, chiarezza e applicazione pratica in esercizi.", contract);

    expect(score.dominanceRatio).toBe(100);
    expect(score.passed).toBe(true);
  });

  it("rejects fantasy text dominated by self-help tropes", () => {
    const contract = resolveGenreDominanceContract({
      genre: "fantasy",
      subcategory: "epic fantasy",
      bookFormat: "novel",
    });
    const score = scoreGenreDominance(
      "Trasformazione personale con checklist, self-help e esercizi pratici per crescita.",
      contract,
    );

    expect(contract.genreKey).toBe("fantasy");
    expect(score.passed).toBe(false);
    expect(score.forbiddenDominanceHits.length).toBeGreaterThan(0);
  });

  it("resolves sci-fi dominance contract", () => {
    const contract = resolveGenreDominanceContract({
      genre: "sci-fi",
      bookFormat: "novel",
    });
    expect(contract.genreKey).toBe("sci-fi");
    expect(contract.mustNotDominate).toEqual(expect.arrayContaining(["slow burn"]));
  });

  it("resolves thriller contract for mystery subgenre", () => {
    const contract = resolveGenreDominanceContract({
      genre: "mystery",
      bookFormat: "novel",
    });
    expect(contract.genreKey).toBe("thriller");
  });

  it("resolves friends-to-lovers as romance subgenre, not dark romance", () => {
    const contract = resolveGenreDominanceContract({
      genre: "romance",
      subcategory: "friends to lovers",
      bookFormat: "novel",
    });
    expect(contract.genreKey).toBe("friends-to-lovers");
    expect(contract.mustNotDominate).toEqual(expect.arrayContaining(["desiderio proibito oscuro"]));
  });
});
