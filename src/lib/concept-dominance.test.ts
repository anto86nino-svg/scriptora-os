import { describe, expect, it } from "vitest";
import {
  hasHighConceptFantasySignals,
  hasExplicitRomanceSignals,
  isGenericPhilosophyTitleForFiction,
  resolveConceptDominance,
} from "@/lib/concept-dominance";

describe("concept-dominance", () => {
  const eliasIdea =
    "Elias, la porta nel cuore, ricordi di una donna vissuta mille anni prima, data della fine del mondo";

  it("detects high-concept fantasy without romance drift", () => {
    expect(hasHighConceptFantasySignals(eliasIdea)).toBe(true);
    expect(hasExplicitRomanceSignals(eliasIdea)).toBe(false);
  });

  it("does not treat porta nel cuore as romance", () => {
    expect(hasExplicitRomanceSignals("porta nel cuore e ricordi antichi")).toBe(false);
  });

  it("resolves fantasy dominance for Elias concept", () => {
    const resolved = resolveConceptDominance(eliasIdea, { genre: "Fantasy" });
    expect(resolved.genre).toBe("fantasy");
    expect(resolved.blockRomanceTemplates).toBe(true);
    expect(resolved.blockPhilosophyBlueprint).toBe(true);
    expect(resolved.protagonist).toBe("Elias");
  });

  it("rejects generic philosophy title for fantasy concept", () => {
    expect(isGenericPhilosophyTitleForFiction("Quello che Essere Nasconde", eliasIdea)).toBe(true);
  });
});
