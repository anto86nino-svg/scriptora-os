import { describe, expect, it } from "vitest";
import {
  buildDnaLockFromInterviewState,
  buildInitialDnaLock,
  getDnaLockReadinessMessage,
} from "./dna-lock";
import { evolutionReadySelfHelpState } from "./evolution-test-fixture";

describe("guided interview DNA lock", () => {
  it("starts as not ready for blueprint", () => {
    const lock = buildInitialDnaLock();

    expect(lock.readyForBlueprint).toBe(false);
    expect(lock.confidenceScore).toBe(0.1);
    expect(lock.missingCriticalAnswers.length).toBe(7);
    expect(lock.whatBookIs).toEqual([]);
    expect(lock.antiDriftRules).toEqual([]);
  });

  it("derives book identity and anti-drift rules from a fully evolved interview", () => {
    const lock = buildDnaLockFromInterviewState(evolutionReadySelfHelpState());

    expect(lock.readyForBlueprint).toBe(true);
    expect(lock.confidenceScore).toBeGreaterThanOrEqual(0.95);
    expect(lock.missingCriticalAnswers).toEqual([]);
    expect(lock.whatBookIs.join(" ")).toContain("controllo");
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
