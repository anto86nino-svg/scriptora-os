import { describe, expect, it } from "vitest";
import type { GuidedInterviewState } from "./types";
import {
  detectEditorialContradictions,
  evaluateEditorialUnderstanding,
  scoreEditorialTextQuality,
} from "./book-understanding-engine";

function state(partial: Partial<GuidedInterviewState>): GuidedInterviewState {
  return {
    messages: [],
    extracted: {},
    confidence: 0.2,
    chatFirst: true,
    ...partial,
  } as GuidedInterviewState;
}

describe("book understanding engine", () => {
  it("does not inflate confidence from long vague answers", () => {
    const short = scoreEditorialTextQuality("Dark romance");
    const longVague = scoreEditorialTextQuality(
      "Dark romance ".repeat(40) + "è una storia intensa e bella con molte parole ma poco specifica.",
    );
    expect(longVague).toBeLessThan(0.55);
    expect(longVague - short).toBeLessThan(0.3);
  });

  it("rewards clarity and specificity over length", () => {
    const vague = scoreEditorialTextQuality("Un romanzo dark romance molto lungo e interessante.");
    const specific = scoreEditorialTextQuality(
      "Lei vuole fuggire da lui, ma lui è l'unico che conosce la ferita che la distrugge — e la paura di perdere tutto.",
    );
    expect(specific).toBeGreaterThan(vague);
  });

  it("detects tone contradictions", () => {
    const contradictions = detectEditorialContradictions(state({
      messages: [
        { id: "1", role: "user", content: "Voglio una dark romance oscura e dolorosa.", createdAt: 1 },
        { id: "2", role: "user", content: "Ma deve restare leggera e divertente, feel-good.", createdAt: 2 },
      ],
    }));
    expect(contradictions.length).toBeGreaterThan(0);
    expect(contradictions[0].label).toMatch(/oscuro|leggero/i);
  });

  it("blocks blueprint for generic concepts", () => {
    const report = evaluateEditorialUnderstanding(state({
      selectedGenre: "dark-romance",
      extracted: {
        genreDNA: "Dark romance",
        promise: "Una storia intensa.",
      } as GuidedInterviewState["extracted"],
    }));
    expect(report.readyForBlueprint).toBe(false);
    expect(report.blindSpots.length).toBeGreaterThan(0);
    expect(report.nextQuestions.length).toBeGreaterThan(0);
  });

  it("allows strong fiction when book DNA is coherent", () => {
    const report = evaluateEditorialUnderstanding(state({
      selectedGenre: "dark-romance",
      confidence: 0.95,
      extracted: {
        genreDNA: "Dark romance adulto slow burn, non saggio e non romance dolce.",
        centralConflict:
          "Lei vuole fuggire da un uomo pericoloso, ma lui è l'unico che conosce il segreto capace di salvarla — e la ferita che la costringe a restare.",
        protagonistWound: "Una ferita di abbandono che la spinge verso uomini che non può avere davvero.",
        targetReader:
          "Lettrici dark romance adulte che amano ossessione, potere, vulnerabilità, segreti e tensione morale.",
        promise:
          "Una storia magnetica e proibita che fa desiderare due persone anche quando non dovrebbero stare insieme.",
        readerTransformation:
          "Il lettore deve chiudere il libro sentendo che qualcosa è cambiato dentro — paura, desiderio e una redenzione impossibile.",
        emotionalTone: "Sensuale, pericoloso, lento, elegante, doloroso e moralmente ambiguo.",
        setting: "Una città notturna di hotel di lusso, club privati e palazzi pieni di segreti.",
      } as GuidedInterviewState["extracted"],
    }));
    expect(report.contradictions).toHaveLength(0);
    expect(report.canExplainBook).toBe(true);
    expect(report.readyForBlueprint).toBe(true);
    expect(report.overallConfidence).toBeGreaterThanOrEqual(0.95);
  });

  it("never marks ready from answer count alone", () => {
    const messages = Array.from({ length: 15 }, (_, i) => ({
      id: `u-${i}`,
      role: "user" as const,
      content: `Risposta numero ${i + 1} senza molto senso.`,
      createdAt: i,
    }));
    const report = evaluateEditorialUnderstanding(state({ messages }));
    expect(report.readyForBlueprint).toBe(false);
  });
});
