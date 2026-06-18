import { describe, expect, it } from "vitest";
import { applyInterviewAnswer, getInitialInterviewState, getInterviewProgress } from "./question-engine";
import { getForgeMemory, updateForgeMemoryFromAnswer } from "./interview-memory";
import {
  advanceStoryRoomStage,
  buildStoryRoomProgressTrail,
  getStoryRoomMachine,
  getStoryRoomProgressPercent,
  wasStoryRoomQuestionAsked,
} from "./story-room-state-machine";
import { FORGE_GENRE_OPENING_QUESTION_ID } from "./forge-genre-catalog";

function answer(state: ReturnType<typeof getInitialInterviewState>, text: string, q?: { id: string; key: string }) {
  return applyInterviewAnswer(state, text, q);
}

describe("story-room-state-machine", () => {
  it("completes genre stage after genre answer", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Dark Romance", {
      id: FORGE_GENRE_OPENING_QUESTION_ID,
      key: "genre",
    });
    const memory = getForgeMemory(state);
    const machine = getStoryRoomMachine(memory);
    expect(machine.completedStageIds).toContain("genre");
    expect(machine.currentStageId).not.toBe("genre");
  });

  it("completes tone stage after tone answer", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Dark Romance", { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" });
    state = answer(state, "Italian", { id: "language-confirmation", key: "language" });
    state = answer(
      state,
      "Tono cupo, magnetico e pericoloso — il lettore deve uscire elettrizzato.",
      { id: "tone-preset", key: "emotionalTone" },
    );
    const memory = getForgeMemory(state);
    expect(memory.slotValues.tone).toBeTruthy();
    expect(getStoryRoomMachine(memory).completedStageIds).toContain("tone");
  });

  it("completes promise stage after promise answer", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Dark Romance", { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" });
    state = answer(state, "Italian", { id: "language-confirmation", key: "language" });
    state = answer(state, "Tono dark e sensuale", { id: "tone-preset", key: "emotionalTone" });
    state = answer(
      state,
      "Lettori che cercano tensione romantica e confini morali.",
      { id: "audience-preset", key: "targetReader" },
    );
    state = answer(
      state,
      "Promessa: desiderio proibito che costa l'anima.",
      { id: "promise-preset", key: "promise" },
    );
    const memory = getForgeMemory(state);
    expect(getStoryRoomMachine(memory).completedStageIds).toContain("promise");
  });

  it("auto-answer selection fills slot and advances stage", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Thriller", { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" });
    state = answer(state, "English", { id: "language-confirmation", key: "language" });
    state = answer(state, "Dark and relentless — reader must feel hunted.", {
      id: "tone-preset",
      key: "emotionalTone",
    });
    const before = getStoryRoomProgressPercent(getForgeMemory(state));
    state = answer(state, "Readers who crave moral pressure and high stakes.", {
      id: "audience-preset",
      key: "targetReader",
    });
    const after = getStoryRoomProgressPercent(getForgeMemory(state));
    expect(after).toBeGreaterThan(before);
    expect(getForgeMemory(state).slotValues.audience).toBeTruthy();
  });

  it("progress increases when stages complete — not stuck at 25%", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Dark Romance", { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" });
    state = answer(state, "Italian", { id: "language-confirmation", key: "language" });
    state = answer(state, "Tono dark, sensuale e pericoloso", { id: "tone-preset", key: "emotionalTone" });
    state = answer(state, "Lettori adulti che amano tensione romantica", { id: "audience-preset", key: "targetReader" });
    state = answer(state, "Desiderio proibito che distrugge entrambi", { id: "promise-preset", key: "promise" });
    const pct = getInterviewProgress(state).stagePercent;
    expect(pct).toBeGreaterThan(25);
  });

  it("does not repeat the same question id", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Dark Romance", { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" });
    const memory = getForgeMemory(state);
    expect(wasStoryRoomQuestionAsked(memory, FORGE_GENRE_OPENING_QUESTION_ID)).toBe(true);
  });

  it("forces stage advance after max questions in stage", () => {
    let memory = getForgeMemory(getInitialInterviewState({ chatFirst: true }));
    memory.slotValues.genre = "dark-romance";
    memory.answeredSlots.genre = true;
    memory.storyRoomMachine = {
      currentStageId: "tone",
      completedStageIds: ["idea", "language", "genre"],
      askedQuestionIds: ["tone-preset", "tone-preset-2"],
      completedSlotKeys: ["genre", "language", "rawIdea"],
      questionCountByStage: { tone: 2 },
    };
    memory = advanceStoryRoomStage(memory, {
      lastAnswer: "Tono provvisorio cupo e magnetico",
    });
    expect(memory.slotValues.tone).toBeTruthy();
    expect(getStoryRoomMachine(memory).currentStageId).not.toBe("tone");
  });

  it("dark romance progresses through characters without blocking", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Dark Romance", { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" });
    state = answer(state, "Italian", { id: "language-confirmation", key: "language" });
    state = answer(state, "Tono dark e ossessivo", { id: "tone-preset", key: "emotionalTone" });
    state = answer(state, "Lettori adulti", { id: "audience-preset", key: "targetReader" });
    state = answer(state, "Desiderio proibito", { id: "promise-preset", key: "promise" });
    state = answer(state, "Lei è fragile ma determinata — ferita dal tradimento.", {
      id: "characters-protagonist",
      key: "protagonistWound",
    });
    const trail = buildStoryRoomProgressTrail(getForgeMemory(state));
    expect(trail.percent).toBeGreaterThan(40);
    expect(trail.currentStageId).toBe("characters");
  });

  it("enters blueprintReady when minimum stages complete", () => {
    let memory = getForgeMemory(getInitialInterviewState({ chatFirst: true }));
    memory.slotValues = {
      rawIdea: "Storia dark romance tra due anime spezzate",
      language: "Italian",
      genre: "dark-romance",
      bookType: "Romanzo",
      tone: "Dark e sensuale",
      audience: "Lettori adulti",
      promise: "Desiderio proibito",
      protagonist: "Elena — ferita e determinata",
      antagonist: "Marco — ossessivo e magnetico",
      loveInterest: "Marco — attrazione pericolosa",
      stakes: "Perdere sé stessa",
      centralConflict: "Desiderio vs autodistruzione",
      chapterCount: "20",
      title: "Titolo provvisorio",
      frontMatter: "Dedica breve",
      endingDirection: "Finale devastante ma giusto",
    };
    for (const key of Object.keys(memory.slotValues)) {
      memory.answeredSlots[key as keyof typeof memory.answeredSlots] = true;
    }
    memory = advanceStoryRoomStage(memory);
    const trail = buildStoryRoomProgressTrail(memory);
    expect(trail.blueprintReady).toBe(true);
    expect(trail.percent).toBeGreaterThanOrEqual(90);
  });

  it("updateForgeMemoryFromAnswer advances machine", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const { memory } = updateForgeMemoryFromAnswer(
      state,
      "Dark Romance in italiano",
      { id: FORGE_GENRE_OPENING_QUESTION_ID, key: "genre" },
    );
    expect(getStoryRoomMachine(memory).completedStageIds.length).toBeGreaterThan(0);
  });
});
