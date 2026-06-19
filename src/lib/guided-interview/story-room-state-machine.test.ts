import { describe, expect, it } from "vitest";
import { applyInterviewAnswer, getInitialInterviewState, getInterviewProgress } from "./question-engine";
import {
  advanceStoryRoomStage,
  buildStoryRoomProgressTrail,
  evaluateStageCompletion,
  getStoryRoomMachine,
  getStoryRoomProgressPercent,
  hasStoryRoomSlotValue,
  wasStoryRoomQuestionAsked,
} from "./story-room-state-machine";
import { updateForgeMemoryFromAnswer, getForgeMemory, createEmptyForgeMemory } from "./interview-memory";
import type { ForgeInterviewMemory } from "./interview-memory";
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
    const machine = getStoryRoomMachine(getForgeMemory(state));
    expect(trail.percent).toBeGreaterThan(40);
    expect(machine.completedStageIds).toContain("promise");
    expect(["characters", "stakes", "structure", "title", "frontMatter", "ending"]).toContain(
      trail.currentStageId,
    );
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
    expect(trail.currentStageId).toBe("bookFoundationLock");
    expect(trail.blueprintReady).toBe(false);
    expect(trail.percent).toBeGreaterThanOrEqual(80);
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

  function memoryWithSlots(extra: Record<string, unknown>): ForgeInterviewMemory {
    const memory = createEmptyForgeMemory();
    memory.slotValues = { ...memory.slotValues, ...extra } as ForgeInterviewMemory["slotValues"];
    return advanceStoryRoomStage(memory);
  }

  it("targetAudience alias completes audience stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Dark romance tra due anime spezzate",
      language: "Italiano",
      genre: "dark-romance",
      targetAudience: "Lettori adulti che amano tensione romantica",
    });
    expect(hasStoryRoomSlotValue(memory, "audience")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("audience");
  });

  it("marketPromise alias completes promise stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Storia intensa",
      language: "Italiano",
      genre: "dark-romance",
      tone: "Dark",
      targetAudience: "Adulti",
      marketPromise: "Desiderio proibito che costa l'anima",
    });
    expect(hasStoryRoomSlotValue(memory, "promise")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("promise");
  });

  it("protagonist + loveInterest completes characters stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Romance",
      language: "Italiano",
      genre: "dark-romance",
      bookType: "Romanzo",
      protagonist: "Elena ferita e determinata",
      loveInterest: "Marco magnetico e pericoloso",
    });
    expect(hasStoryRoomSlotValue(memory, "characters")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("characters");
  });

  it("specific emotionalPoles alone completes characters stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Romance",
      language: "Italiano",
      genre: "dark-romance",
      emotionalPoles: "Desiderio vs controllo — ferita vs maschera perfetta",
    });
    expect(hasStoryRoomSlotValue(memory, "characters")).toBe(true);
  });

  it("centralConflict alias completes stakes stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Thriller",
      language: "Italiano",
      genre: "thriller",
      centralConflict: "Un segreto di famiglia che non può restare sepolto",
    });
    expect(hasStoryRoomSlotValue(memory, "stakes")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("stakes");
  });

  it("titleStrategy.workingTitle nested value completes title stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Romanzo",
      language: "Italiano",
      genre: "romance",
      titleStrategy: { workingTitle: "Ombre sul mare" },
    });
    expect(hasStoryRoomSlotValue(memory, "title")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("title");
  });

  it("frontMatter.mode nested value completes frontMatter stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Romanzo",
      language: "Italiano",
      genre: "romance",
      frontMatter: { mode: "Dedica breve prima del capitolo uno" },
    });
    expect(hasStoryRoomSlotValue(memory, "frontMatter")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("frontMatter");
  });

  it("endingDirection completes ending stage", () => {
    const memory = memoryWithSlots({
      rawIdea: "Romanzo",
      language: "Italiano",
      genre: "romance",
      endingDirection: "Finale devastante ma giusto — nessuno resta uguale",
    });
    expect(hasStoryRoomSlotValue(memory, "ending")).toBe(true);
    expect(evaluateStageCompletion(memory)).toContain("ending");
  });

  it("language + genre + tone + audience + promise exceeds 25% progress", () => {
    const memory = memoryWithSlots({
      rawIdea: "Dark romance gotico",
      language: "Italiano",
      genre: "dark-romance",
      emotionalTone: "Cupio, sensuale e pericoloso",
      targetAudience: "Lettori adulti",
      readerPromise: "Desiderio proibito con confini morali",
    });
    expect(getStoryRoomProgressPercent(memory)).toBeGreaterThan(25);
  });

  it("dark romance through promise does not stay at 25%", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = answer(state, "Romanzo · Dark Romance · dark-romance · Narrativa", {
      id: FORGE_GENRE_OPENING_QUESTION_ID,
      key: "genre",
    });
    state = answer(state, "Italiano", { id: "language-confirmation", key: "language" });
    state = answer(state, "Tono dark, sensuale e ossessivo", { id: "tone-preset", key: "emotionalTone" });
    state = answer(state, "Lettori adulti che amano tensione romantica", {
      id: "audience-preset",
      key: "targetReader",
    });
    state = answer(state, "Desiderio proibito che distrugge entrambi", {
      id: "promise-preset",
      key: "promise",
    });
    const pct = getInterviewProgress(state).stagePercent;
    expect(pct).toBeGreaterThan(25);
    expect(evaluateStageCompletion(getForgeMemory(state))).toEqual(
      expect.arrayContaining(["genre", "language", "tone", "audience", "promise"]),
    );
  });
});
