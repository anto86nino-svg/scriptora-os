import { describe, expect, it } from "vitest";
import {
  buildSlotConfirmationQuestion,
  collectDeducedSlots,
  queueDeducedSlotConfirmations,
  resolveSlotConfirmationAnswer,
  seedAuthorIdentityConfirmation,
} from "./slot-deduction-engine";
import {
  createEmptyForgeMemory,
  getForgeMemory,
  isSlotFilled,
  selectNextMemoryQuestion,
} from "./interview-memory";
import { applyInterviewAnswer, getInitialInterviewState } from "./question-engine";

describe("slot deduction engine", () => {
  it("deduces language from mixed genre answer", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const deduced = collectDeducedSlots(
      state,
      "dark romance in italiano tra due anime ferite",
      { id: "genre-family-select", key: "genre" },
    );
    expect(deduced.language).toBe("Italiano");
  });

  it("queues confirmation instead of auto-locking deduced slots", () => {
    let memory = createEmptyForgeMemory();
    memory = queueDeducedSlotConfirmations(memory, { language: "Italiano" });
    expect(memory.pendingSlotConfirmations?.language).toBe("Italiano");
    expect(isSlotFilled(memory, "language")).toBe(false);
  });

  it("builds quick confirmation question", () => {
    const q = buildSlotConfirmationQuestion("language", "Italiano");
    expect(q.question).toMatch(/Italiano/i);
    expect(q.quickSuggestions?.[0]?.label).toMatch(/confermo/i);
  });

  it("confirms deduced slot on sì", () => {
    const memory = {
      ...createEmptyForgeMemory(),
      pendingSlotConfirmations: { language: "Italiano" },
    };
    const resolved = resolveSlotConfirmationAnswer(
      buildSlotConfirmationQuestion("language", "Italiano"),
      "Sì, confermo",
      memory,
    );
    expect(resolved?.value).toBe("Italiano");
    expect(resolved?.reject).toBe(false);
  });

  it("seeds author identity from pen name at init", () => {
    const state = getInitialInterviewState({
      chatFirst: true,
      hostContext: { penName: "Antonino" },
    });
    const memory = getForgeMemory(state);
    expect(memory.pendingSlotConfirmations?.authorName).toBe("Antonino");
  });

  it("applies confirmation through interview answer", () => {
    let state = getInitialInterviewState({
      chatFirst: true,
      hostContext: { penName: "Livia" },
    });
    state = applyInterviewAnswer(state, "Romanzo · Dark Romance · dark-romance · Narrativa");
    state = applyInterviewAnswer(state, "Italiano");
    state = applyInterviewAnswer(state, "Sì, confermo: Livia");
    const memory = getForgeMemory(state);
    expect(memory.slotValues.authorName).toBe("Livia");
    expect(isSlotFilled(memory, "authorName")).toBe(true);
    expect(state.extracted.authorName).toBe("Livia");
    expect(String(state.extracted.centralConflict ?? "")).not.toMatch(/confermo/i);
    expect(String(state.extracted.emotionalTone ?? "")).not.toMatch(/confermo/i);
    expect(String(state.extracted.setting ?? "")).not.toMatch(/confermo/i);
  });
});

describe("progression locks", () => {
  it("asks language before author confirmation", () => {
    let state = getInitialInterviewState({
      chatFirst: true,
      hostContext: { penName: "Antonino" },
    });
    state = applyInterviewAnswer(state, "Romanzo · Thriller · thriller · Narrativa");
    const q = selectNextMemoryQuestion(state);
    expect(q?.id).toBe("language-confirmation");
  });
});
