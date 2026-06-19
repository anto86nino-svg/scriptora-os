import { describe, expect, it } from "vitest";
import {
  getBlueprintGateStatus,
  shouldBlockNarrativeQuestions,
} from "./blueprint-ready-gate";
import {
  getNextInterviewQuestion,
  getInitialInterviewState,
  resolveActiveInterviewQuestion,
} from "./question-engine";
import {
  advanceStoryRoomStage,
  buildStoryRoomProgressTrail,
  isStoryRoomBlueprintReady,
} from "./story-room-state-machine";
import { createEmptyForgeMemory, getForgeMemory } from "./interview-memory";
import type { GuidedInterviewState } from "./types";

function buildBlueprintReadyMemory() {
  let memory = createEmptyForgeMemory();
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
  if (memory.storyRoomMachine) {
    memory.storyRoomMachine.currentStageId = "blueprintReady";
  }
  return memory;
}

function stateAtBlueprintReady(extra?: Partial<GuidedInterviewState>): GuidedInterviewState {
  const memory = buildBlueprintReadyMemory();
  return {
    ...getInitialInterviewState({ chatFirst: true }),
    currentStep: 12,
    bookFoundationLocked: true,
    messages: [
      { id: "u1", role: "user", content: "Dark romance in italiano", createdAt: 1 },
      { id: "u2", role: "user", content: "Protagonista Elena", createdAt: 2 },
      { id: "u3", role: "user", content: "Tono oscuro", createdAt: 3 },
      { id: "u4", role: "user", content: "Promessa intensa", createdAt: 4 },
    ],
    forgeMemory: memory,
    extracted: {
      genre: "dark-romance",
      language: "Italian",
      bookTitle: "Titolo provvisorio",
      promise: "Desiderio proibito",
      centralConflict: "Desiderio vs autodistruzione",
      protagonistWound: "Elena",
      antagonist: "Marco",
      chapterCount: "20",
      frontMatter: "Dedica breve",
      bookSubtitle: "Sottotitolo commerciale forte per il mercato",
      openingHook: "Quando Elena sceglie la verità, il desiderio diventa la trappola più elegante.",
    },
    characters: [
      { id: "p1", role: "protagonist", name: "Elena", wound: "Ferita", desire: "Verità" },
      { id: "a1", role: "antagonist", name: "Marco", wound: "Colpa", desire: "Controllo" },
    ],
    titleIntelligence: {
      definitiveTitle: "Titolo provvisorio",
      subtitle: "Sottotitolo commerciale forte per il mercato",
      commercialHook: "Quando Elena sceglie la verità, il desiderio diventa la trappola più elegante.",
      commercialPromise: "Desiderio proibido",
      approved: true,
    },
    ...extra,
  };
}

describe("blueprint-ready-gate", () => {
  it("detects blueprint ready at 100% stage progress", () => {
    const state = stateAtBlueprintReady();
    const gate = getBlueprintGateStatus(state);
    expect(gate.isBlueprintReady).toBe(true);
    expect(gate.shouldStopQuestions).toBe(true);
    expect(gate.progressLabel).toContain("pronto per blueprint");
  });

  it("when stagePercent is 100, getNextInterviewQuestion returns done without narrative question", () => {
    const state = stateAtBlueprintReady();
    const next = getNextInterviewQuestion(state);
    expect(next.done).toBe(true);
    expect(next.question?.id.startsWith("continue-")).not.toBe(true);
  });

  it("when isStoryRoomBlueprintReady, resolveActiveInterviewQuestion does not inject follow-up", () => {
    const state = stateAtBlueprintReady();
    const base = getNextInterviewQuestion(state);
    const resolved = resolveActiveInterviewQuestion(state, base);
    expect(resolved.done).toBe(true);
    expect(resolved.question).toBeUndefined();
  });

  it("blocks narrative questions unless forgeRefineMode is on", () => {
    const state = stateAtBlueprintReady();
    expect(shouldBlockNarrativeQuestions(state)).toBe(true);
    const refine = stateAtBlueprintReady({ forgeRefineMode: true });
    expect(shouldBlockNarrativeQuestions(refine)).toBe(false);
  });

  it("isStoryRoomBlueprintReady on built memory at foundation stage", () => {
    const memory = buildBlueprintReadyMemory();
    expect(isStoryRoomBlueprintReady(memory)).toBe(true);
    const trail = buildStoryRoomProgressTrail(memory);
    expect(trail.percent).toBeGreaterThanOrEqual(80);
  });
});
