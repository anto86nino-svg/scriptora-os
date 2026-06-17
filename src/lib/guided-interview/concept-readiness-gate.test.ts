import { describe, expect, it } from "vitest";
import type { GuidedInterviewState } from "./types";
import { evaluateConceptReadiness } from "./concept-readiness-gate";

function state(partial: Partial<GuidedInterviewState>): GuidedInterviewState {
  return {
    messages: [],
    extracted: {},
    confidence: 0.2,
    chatFirst: true,
    ...partial,
  } as GuidedInterviewState;
}

describe("concept readiness gate", () => {
  it("blocks vague dark romance concepts before blueprint", () => {
    const report = evaluateConceptReadiness(state({
      selectedGenre: "dark-romance",
      confidence: 0.55,
      extracted: {
        genreDNA: "Dark romance",
        promise: "Una storia intensa.",
      } as any,
    }));

    expect(report.ready).toBe(false);
    expect(report.missing).toContain("core");
    expect(report.missing).toContain("reader");
    expect(report.nextQuestions.length).toBeGreaterThan(0);
  });

  it("allows strong dark romance concept to proceed", () => {
    const report = evaluateConceptReadiness(state({
      selectedGenre: "dark-romance",
      confidence: 0.95,
      extracted: {
        genreDNA: "Dark romance adulto slow burn, non saggio e non romance dolce.",
        centralConflict: "Lei vuole fuggire da un uomo pericoloso, ma lui è l'unico che conosce il segreto capace di salvarla.",
        targetReader: "Lettrici dark romance adulte che amano ossessione, potere, vulnerabilità, segreti e tensione morale.",
        promise: "Una storia magnetica e proibita che fa desiderare due persone anche quando non dovrebbero stare insieme.",
        emotionalTone: "Sensuale, pericoloso, lento, elegante, doloroso e moralmente ambiguo.",
        setting: "Una città notturna di hotel di lusso, club privati e palazzi pieni di segreti.",
        structurePreference: "Romanzo slow burn in 18 capitoli con doppio POV, midpoint di tradimento e payoff emotivo finale.",
      } as any,
    }));

    expect(report.ready).toBe(true);
    expect(report.missing).toHaveLength(0);
  });

  it("detects genre drift risk when fiction is becoming essay-like", () => {
    const report = evaluateConceptReadiness(state({
      selectedGenre: "dark-romance",
      confidence: 0.9,
      extracted: {
        genreDNA: "Dark romance con filosofia, Heidegger, Lacan ed esperimento mentale.",
        centralConflict: "Lei desidera un uomo pericoloso che la costringe a guardare il suo lato oscuro.",
        targetReader: "Lettrici dark romance adulte.",
        promise: "Una storia intensa e proibita.",
        emotionalTone: "Sensuale, pericoloso e doloroso.",
        setting: "Una città notturna.",
        structurePreference: "18 capitoli slow burn.",
      } as any,
    }));

    expect(report.ready).toBe(false);
    expect(report.missing).toContain("boundary");
  });
});
