import { beforeEach, describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
} from "./question-engine";
import {
  clearForgeInterviewDraft,
  isForgeDraftCompatibleWithIdea,
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

  it("does not reuse an unrelated old premise for a new book of the same genre", () => {
    let state = getInitialInterviewState({
      chatFirst: true,
      selectedGenre: "thriller",
      extracted: {
        rawIdea: "Una villa gotica imprigiona i ricordi della sua proprietaria.",
        readerTransformation: "Una villa gotica imprigiona i ricordi della sua proprietaria.",
      },
    });
    state = applyInterviewAnswer(state, "Una villa gotica imprigiona i ricordi della sua proprietaria.");
    saveForgeInterviewDraft(state);
    const draft = loadForgeInterviewDraft();

    expect(draft).not.toBeNull();
    expect(isForgeDraftCompatibleWithIdea(
      draft!,
      "Una restauratrice trova messaggi della madre sotto la vernice dei quadri.",
    )).toBe(false);
    expect(isForgeDraftCompatibleWithIdea(
      draft!,
      "La proprietaria scopre che la villa gotica conserva e imprigiona i suoi ricordi.",
    )).toBe(true);
  });
});
