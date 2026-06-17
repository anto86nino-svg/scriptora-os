import { describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
} from "./question-engine";

describe("guided interview question engine DNA lock integration", () => {
  it("updates dnaLock after an interview answer", () => {
    const initial = getInitialInterviewState({
      selectedGenre: "self-help",
      confidence: 0.2,
    });

    const next = applyInterviewAnswer(
      initial,
      "Aiutare persone stressate a ritrovare calma, disciplina e direzione quotidiana."
    );

    expect(next.dnaLock).toBeDefined();
    expect(next.dnaLock?.confidenceScore).toBeGreaterThan(0.15);
    expect(next.dnaLock?.readyForBlueprint).toBe(false);
    expect(next.dnaLock?.whatBookIs.join(" ")).toContain("calma");
  });

  it("keeps blueprint locked until the book identity is clear enough", () => {
    let state = getInitialInterviewState({
      selectedGenre: "self-help",
      confidence: 0.3,
    });

    state = applyInterviewAnswer(
      state,
      "Aiutare adulti stressati a ritrovare disciplina, calma e direzione quotidiana."
    );

    state = applyInterviewAnswer(
      state,
      "Il lettore si sente bloccato tra troppe responsabilità, caos digitale e poca energia mentale."
    );

    expect(state.dnaLock).toBeDefined();
    expect(state.dnaLock?.readyForBlueprint).toBe(false);
    expect(state.dnaLock?.missingCriticalAnswers.length).toBeGreaterThan(0);
  });
});
