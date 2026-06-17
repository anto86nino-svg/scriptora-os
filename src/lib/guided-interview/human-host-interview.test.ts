import { describe, expect, it } from "vitest";
import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { getHumanHostExtraQuestions, shapeHumanHostQuestion } from "./human-host-interview";

function state(partial: Partial<GuidedInterviewState>): GuidedInterviewState {
  return {
    messages: [],
    extracted: {},
    confidence: 0.2,
    chatFirst: true,
    ...partial,
  } as GuidedInterviewState;
}

describe("human host interview", () => {
  it("adds focused extra questions when the book DNA is weak", () => {
    const s = state({
      selectedGenre: "dark-romance",
      extracted: {
        genreDNA: "Dark romance",
      } as any,
    });

    const questions = getHumanHostExtraQuestions(s);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.length).toBeLessThanOrEqual(3);
    expect(questions.map((q) => q.key)).toContain("centralConflict");
    expect(questions[0].question).toMatch(/centro del libro|ferita|desiderio/i);
  });

  it("does not ask endless extra questions when core DNA is already strong", () => {
    const s = state({
      selectedGenre: "dark-romance",
      extracted: {
        centralConflict: "Lei vuole liberarsi da un uomo pericoloso, ma lui è l'unico che conosce il segreto che può salvarla.",
        setting: "Una città notturna, elegante e violenta, piena di hotel, club privati e palazzi antichi.",
        emotionalTone: "Slow burn tossico, magnetico, doloroso e pieno di tensione morale.",
        targetReader: "Lettrici dark romance adulte che amano potere, segreti, ossessione e payoff emotivo.",
        promise: "Una storia che resta addosso per desiderio, paura e redenzione.",
        genreDNA: "Dark romance adulto, non saggio, non romance dolce.",
        structurePreference: "Romanzo slow burn in 18 capitoli con doppio POV, midpoint di tradimento e payoff emotivo finale.",
      } as any,
    });

    expect(getHumanHostExtraQuestions(s)).toHaveLength(0);
  });

  it("shapes form-like questions into a warmer host voice", () => {
    const q = {
      id: "x",
      key: "targetReader",
      question: "A chi è destinato questo libro?",
    } as InterviewQuestion;

    const shaped = shapeHumanHostQuestion(q, state({ selectedGenre: "fantasy" }));
    expect(shaped.question).toMatch(/lettore|microfono/i);
    expect((shaped as any).helper).toMatch(/editor|scena|atmosfera|conflitto|concreto|liberamente/i);
  });
});
