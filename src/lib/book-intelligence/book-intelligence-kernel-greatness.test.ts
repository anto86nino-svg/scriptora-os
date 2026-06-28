import { describe, expect, it } from "vitest";
import {
  enrichBookKernelWithQuality,
  evaluateKernelGreatness,
  isGenericCommercialText,
  refineConceptWithBookKernel,
  resolveBookKernel,
} from "./book-intelligence-kernel";

describe("Book Intelligence Kernel greatness views", () => {
  it("keeps BookDNA, reader psychology, greatness and readiness inside the Kernel snapshot", () => {
    const kernel = resolveBookKernel({
      explicitBookFormat: "poetry_collection",
      config: {
        genre: "poetry" as any,
        subcategory: "poesia contemporanea",
        targetReader: "Lettori di poesia contemporanea intima.",
      },
      idea: "Tema centrale: memoria e identita'. Immagini ricorrenti: nebbia, acqua, mappe, luce.",
    });

    expect(kernel.bookFormat).toBe("poetry_collection");
    expect(kernel.readerPsychology.primaryDesire).toMatch(/voce/i);
    expect(kernel.bookDNA.format).toBe("poetry_collection");
    expect(kernel.greatnessScore.scores.formatCoherence).toBeGreaterThanOrEqual(95);
    expect(kernel.publishingReadiness.status).toMatch(/ready|needs_improvement/);
  });

  it("flags generic commercial copy before it becomes canonical", () => {
    expect(isGenericCommercialText("Una storia intensa dove amore e destino cambieranno tutto.")).toBe(true);

    const kernel = resolveBookKernel({ explicitBookFormat: "novel", config: { genre: "romance" as any } });
    const report = evaluateKernelGreatness({
      kernel,
      text: "La colpa dei baci impossibili. Una storia intensa dove amore e destino cambieranno tutto.",
    });

    expect(report.status).not.toBe("show");
    expect(report.scores.genericityRisk).toBeGreaterThanOrEqual(48);
  });

  it("refines weak poetry concepts without introducing narrative contamination", () => {
    const kernel = resolveBookKernel({
      explicitBookFormat: "poetry_collection",
      config: {
        genre: "poetry" as any,
        subcategory: "poesia contemporanea",
        chapterCount: 60,
        subchaptersPerChapter: 4,
      } as any,
    });
    const refined = refineConceptWithBookKernel({
      kernel,
      config: {
        bookFormat: "poetry_collection",
        genre: "poetry" as any,
        centralDynamic: "Memoria e identita'",
        setting: "Nebbia, acqua, mappe, luce",
        chapterCount: 60,
        subchaptersPerChapter: 4,
      } as any,
      text: "Una raccolta guidata da immagini.",
    });

    expect(refined.changed).toBe(true);
    expect(refined.text).toContain("Tema centrale");
    expect(refined.text).toContain("Voce poetica");
    expect(refined.text).toContain("Numero poesie");
    expect(refined.text).not.toMatch(/protagonista|trama|promessa narrativa|Luca/i);
    expect(refined.kernel.bookDNA.dominantImage).toMatch(/Nebbia|acqua|mappe|luce/i);
  });

  it("derives manual anxiety psychology around transformation and exercises", () => {
    const kernel = resolveBookKernel({
      explicitBookFormat: "self_help",
      config: {
        genre: "self-help" as any,
        targetReader: "Persone con ansia quotidiana che cercano strumenti pratici.",
        promise: "Da ansia confusa a strumenti quotidiani di autoregolazione.",
      } as any,
      idea: "Problema lettore: ansia quotidiana. Metodo: esercizi, checklist e piano d'azione.",
    });

    expect(kernel.readerPsychology.primaryDesire).toMatch(/miglioramento concreto|capire cosa fare/i);
    expect(kernel.bookDNA.centralPromise).toMatch(/ansia/i);
    expect(kernel.greatnessScore.scores.promiseStrength).toBeGreaterThanOrEqual(64);
  });

  it("keeps workbook and study material focused on learning actions", () => {
    const workbook = resolveBookKernel({
      explicitBookFormat: "workbook",
      idea: "Schede, esercizi, progress tracker e attivita' settimanali per autostima pratica.",
    });
    const study = resolveBookKernel({
      explicitBookFormat: "study_material",
      idea: "Moduli di biologia cellulare con quiz, flashcard, simulazioni e obiettivi di apprendimento.",
    });

    expect(workbook.readerPsychology.curiosityTriggers.join(" ")).toMatch(/schede|tracker|attivita/i);
    expect(study.readerPsychology.curiosityTriggers).toEqual(expect.arrayContaining(["moduli", "quiz", "flashcard"]));
    expect(study.greatnessScore.scores.readerPotential).toBeGreaterThanOrEqual(60);
  });

  it("keeps dark romance relationship-led and gothic horror atmosphere-led", () => {
    const darkRomance = enrichBookKernelWithQuality({
      kernel: resolveBookKernel({ explicitBookFormat: "novel", config: { genre: "dark romance" as any, subcategory: "friends to lovers" } }),
      text: "Due amici affrontano desiderio, ferita e fiducia spezzata; il mistero resta pressione esterna sulla relazione.",
    });
    const gothic = enrichBookKernelWithQuality({
      kernel: resolveBookKernel({ explicitBookFormat: "novel", config: { genre: "horror" as any, subcategory: "gotico" } }),
      text: "Una casa in decadenza crea atmosfera, inquietudine, paura e una minaccia che cresce nei dettagli.",
    });

    expect(darkRomance.greatnessScore.scores.genreCoherence).toBeGreaterThanOrEqual(80);
    expect(gothic.greatnessScore.scores.genreCoherence).toBeGreaterThanOrEqual(80);
  });
});
