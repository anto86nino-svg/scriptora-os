import { buildDeterministicBookConcept } from "../../../supabase/functions/_shared/book-concept-format.ts";
import {
  repairFormatPurityText,
  validateFormatPurity,
} from "../../../supabase/functions/_shared/format-purity-engine.ts";

describe("Format Purity Engine", () => {
  it("rejects the observed poetry contamination with pronoun action", () => {
    const result = validateFormatPurity({
      bookFormat: "poetry_collection",
      studioId: "poetry",
      text: "Lei progetta silenzi per dimostrare a suo fratello Luca che l'attrazione tra loro non puo' essere ignorata.",
    });

    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(98);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["poetry_pronoun_action", "poetry_story_frame", "poetry_common_names"]),
    );
  });

  it("rejects poetry fields contaminated by character language", () => {
    const result = validateFormatPurity({
      bookFormat: "poetry_collection",
      studioId: "poetry",
      text: "Voce poetica: protagonista ferita ma combattiva.",
      requireMandatorySections: false,
    });

    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(98);
    expect(result.issues.map((issue) => issue.code)).toContain("poetry_narrative_role");
  });

  it("repairs a contaminated poetry voice field", () => {
    const repaired = repairFormatPurityText({
      bookFormat: "poetry_collection",
      studioId: "poetry",
      text: "protagonista ferita ma combattiva",
    });

    expect(repaired.changed).toBe(true);
    expect(repaired.text).toBe("voce poetica intima, ferita ma resiliente");
    expect(repaired.purity.passed).toBe(true);
  });

  it("accepts a complete deterministic poetry concept", () => {
    const concept = buildDeterministicBookConcept({
      bookFormat: "poetry_collection",
      studioId: "poetry",
      genre: "poesia",
      centralDynamic: "Memoria e identita'",
      protagonistType: "protagonista ferita ma combattiva",
      setting: "Nebbia, acqua, mappe, luce",
      chapterCount: 60,
      subchaptersPerChapter: 4,
    });
    const result = validateFormatPurity({
      bookFormat: "poetry_collection",
      studioId: "poetry",
      text: concept,
    });

    expect(concept).toContain("Immagini ricorrenti");
    expect(concept).toContain("Numero sezioni");
    expect(concept).toContain("Numero poesie");
    expect(concept).not.toMatch(/protagonista|Luca|Lei progetta|promessa narrativa/i);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it("enforces workbook and study mandatory sections", () => {
    const workbook = validateFormatPurity({
      bookFormat: "workbook",
      studioId: "workbook",
      text: "Schede: 12. Esercizi: pratica. Progress tracker: settimanale. Attivita' settimanali: routine.",
    });
    const study = validateFormatPurity({
      bookFormat: "study_material",
      studioId: "study",
      text: "Moduli: base. Quiz: domande. Flashcard: definizioni. Verifiche: prove. Simulazioni: esame.",
    });

    expect(workbook.passed).toBe(true);
    expect(study.passed).toBe(true);
  });

  it("rejects practical formats with narrative contamination", () => {
    const manual = validateFormatPurity({
      bookFormat: "manual",
      studioId: "professional_guide",
      text: "Problema lettore: ansia. Metodo: pratica. Esercizi: diario. Checklist: passi. La trama segue una protagonista.",
    });

    expect(manual.passed).toBe(false);
    expect(manual.score).toBeLessThan(95);
  });
});
