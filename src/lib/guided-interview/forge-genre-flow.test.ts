import { describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "./question-engine";
import { FORGE_GENRE_OPENING_QUESTION_ID } from "./forge-genre-catalog";
import { getForgeMemory } from "./interview-memory";
import { selectAdaptiveGenreQuestion } from "./adaptive-genre-interview";

describe("forge genre-first flow", () => {
  it("queues genre selection before first user answer", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const next = getNextInterviewQuestion(state);
    expect(next.done).toBe(false);
    expect(next.question?.id).toBe(FORGE_GENRE_OPENING_QUESTION_ID);
    expect(next.question?.question).toMatch(/Che tipo di libro/i);
  });

  it("locks genre from catalog chip and skips genre re-ask", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Romanzo · Dark Romance · dark-romance · Narrativa");
    const memory = getForgeMemory(state);
    expect(memory.slotValues.genre).toMatch(/Dark Romance/i);
    expect(memory.answeredSlots.genre).toBe(true);

    const next = getNextInterviewQuestion(state);
    expect(next.question?.id).not.toBe(FORGE_GENRE_OPENING_QUESTION_ID);
    expect(next.question?.id).not.toBe("genre-direction");
  });

  it("serves dark romance adaptive questions after genre lock", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Romanzo · Dark Romance · dark-romance · Narrativa");
    const adaptive = selectAdaptiveGenreQuestion(getForgeMemory(state));
    expect(adaptive?.id).toMatch(/^adaptive-dr-/);
  });
});
