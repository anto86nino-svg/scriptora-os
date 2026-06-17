import { describe, expect, it } from "vitest";
import {
  classifyAntagonistForce,
  getAntagonistClassificationQuestion,
  shouldAskHumanAntagonistDetails,
} from "./antagonist-intelligence";
import { getInitialInterviewState } from "./question-engine";

describe("antagonist intelligence", () => {
  it("classifies system antagonist", () => {
    expect(classifyAntagonistForce("Un sistema burocratico che schiaccia il protagonista")).toBe(
      "system",
    );
  });

  it("classifies self antagonist", () => {
    expect(classifyAntagonistForce("Il protagonista si sabota da solo per paura")).toBe("self");
  });

  it("skips human villain questions for non-human force", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      antagonistForce: "system" as const,
      characters: [
        {
          id: "p1",
          role: "protagonist" as const,
          name: "Elena",
          wound: "Abbandono del padre",
          fear: "La verità",
          desire: "Sapere",
          contradiction: "Vuole e non vuole",
          obsession: "La villa",
          secret: "Ha sentito un grido",
          arc: "Trasformazione",
        },
      ],
      extracted: { genre: "Thriller" },
    };
    expect(shouldAskHumanAntagonistDetails(state)).toBe(false);
  });

  it("asks classification before villain details", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      characters: [
        {
          id: "p1",
          role: "protagonist" as const,
          name: "Elena",
          wound: "Abbandono del padre",
          fear: "La verità",
          desire: "Sapere",
          contradiction: "Vuole e non vuole",
          obsession: "La villa",
          secret: "Ha sentito un grido",
          arc: "Trasformazione",
        },
      ],
      extracted: { genre: "Dark romance" },
    };
    const question = getAntagonistClassificationQuestion(state);
    expect(question?.id).toBe("antagonist-force-classify");
    expect(question?.quickSuggestions?.length).toBeGreaterThan(3);
  });
});
