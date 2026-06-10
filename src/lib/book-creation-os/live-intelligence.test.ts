import { describe, expect, it } from "vitest";
import { computeLiveIntelligence } from "./live-intelligence";
import { BOOK_OBJECTIVES, DEFAULT_STYLE_PROFILE } from "./objectives";

describe("live-intelligence", () => {
  it("activates slow burn for dark romance objective", () => {
    const objective = BOOK_OBJECTIVES.find((o) => o.id === "dark-romance")!;
    const snap = computeLiveIntelligence({
      step: 1,
      idea: "Due rivali con un segreto mortale da proteggere",
      objective,
      styleProfile: { ...DEFAULT_STYLE_PROFILE, slowBurn: 80 },
      characters: [],
      chapters: 22,
      bookLength: "medium",
    });
    expect(snap.activatedEngines.some((e) => e.id === "slow-burn")).toBe(true);
  });

  it("warns weak character compatibility without wounds", () => {
    const snap = computeLiveIntelligence({
      step: 3,
      idea: "test",
      objective: BOOK_OBJECTIVES[0],
      styleProfile: DEFAULT_STYLE_PROFILE,
      characters: [
        { name: "Emma", role: "protagonista" },
        { name: "Luca", role: "love interest" },
      ],
      chapters: 18,
      bookLength: "medium",
    });
    expect(snap.insights.some((i) => i.id === "compat" && i.tone === "warn")).toBe(true);
  });
});
