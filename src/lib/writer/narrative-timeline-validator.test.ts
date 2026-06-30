import { describe, expect, it } from "vitest";
import { buildTimelineCoherencePromptBlock, validateNarrativeTimeline } from "./narrative-timeline-validator";

describe("narrative-timeline-validator", () => {
  it("flags contradictory tomorrow / 24h / morning-after stack", () => {
    const text =
      "Domani è l'appuntamento. Restano 24 ore per decidere. La mattina dopo si svegliò senza aver dormito.";
    const result = validateNarrativeTimeline(text);
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.type === "contradictory_day_sequence")).toBe(true);
  });

  it("accepts coherent same-day progression", () => {
    const text =
      "Quella sera preparò la borsa. Il giorno dopo, alle nove, lo aspettava davanti al bar senza fretta.";
    expect(validateNarrativeTimeline(text).valid).toBe(true);
  });

  it("builds a repair prompt block from issues", () => {
    const block = buildTimelineCoherencePromptBlock([
      {
        type: "contradictory_day_sequence",
        excerpt: "Domani è l'appuntamento",
        message: "Timeline incoerente.",
      },
    ]);
    expect(block).toMatch(/TIMELINE AUDIT/i);
    expect(block).toMatch(/Timeline incoerente/i);
  });
});
