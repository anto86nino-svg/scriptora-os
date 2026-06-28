import {
  buildUniversalStudioContract,
  listUniversalBookStudios,
  resolveUniversalBookStudio,
} from "./universal-book-studios";

describe("Universal Book Studios", () => {
  it("exposes the seven official studios", () => {
    expect(listUniversalBookStudios().map((studio) => studio.id).sort()).toEqual([
      "memoir",
      "narrative",
      "poetry",
      "professional_guide",
      "study",
      "transformation",
      "workbook",
    ]);
  });

  it("routes poetry collections to poetry studio and PoetryBlueprint", () => {
    const { studio, kernel } = resolveUniversalBookStudio({
      config: { bookFormat: "poetry_collection", genre: "poesia", subcategory: "poesia contemporanea" },
    });

    expect(studio.visibleName).toBe("POESIE E RACCOLTE");
    expect(studio.generatorName).toBe("Poetry Collection Generator");
    expect(kernel.blueprintType).toBe("PoetryBlueprint");
    expect(kernel.generationStrategy).toBe("generatePoetryCollection");
    expect(studio.forbiddenFields.join(" ")).toMatch(/protagonista|trama|promessa narrativa/i);
  });

  it("routes self-help and psychology to transformation studio", () => {
    const { studio, kernel } = resolveUniversalBookStudio({
      config: { bookFormat: "psychology_guide", genre: "psicologia", subcategory: "ansia" },
    });

    expect(studio.visibleName).toBe("GUIDE E CRESCITA PERSONALE");
    expect(studio.generatorName).toBe("Transformation Generator");
    expect(kernel.generationStrategy).toBe("generatePsychologyGuide");
    expect(studio.visibleFields.join(" ")).toMatch(/trasformazione|strumenti pratici|piano d'azione/i);
  });

  it("routes manuals and business books to professional guide studio", () => {
    const { studio, kernel } = resolveUniversalBookStudio({
      config: { bookFormat: "business_book", genre: "business", subcategory: "startup" },
    });

    expect(studio.visibleName).toBe("MANUALI E GUIDE PROFESSIONALI");
    expect(studio.generatorName).toBe("Professional Guide Generator");
    expect(kernel.blueprintType).toBe("BusinessBlueprint");
    expect(studio.visibleFields.join(" ")).toMatch(/framework|procedure|checklist/i);
  });

  it("routes workbook, study and memoir formats to dedicated studios", () => {
    expect(resolveUniversalBookStudio({ config: { bookFormat: "workbook" } }).studio.visibleName).toBe("ESERCIZI E WORKBOOK");
    expect(resolveUniversalBookStudio({ config: { bookFormat: "study_material" } }).studio.visibleName).toBe("STUDIO E FORMAZIONE");
    expect(resolveUniversalBookStudio({ config: { bookFormat: "memoir" } }).studio.visibleName).toBe("BIOGRAFIE E MEMORIE");
  });

  it("builds a studio contract carrying generator, blueprint and quality gate", () => {
    const contract = buildUniversalStudioContract({
      config: { bookFormat: "poetry_collection", genre: "poetry" },
    });

    expect(contract).toContain("STUDIO_NAME: POESIE E RACCOLTE");
    expect(contract).toContain("GENERATOR: Poetry Collection Generator");
    expect(contract).toContain("KERNEL_BLUEPRINT_TYPE: PoetryBlueprint");
    expect(contract).toContain("QUALITY_GATE: Poetry Purity Gate");
    expect(contract).toContain("FORBIDDEN_FIELDS");
  });
});
