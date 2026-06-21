import { beforeEach, describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
} from "./question-engine";
import {
  clearForgeInterviewDraft,
  loadForgeInterviewDraft,
  saveForgeInterviewDraft,
} from "./interview-state";

describe("guided interview draft persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("saves and reloads in-progress answers before the DNA lock", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Gotico romantico con mistero in una villa.");

    saveForgeInterviewDraft(state);
    const draft = loadForgeInterviewDraft();

    expect(draft?.status).toBe("interview_in_progress");
    expect(draft?.state.messages.some((message) => message.role === "user" && /Gotico romantico/i.test(message.content))).toBe(true);
    expect(draft?.state.forgeMemory?.slotValues.genre).toBeTruthy();
  });

  it("clears the draft when the flow is no longer resumable", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Poesia lirica sulla memoria e sulla rinascita.");

    saveForgeInterviewDraft(state);
    expect(loadForgeInterviewDraft()).not.toBeNull();

    clearForgeInterviewDraft();
    expect(loadForgeInterviewDraft()).toBeNull();
  });
});
