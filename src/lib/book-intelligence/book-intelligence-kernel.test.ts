import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import {
  applyBookKernelToConfig,
  buildBookKernelPromptBlock,
  getKernelTemplate,
  listBookKernelFormats,
  registerBookKernelTemplate,
  resolveBookKernel,
  validateFormatCoherence,
  type BookFormat,
} from "./book-intelligence-kernel";

function config(overrides: Partial<BookConfig> = {}): BookConfig {
  return {
    title: "Libro test",
    subtitle: "",
    idea: "",
    tone: "chiaro",
    authorStyle: "Editoriale",
    language: "Italian",
    genre: "manual",
    category: "Non-Fiction",
    subcategory: "General",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 8,
    subchaptersEnabled: true,
    characters: [],
    ...overrides,
  } as BookConfig;
}

function expectKernel(input: Partial<BookConfig>, expected: {
  format: BookFormat;
  requiresCharacters: boolean;
  structureIncludes: string;
  strategy: string;
}) {
  const resolved = applyBookKernelToConfig(config(input));
  const kernel = resolveBookKernel({ config: resolved });
  const blueprint = buildFallbackBlueprintFromConfig(resolved);
  const report = validateFormatCoherence(resolved, blueprint);

  expect(kernel.bookFormat).toBe(expected.format);
  expect(kernel.requiresCharacters).toBe(expected.requiresCharacters);
  expect(kernel.structureModel).toContain(expected.structureIncludes);
  expect(kernel.generationStrategy).toBe(expected.strategy);
  expect(report.passed).toBe(true);
  return { resolved, kernel, blueprint };
}

describe("Book Intelligence Kernel", () => {
  it("keeps a dark poetic collection poetic, not a novel", () => {
    const { kernel, blueprint } = expectKernel({
      idea: "raccolta poetica oscura sul vuoto e la rinascita",
      bookFormat: "poetry_collection",
      genre: "poetry",
      category: "Poesia",
    }, {
      format: "poetry_collection",
      requiresCharacters: false,
      structureIncludes: "poetry_sections",
      strategy: "generatePoetryCollection",
    });

    expect(kernel.requiresPoems).toBe(true);
    expect(blueprint.chapterOutlines.map((outline) => outline.title).join(" ")).not.toMatch(/\bCapitolo\s+\d+\b/i);
  });

  it("keeps poems about toxic love as poetry, not dark romance", () => {
    const { kernel } = expectKernel({
      idea: "poesie sull'amore tossico",
      genre: "poetry",
      category: "Poesia",
    }, {
      format: "poetry_collection",
      requiresCharacters: false,
      structureIncludes: "poetry_sections",
      strategy: "generatePoetryCollection",
    });

    expect(kernel.forbiddenPatterns.join(" ")).toMatch(/dark romance/i);
  });

  it("routes anxiety how-to as a responsible practical guide", () => {
    const { kernel } = expectKernel({
      idea: "manuale pratico per vincere l'ansia",
    }, {
      format: "psychology_guide",
      requiresCharacters: false,
      structureIncludes: "practical_chapters",
      strategy: "generatePsychologyGuide",
    });

    expect(kernel.requiresExercises).toBe(true);
    expect(kernel.forbiddenPatterns.join(" ")).toMatch(/diagnosi|cura/i);
  });

  it("routes narcissism guide as psychology guide with responsible warnings", () => {
    const { kernel } = expectKernel({
      idea: "guida sul narcisismo",
    }, {
      format: "psychology_guide",
      requiresCharacters: false,
      structureIncludes: "practical_chapters",
      strategy: "generatePsychologyGuide",
    });

    expect(kernel.qualityRules.join(" ")).toMatch(/diagnosticare|professionale|Esempi/i);
  });

  it("allows characters for a psychological novel about narcissism", () => {
    const { kernel } = expectKernel({
      idea: "romanzo psicologico sul narcisismo",
      genre: "thriller",
      category: "Fiction",
    }, {
      format: "novel",
      requiresCharacters: true,
      structureIncludes: "narrative_chapters",
      strategy: "generateNovel",
    });

    expect(kernel.requiresPlot).toBe(true);
  });

  it("keeps conflitto interiore poetic when poetry format is selected", () => {
    const kernel = resolveBookKernel({
      config: config({ bookFormat: "poetry_collection", idea: "conflitto interiore" }),
    });

    expect(kernel.bookFormat).toBe("poetry_collection");
    expect(kernel.requiresCharacters).toBe(false);
  });

  it("keeps conflitto interiore self-help when self-help format is selected", () => {
    const kernel = resolveBookKernel({
      config: config({ bookFormat: "self_help", idea: "conflitto interiore" }),
    });

    expect(kernel.bookFormat).toBe("self_help");
    expect(kernel.requiresExercises).toBe(true);
  });

  it("keeps conflitto interiore narrative when novel format is selected", () => {
    const kernel = resolveBookKernel({
      config: config({ bookFormat: "novel", idea: "conflitto interiore", genre: "thriller", category: "Fiction" }),
    });

    expect(kernel.bookFormat).toBe("novel");
    expect(kernel.requiresCharacters).toBe(true);
  });

  it("routes Amazon sales manual as business book", () => {
    const { kernel } = expectKernel({
      idea: "manuale business per vendere libri su Amazon",
    }, {
      format: "business_book",
      requiresCharacters: false,
      structureIncludes: "practical_chapters",
      strategy: "generateBusinessBook",
    });

    expect(kernel.allowedStructures.join(" ")).toMatch(/framework|checklist|piano operativo/i);
  });

  it("routes horror story collection as multiple stories, not one novel", () => {
    const { kernel } = expectKernel({
      idea: "raccolta di racconti horror",
      genre: "horror",
      category: "Fiction",
    }, {
      format: "short_story_collection",
      requiresCharacters: true,
      structureIncludes: "short_story_units",
      strategy: "generateShortStoryCollection",
    });

    expect(kernel.allowedStructures.join(" ")).toMatch(/racconti autonomi/i);
  });

  it("routes safety exam material as study material", () => {
    const { kernel } = expectKernel({
      idea: "materiale studio per esame sicurezza sul lavoro",
    }, {
      format: "study_material",
      requiresCharacters: false,
      structureIncludes: "study_modules",
      strategy: "generateStudyMaterial",
    });

    expect(kernel.allowedStructures.join(" ")).toMatch(/quiz|flashcard|verifiche/i);
  });

  it("routes self-esteem workbook as workbook or self-help operative format", () => {
    const kernel = resolveBookKernel({ config: config({ idea: "workbook per autostima" }) });

    expect(["workbook", "self_help"]).toContain(kernel.bookFormat);
    expect(kernel.requiresPlot).toBe(false);
    expect(kernel.requiresExercises || kernel.requiresWorkbook).toBe(true);
  });

  it("routes difficult-life rebirth memoir as memoir", () => {
    const { kernel } = expectKernel({
      idea: "memoir sulla mia rinascita dopo un periodo difficile",
    }, {
      format: "memoir",
      requiresCharacters: true,
      structureIncludes: "memoir_arc",
      strategy: "generateMemoir",
    });

    expect(kernel.forbiddenPatterns.join(" ")).toMatch(/fantasy inventato/i);
  });

  it("routes courage fairy tale as children book", () => {
    const { kernel } = expectKernel({
      idea: "favola per bambini sul coraggio",
    }, {
      format: "children_book",
      requiresCharacters: true,
      structureIncludes: "compact_narrative_chapters",
      strategy: "generateChildrenBook",
    });

    expect(kernel.qualityRules.join(" ")).toMatch(/eta|Morale/i);
  });

  it("routes solitude power as essay", () => {
    const { kernel } = expectKernel({
      idea: "saggio sul potere della solitudine",
    }, {
      format: "essay",
      requiresCharacters: false,
      structureIncludes: "essay_arguments",
      strategy: "generateEssay",
    });

    expect(kernel.allowedStructures.join(" ")).toMatch(/tesi|argomenti|conclusione/i);
  });

  it("routes academic book as academic, not study summary or novel", () => {
    const { kernel } = expectKernel({
      idea: "libro accademico sulla sociologia urbana",
    }, {
      format: "academic_book",
      requiresCharacters: false,
      structureIncludes: "academic_chapters",
      strategy: "generateAcademicBook",
    });

    expect(kernel.contentLock).toBe("academic");
    expect(kernel.publishingStandards.readerExpectations.join(" ")).toMatch(/tesi|metodo|fonti/i);
  });

  it("routes picture book as illustrated narrative spreads", () => {
    const { kernel } = expectKernel({
      idea: "albo illustrato per bambini sulla paura del buio",
    }, {
      format: "picture_book",
      requiresCharacters: true,
      structureIncludes: "picture_book_spreads",
      strategy: "generatePictureBook",
    });

    expect(kernel.structureLock).toBe("stories");
    expect(kernel.exportIntelligence.layoutProfile).toMatch(/narrative|professional|study|poetry|workbook|recipe/i);
  });

  it("routes psychological horror as novel, not psychology guide", () => {
    const { kernel } = expectKernel({
      idea: "horror psicologico in una casa isolata",
      genre: "horror",
      category: "Fiction",
    }, {
      format: "novel",
      requiresCharacters: true,
      structureIncludes: "narrative_chapters",
      strategy: "generateNovel",
    });

    expect(kernel.bookFormat).toBe("novel");
    expect(kernel.bookFormat).not.toBe("psychology_guide");
  });

  it("routes psychological thriller as novel, not psychology guide", () => {
    const kernel = resolveBookKernel({
      idea: "thriller psicologico con indagine e sospetti",
      config: config({ genre: "thriller", category: "Fiction" }),
    });

    expect(kernel.bookFormat).toBe("novel");
    expect(kernel.bookFormat).not.toBe("psychology_guide");
  });

  it("routes reflective travel memoir as memoir, not travel guide", () => {
    const { kernel } = expectKernel({
      idea: "memoir di un viaggio interiore dopo una crisi",
    }, {
      format: "memoir",
      requiresCharacters: true,
      structureIncludes: "memoir_arc",
      strategy: "generateMemoir",
    });

    expect(kernel.bookFormat).toBe("memoir");
    expect(kernel.bookFormat).not.toBe("travel_guide");
  });

  it("routes travel guide as practical travel sections", () => {
    const { kernel } = expectKernel({
      idea: "guida di viaggio con itinerari di 7 giorni in Sicilia",
    }, {
      format: "travel_guide",
      requiresCharacters: false,
      structureIncludes: "travel_sections",
      strategy: "generateTravelGuide",
    });

    expect(kernel.commercialIntelligence.keywords.join(" ")).toMatch(/travel_guide|itinerario|destinazioni/i);
  });

  it("routes historical analysis as research blueprint", () => {
    const { kernel } = expectKernel({
      idea: "analisi storica delle cause della Prima guerra mondiale",
    }, {
      format: "historical_analysis",
      requiresCharacters: false,
      structureIncludes: "research_sections",
      strategy: "generateHistoricalAnalysis",
    });

    expect(kernel.blueprintType).toBe("ResearchBlueprint");
    expect(kernel.qualityGate.rejectIf.join(" ")).toMatch(/anacronismi|fonti inventate/i);
  });

  it("routes research book as method-driven research", () => {
    const { kernel } = expectKernel({
      idea: "research book su intelligenza artificiale e apprendimento",
    }, {
      format: "research_book",
      requiresCharacters: false,
      structureIncludes: "research_sections",
      strategy: "generateResearchBook",
    });

    expect(kernel.bestsellerIntelligence.primaryMetrics.join(" ")).toMatch(/accuratezza|verificabilita/i);
  });

  it("routes hybrid book without forcing a novel", () => {
    const { kernel } = expectKernel({
      idea: "libro ibrido con diario, esercizi e brevi riflessioni",
    }, {
      format: "hybrid_book",
      requiresCharacters: false,
      structureIncludes: "mixed_structure",
      strategy: "generateHybridBook",
    });

    expect(kernel.contentLock).toBe("hybrid");
    expect(kernel.requiresPlot).toBe(false);
  });

  it("emits the universal lock contract in the prompt block", () => {
    const prompt = buildBookKernelPromptBlock(config({
      bookFormat: "workbook",
      idea: "workbook per autostima",
    }));

    expect(prompt).toMatch(/FORMAT_LOCK: workbook/);
    expect(prompt).toMatch(/CONTENT_LOCK:/);
    expect(prompt).toMatch(/STRUCTURE_LOCK:/);
    expect(prompt).toMatch(/PROMISE_LOCK:/);
    expect(prompt).toMatch(/QUALITY_LOCK:/);
    expect(prompt).toMatch(/PUBLISHING_STANDARDS:/);
    expect(prompt).toMatch(/BESTSELLER_INTELLIGENCE:/);
    expect(prompt).toMatch(/COMMERCIAL_INTELLIGENCE:/);
    expect(prompt).toMatch(/EXPORT_INTELLIGENCE:/);
  });

  it("keeps format-specific bestseller and export standards distinct", () => {
    const poetry = resolveBookKernel({ config: config({ bookFormat: "poetry_collection" }) });
    const workbook = resolveBookKernel({ config: config({ bookFormat: "workbook" }) });
    const novel = resolveBookKernel({ config: config({ bookFormat: "novel", genre: "thriller" }) });

    expect(poetry.bestsellerIntelligence.primaryMetrics.join(" ")).toMatch(/musicalita|immagini/i);
    expect(workbook.bestsellerIntelligence.primaryMetrics.join(" ")).toMatch(/completabilita|tracking/i);
    expect(novel.bestsellerIntelligence.primaryMetrics.join(" ")).toMatch(/conflitto|payoff/i);
    expect(poetry.exportIntelligence.layoutProfile).not.toBe(workbook.exportIntelligence.layoutProfile);
  });

  it("allows future formats to register through the kernel registry", () => {
    const base = getKernelTemplate("manual");
    const registered = registerBookKernelTemplate("field guide", {
      ...base,
      bookFormat: "field_guide",
      defaultGenre: base.genre,
      defaultTone: base.tone,
      contentMode: "reference",
      structureModel: "travel_sections",
      generationStrategy: "generateTravelGuide",
      commercialPromise: "promessa field guide: riconoscere, consultare e agire sul campo",
      allowedStructures: ["schede", "osservazione", "identificazione", "checklist"],
      forbiddenPatterns: ["romanzo automatico", "trama forzata"],
      qualityRules: ["Schede consultabili.", "Informazioni verificabili.", "Uso sul campo."],
    }, { aliases: [/field guide/i], bookTypeId: "manual" });

    const kernel = resolveBookKernel({ config: config({ bookFormat: "field guide" }) });
    expect(listBookKernelFormats()).toContain(registered);
    expect(kernel.bookFormat).toBe(registered);
    expect(kernel.commercialPromise).toMatch(/field guide/i);
  });
});
