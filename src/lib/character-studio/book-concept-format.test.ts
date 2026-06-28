import {
  buildDeterministicBookConcept,
  buildFormatAwareConceptPrompts,
  isConceptContaminatedForFormat,
  resolveBookConceptFormat,
} from "../../../supabase/functions/_shared/book-concept-format.ts";

describe("format-aware book concept generation", () => {
  it("builds a poetry collection nucleus without narrative contamination", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "poetry_collection",
      genre: "poesia",
      subcategory: "poesia contemporanea",
      centralDynamic: "Memoria e identita'",
      protagonistType: "Intima e contemplativa",
      setting: "Nebbia, acqua, mappe, luce",
      chapterCount: 60,
      subchaptersPerChapter: 4,
    });

    expect(concept).toContain("Tema centrale");
    expect(concept).toContain("Voce poetica");
    expect(concept).toContain("Campo simbolico");
    expect(concept).toContain("Promessa poetica");
    expect(concept).not.toMatch(/protagonista|lei e|promessa narrativa|trama/i);
    expect(isConceptContaminatedForFormat({ bookFormat: "poetry_collection", text: concept })).toBe(false);
  });

  it("detects contaminated poetry output from a novel synopsis", () => {
    const contaminated = "Lei e una protagonista che deve allearsi con un uomo misterioso per scoprire la verita'. La promessa narrativa cresce nella trama.";

    expect(isConceptContaminatedForFormat({
      bookFormat: "poetry_collection",
      genre: "poesia",
      text: contaminated,
    })).toBe(true);
  });

  it("builds a manual concept around reader problem, method and exercises", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "manual",
      genre: "self help",
      centralDynamic: "Ansia quotidiana e senso di blocco",
      chapterCount: 10,
    });

    expect(concept).toContain("Problema lettore");
    expect(concept).toContain("Metodo");
    expect(concept).toContain("Checklist");
    expect(concept).toContain("Esercizi");
    expect(concept).not.toMatch(/protagonista|trama|promessa narrativa/i);
  });

  it("builds a workbook concept with sheets, exercises and tracker", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "workbook",
      genre: "self help",
      centralDynamic: "Autostima pratica",
    });

    expect(concept).toContain("Schede");
    expect(concept).toContain("Esercizi");
    expect(concept).toContain("Progress tracker");
    expect(concept).not.toMatch(/trama|protagonista|promessa narrativa/i);
  });

  it("builds study material with modules, quiz and flashcards", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "study_material",
      genre: "education",
      centralDynamic: "Biologia cellulare",
    });

    expect(concept).toContain("Moduli");
    expect(concept).toContain("Quiz");
    expect(concept).toContain("Flashcard");
    expect(concept).not.toMatch(/personaggi|cast|trama/i);
  });

  it("keeps dark romance narrative concepts relationship-led", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "novel",
      genre: "dark romance",
      subcategory: "friends to lovers",
    });

    expect(concept).toMatch(/relazione|desiderio|ferita/i);
    expect(concept).toMatch(/mistero resta una pressione esterna/i);
  });

  it("keeps gothic horror narrative concepts atmosphere-led", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "novella",
      genre: "horror gotico",
      subcategory: "haunted house",
    });

    expect(concept).toMatch(/atmosfera|inquietudine|decadenza|paura/i);
  });

  it("routes the server prompt to the poetry collection strategy", () => {
    const prompts = buildFormatAwareConceptPrompts({
      bookFormat: "poetry_collection",
      generationStrategy: "generatePoetryCollection",
      blueprintType: "PoetryBlueprint",
      genre: "poesia",
    });

    expect(resolveBookConceptFormat({
      bookFormat: "poetry_collection",
      generationStrategy: "generatePoetryCollection",
      blueprintType: "PoetryBlueprint",
    })).toBe("poetry_collection");
    expect(prompts.format).toBe("poetry_collection");
    expect(prompts.user).toContain("GENERA UN NUCLEO POETICO");
  });
});
