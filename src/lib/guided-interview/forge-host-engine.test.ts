import { describe, expect, it } from "vitest";
import { buildForgeHostGreeting } from "./forge-host-engine";
import { getInitialInterviewState } from "./question-engine";
import { FORGE_HOST_GREETING_MESSAGE_ID } from "./forge-genre-catalog";

describe("forge host engine", () => {
  it("greets with pen name in the morning", () => {
    const text = buildForgeHostGreeting(
      { penName: "Antonino", date: new Date("2026-05-29T09:00:00") },
    );
    expect(text).toMatch(/Buongiorno, Antonino/);
  });

  it("uses author fallback when no name configured", () => {
    const text = buildForgeHostGreeting(
      { genderHint: "f", date: new Date("2026-05-29T14:00:00") },
    );
    expect(text).toMatch(/Buon pomeriggio, scrittrice/);
  });

  it("returns bentornato for resuming sessions", () => {
    const text = buildForgeHostGreeting({ penName: "Livia", isResuming: true });
    expect(text).toMatch(/Bentornato, Livia/);
    expect(text).toMatch(/Riprendiamo/i);
  });

  it("initial state uses host greeting message id", () => {
    const state = getInitialInterviewState({
      chatFirst: true,
      hostContext: { penName: "Lucia", date: new Date("2026-05-29T21:00:00") },
    });
    expect(state.messages[0]?.id).toBe(FORGE_HOST_GREETING_MESSAGE_ID);
    expect(state.messages[0]?.content).toMatch(/Buonasera, Lucia/);
  });
});
