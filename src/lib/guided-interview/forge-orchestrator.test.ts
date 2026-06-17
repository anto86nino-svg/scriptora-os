import { describe, expect, it } from "vitest";
import { applyInterviewAnswer, getInitialInterviewState } from "./question-engine";
import {
  canEnterFinalDecisionMode,
  consultForgeBrains,
  evaluateAuthorDecision,
  evaluateDnaLockPremium,
  formatAdvisorEvaluation,
  getPassiveCommercialNotes,
} from "./forge-orchestrator";

describe("forge orchestrator", () => {
  it("consults multiple brains without throwing", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "dark romance in italiano tra una ragazza fragile e Damien estremamente possessivo",
    );
    const insights = consultForgeBrains(state);
    expect(insights.length).toBeGreaterThan(4);
    expect(insights.some((item) => item.brain === "character")).toBe(true);
    expect(insights.some((item) => item.brain === "canon")).toBe(true);
  });

  it("evaluates possessive antagonist with editorial caution", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const evaluation = evaluateAuthorDecision(
      state,
      "Damien è estremamente possessivo e controlla ogni suo passo",
      "antagonistDesire",
    );
    expect(evaluation).not.toBeNull();
    expect(evaluation?.verdict).toBe("caution");
    expect(formatAdvisorEvaluation(evaluation!)).toMatch(/Funziona/i);
    expect(formatAdvisorEvaluation(evaluation!)).toMatch(/monodimensionale|vulnerabilit/i);
  });

  it("blocks final decision mode until structure exists", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "dark romance tra due persone ferite");
    expect(canEnterFinalDecisionMode(state)).toBe(false);
  });

  it("returns passive commercial notes without blocking", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      extracted: {
        genre: "dark-romance",
        promise:
          "Desiderio proibito tra due persone ferite con tensione ossessiva e vulnerabilità estrema.",
        bookTitle: "Amore",
      },
    };
    const notes = getPassiveCommercialNotes(state);
    expect(notes.length).toBeLessThanOrEqual(2);
  });

  it("builds premium dna lock report", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "thriller psicologico in italiano con mistero e pressione crescente",
    );
    const report = evaluateDnaLockPremium(state);
    expect(report.insights.length).toBeGreaterThan(0);
    expect(Array.isArray(report.incoherences)).toBe(true);
    expect(Array.isArray(report.commercialNotes)).toBe(true);
  });
});
