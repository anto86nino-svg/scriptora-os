import { describe, expect, it } from "vitest";
import {
  buildDnaLockFromInterviewState,
  buildInitialDnaLock,
  getDnaLockReadinessMessage,
} from "./dna-lock";

describe("guided interview DNA lock", () => {
  it("starts as not ready for blueprint", () => {
    const lock = buildInitialDnaLock();

    expect(lock.readyForBlueprint).toBe(false);
    expect(lock.confidenceScore).toBe(0.1);
    expect(lock.missingCriticalAnswers.length).toBe(7);
    expect(lock.whatBookIs).toEqual([]);
    expect(lock.antiDriftRules).toEqual([]);
  });

  it("derives book identity and anti-drift rules from interview answers", () => {
    const lock = buildDnaLockFromInterviewState({
      completed: false,
      currentStep: 3,
      confidence: 0.74,
      messages: [],
      selectedGenre: "self-help",
      extracted: {
        readerTransformation:
          "Aiutare adulti stressati a ritrovare disciplina, calma e direzione quotidiana.",
        centralConflict:
          "Il lettore si sente bloccato tra troppe responsabilità e nessuna energia mentale.",
        emotionalTone:
          "Caldo, diretto, incoraggiante, pratico, senza diventare motivazionale vuoto.",
        genreDNA:
          "Self-help pratico con esercizi brevi, esempi concreti e tono umano.",
        promise:
          "Un metodo semplice per riprendere controllo delle giornate senza perfezionismo.",
        setting:
          "Vita quotidiana moderna, lavoro, famiglia, stanchezza, caos digitale.",
        targetReader:
          "Professionisti e creativi under pressure che procrastinano per perfezionismo.",
      },
    } as any);

    expect(lock.readyForBlueprint).toBe(true);
    expect(lock.confidenceScore).toBeGreaterThanOrEqual(0.95);
    expect(lock.missingCriticalAnswers).toEqual([]);
    expect(lock.whatBookIs.join(" ")).toContain("disciplina");
    expect(lock.antiDriftRules.join(" ")).toContain("Preserva sempre");
  });

  it("blocks blueprint readiness when critical answers are missing", () => {
    const lock = buildDnaLockFromInterviewState({
      completed: false,
      currentStep: 1,
      confidence: 0.35,
      messages: [],
      selectedGenre: "romance",
      extracted: {
        emotionalTone: "Doloroso, intimo, lento, pieno di silenzi.",
      },
    } as any);

    expect(lock.readyForBlueprint).toBe(false);
    expect(lock.missingCriticalAnswers).toContain("readerTransformation");
    expect(lock.missingCriticalAnswers).toContain("centralConflict");
    expect(getDnaLockReadinessMessage(lock)).toContain("Servono ancora");
  });
});
