import { describe, expect, it } from "vitest";
import { applyInterviewAnswer, getInitialInterviewState } from "./question-engine";
import { getForgeMemory, selectNextMemoryQuestion } from "./interview-memory";
import {
  hasNarrativeCore,
  isDeferredAdminSlot,
  isRomanceMode,
} from "./narrative-first-engine";

const DARK_ROMANCE_CHIP = "Romanzo · Dark Romance · dark-romance · Narrativa";

describe("narrative first engine", () => {
  it("defers admin slots until narrative core exists in romance fiction", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, DARK_ROMANCE_CHIP);
    const memory = getForgeMemory(state);

    expect(isRomanceMode(memory)).toBe(true);
    expect(hasNarrativeCore(memory)).toBe(false);
    expect(isDeferredAdminSlot(memory, "language")).toBe(true);
    expect(isDeferredAdminSlot(memory, "chapterCount")).toBe(true);
    expect(isDeferredAdminSlot(memory, "indexOutline")).toBe(true);
  });

  it("prioritizes protagonist over tone after romance recognition", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, DARK_ROMANCE_CHIP);
    state = applyInterviewAnswer(
      state,
      "voglio scrivere in italiano su una ragazza fragile e un uomo pericoloso",
    );
    const next = selectNextMemoryQuestion(state);
    expect(next?.id).not.toBe("language-confirmation");
    expect(next?.id).not.toBe("structure-preset");
    expect(next?.id).not.toBe("architect-index");
    expect(next?.id).toMatch(/tone-preset|language-confirmation|characters-protagonist|adaptive-dr-/);
  });

  it("does not ask index before narrative core", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "thriller psicologico tra due nemici che si riconoscono");
    const next = selectNextMemoryQuestion(state);
    expect(next?.id).not.toBe("architect-index");
    expect(next?.question ?? "").not.toMatch(/indice/i);
  });
});
