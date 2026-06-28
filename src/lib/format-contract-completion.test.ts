import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  applyBookKernelToConfig,
  deriveBookDNAFromKernel,
  resolveBookKernel,
  validateFormatCoherence,
} from "@/lib/book-intelligence";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import {
  formatExportUnitLabel,
  resolveExportLayoutFromConfig,
} from "@/lib/export-cleanup";
import {
  buildFormatQualityRepairPrompt,
  requiresFormatQualityRepair,
  validateFormatChapterQuality,
  validateNarrativeChapterQuality,
} from "@/lib/writing-quality-gate";

function baseConfig(overrides: Partial<BookConfig> = {}): BookConfig {
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

function pipelineFor(input: Partial<BookConfig>) {
  const resolved = applyBookKernelToConfig(baseConfig(input));
  const kernel = resolveBookKernel({ config: resolved });
  const blueprint = buildFallbackBlueprintFromConfig(resolved);
  const dna = deriveBookDNAFromKernel({ kernel, config: resolved });
  const coherence = validateFormatCoherence(resolved, blueprint);
  const exportLayout = resolveExportLayoutFromConfig(resolved);
  return { resolved, kernel, blueprint, dna, coherence, exportLayout };
}

const FORMAT_CASES = [
  {
    label: "Fantasy",
    input: {
      idea: "fantasy epico con regni in guerra e magia antica",
      genre: "fantasy" as const,
      category: "Fiction",
      subcategory: "Epic Fantasy",
    },
    format: "novel",
    narrativeRepair: true,
    exportUnit: "Capitolo",
    layoutProfile: "narrative-prose",
  },
  {
    label: "Dark Romance",
    input: {
      idea: "dark romance in una villa isolata con segreti familiari",
      genre: "dark romance" as const,
      category: "Fiction",
    },
    format: "novel",
    narrativeRepair: true,
    exportUnit: "Capitolo",
    layoutProfile: "narrative-prose",
  },
  {
    label: "Horror Gotico",
    input: {
      idea: "horror gotico in un maniero con misteri familiari",
      genre: "horror" as const,
      subcategory: "gotico",
      category: "Fiction",
    },
    format: "novel",
    narrativeRepair: true,
    exportUnit: "Capitolo",
    layoutProfile: "narrative-prose",
  },
  {
    label: "Raccolta Poetica",
    input: {
      idea: "raccolta poetica su memoria, luce e assenza",
      genre: "poetry" as const,
      category: "Poesia",
      bookFormat: "poetry_collection",
    },
    format: "poetry_collection",
    narrativeRepair: false,
    exportUnit: "Sezione",
    layoutProfile: "poetry-airy",
  },
  {
    label: "Manuale Ansia",
    input: {
      idea: "manuale pratico per gestire ansia e attacchi di panico",
      genre: "self-help" as const,
      category: "Psychology",
      subcategory: "ansia",
    },
    format: "psychology_guide",
    narrativeRepair: false,
    exportUnit: "Capitolo",
    layoutProfile: "professional-nonfiction",
  },
  {
    label: "Workbook",
    input: {
      idea: "workbook di 30 giorni per abitudini e tracker",
      genre: "workbook" as const,
      category: "Self-Help",
    },
    format: "workbook",
    narrativeRepair: false,
    exportUnit: "Scheda",
    layoutProfile: "interactive-workbook",
  },
  {
    label: "Study Material",
    input: {
      idea: "materiale di studio per esame universitario con quiz e flashcard",
      genre: "study" as const,
      category: "Education",
    },
    format: "study_material",
    narrativeRepair: false,
    exportUnit: "Modulo",
    layoutProfile: "study-reference",
  },
  {
    label: "Memoir",
    input: {
      idea: "memoir su un periodo difficile e la rinascita personale",
      genre: "memoir" as const,
      category: "Biography",
    },
    format: "memoir",
    narrativeRepair: true,
    exportUnit: "Fase",
    layoutProfile: "narrative-prose",
  },
  {
    label: "Business",
    input: {
      idea: "manuale business per vendere su Amazon con framework operativo",
      genre: "business" as const,
      category: "Business",
    },
    format: "business_book",
    narrativeRepair: false,
    exportUnit: "Capitolo",
    layoutProfile: "professional-nonfiction",
  },
] as const;

describe("Sprint 2 — format contract completion pipeline", () => {
  FORMAT_CASES.forEach((scenario) => {
    it(`${scenario.label}: Idea → BookDNA → Blueprint → export layout`, () => {
      const { kernel, blueprint, dna, coherence, exportLayout } = pipelineFor(scenario.input);

      expect(kernel.bookFormat).toBe(scenario.format);
      expect(dna.format).toBe(scenario.format);
      expect(blueprint.chapterOutlines.length).toBeGreaterThan(0);
      expect(coherence.passed).toBe(true);
      expect(exportLayout.layoutProfile).toBe(scenario.layoutProfile);
      expect(formatExportUnitLabel(1, pipelineFor(scenario.input).resolved, exportLayout)).toBe(`${scenario.exportUnit} 1`);
    });

    it(`${scenario.label}: repair routing (${scenario.narrativeRepair ? "narrative" : "format-dedicated"})`, () => {
      const { resolved } = pipelineFor(scenario.input);
      expect(requiresFormatQualityRepair(resolved)).toBe(!scenario.narrativeRepair);
    });
  });

  it("flags poetry plot contamination and builds kernel-aware repair prompt", () => {
    const { resolved } = pipelineFor({
      idea: "raccolta poetica",
      genre: "poetry",
      category: "Poesia",
      bookFormat: "poetry_collection",
    });

    const contaminated = `Il protagonista deve scoprire la verita'.
La trama si infittisce con un love interest e un cliffhanger seriale.
Lei corre verso la porta mentre il cast attende il climax.`;

    const report = validateFormatChapterQuality(contaminated, {
      config: resolved,
      language: "Italian",
      chapterTitle: "Sezione I",
    });

    expect(report.needsRepair).toBe(true);
    expect(report.issues.some((issue) => issue.kind === "format_contamination")).toBe(true);

    const prompt = buildFormatQualityRepairPrompt({
      chapterText: contaminated,
      report,
      config: resolved,
      language: "Italian",
      chapterTitle: "Sezione I",
    });

    expect(prompt).toContain("poetry_collection");
    expect(prompt).toContain("immagini");
    expect(prompt).not.toContain("trama, personaggi");
  });

  it("flags workbook missing exercises and rejects narrative scenes", () => {
    const { resolved } = pipelineFor({
      idea: "workbook abitudini",
      genre: "workbook",
      category: "Self-Help",
    });

    const weak = `Questo capitolo racconta una scena tra due personaggi.
Il dialogo spiega il tema mentre l'arco narrativo avanza verso il climax.`;

    const report = validateFormatChapterQuality(weak, {
      config: resolved,
      language: "Italian",
      chapterTitle: "Scheda 1",
    });

    expect(report.needsRepair).toBe(true);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it("flags study material missing modules/quiz structure", () => {
    const { resolved } = pipelineFor({
      idea: "materiale di studio",
      genre: "study",
      category: "Education",
    });

    const weak = `Un lungo paragrafo descrittivo senza obiettivi didattici, definizioni o verifiche strutturate.
Il testo parla di personaggi e trama come se fosse un romanzo breve.`;

    const report = validateFormatChapterQuality(weak, {
      config: resolved,
      language: "Italian",
      chapterTitle: "Modulo 1",
    });

    expect(report.needsRepair).toBe(true);
  });

  it("keeps narrative fantasy on narrative quality gate, not format-dedicated repair", () => {
    const { resolved } = pipelineFor({
      idea: "fantasy epico",
      genre: "fantasy",
      category: "Fiction",
    });

    expect(requiresFormatQualityRepair(resolved)).toBe(false);

    const chapter = `La mattina, Elena trovo' una chiave nera nella tasca del cappotto.
Nel pomeriggio la porto' alla serra, dove il lucchetto cedette con un rumore secco.
Dopo una lunga notte senza sonno, la mattina dopo scelse di non mostrarla a nessuno.`;

    const report = validateNarrativeChapterQuality(chapter, {
      config: resolved,
      genre: "fantasy",
      language: "Italian",
    });

    expect(report.passed).toBe(true);
  });

  it("poetry export preserves line-break layout settings", () => {
    const { resolved, exportLayout } = pipelineFor({
      idea: "raccolta poetica",
      genre: "poetry",
      category: "Poesia",
    });

    expect(exportLayout.preserveLineBreaks).toBe(true);
    expect(exportLayout.useDropCap).toBe(false);
    expect(exportLayout.unitLabelKey).toBe("section");
    expect(resolveExportLayoutFromConfig(resolved).layoutProfile).toBe("poetry-airy");
  });

  it("memoir export uses life-phase unit label with narrative ornament", () => {
    const { exportLayout } = pipelineFor({
      idea: "memoir personale",
      genre: "memoir",
      category: "Biography",
    });

    expect(exportLayout.unitLabelKey).toBe("phase");
    expect(exportLayout.useChapterOrnament).toBe(true);
    expect(formatExportUnitLabel(2, baseConfig({ genre: "memoir", language: "Italian" }), exportLayout)).toBe("Fase 2");
  });
});
