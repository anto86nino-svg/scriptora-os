import { describe, expect, it } from "vitest";
import type { GuidedInterviewState } from "./types";
import {
  evaluateForgeEvolution,
  isBookUnderstood,
  resolveCurrentPhase,
} from "./forge-evolution-engine";
import { buildCanonFromState } from "./canon-genesis-engine";
import { updateStoryFutureFromAnswer } from "./story-future-simulation";
import { evolutionReadyGothicState, evolutionReadySelfHelpState } from "./evolution-test-fixture";

function state(partial: Partial<GuidedInterviewState>): GuidedInterviewState {
  return {
    messages: [],
    extracted: {},
    confidence: 0.2,
    chatFirst: true,
    ...partial,
  } as GuidedInterviewState;
}

describe("forge evolution engine", () => {
  it("starts in understanding phase", () => {
    const s = state({ extracted: { genreDNA: "Dark romance" } as GuidedInterviewState["extracted"] });
    expect(resolveCurrentPhase(s)).toBe("understanding");
    expect(isBookUnderstood(s)).toBe(false);
  });

  it("simulates story future from decisions without exposing UI", () => {
    const future = updateStoryFutureFromAnswer({}, "Lucia sopravvive e trova redenzione");
    expect(future.finalStatus).toBe("alive");
    expect(future.endingTone).toBe("hopeful");
  });

  it("builds canon from characters and decisions", () => {
    const s = state({
      characters: [
        {
          id: "p1",
          role: "protagonist",
          name: "Lucia",
          wound: "Abbandono",
          desire: "Libertà",
          fear: "Perdere tutto",
          contradiction: "Vuole fuggire ma resta",
          obsession: "Lui",
          secret: "Un figlio nascosto",
          arc: "Da vittima a donna libera",
        },
      ],
      narrativeDecisions: [
        {
          id: "romance-fate",
          key: "protagonistFate",
          question: "Alla fine?",
          answer: "Lucia sopravvive",
          impact: "Destino protagonista",
        },
      ],
      extracted: {
        setting: "Città notturna",
        centralConflict: "Segreto tossico",
        promise: "Ossessione magnetica",
        readerTransformation: "Il lettore chiude sentendo che qualcosa è cambiato dentro",
        targetReader: "Lettrici dark romance adulte",
        genreDNA: "Dark romance adulto slow burn",
        emotionalTone: "Sensuale, pericoloso, lento, elegante, doloroso",
      } as GuidedInterviewState["extracted"],
    });
    const canon = buildCanonFromState(s);
    expect(canon.characters.facts.some((f) => f.includes("Lucia"))).toBe(true);
    expect(canon.ending.facts.length).toBeGreaterThan(0);
  });

  it("fixtures reach blueprint when fully evolved", () => {
    const gothic = evaluateForgeEvolution(evolutionReadyGothicState());
    const selfhelp = evaluateForgeEvolution(evolutionReadySelfHelpState());
    expect(gothic.readyForBlueprint, gothic.blockedReasons.join("; ")).toBe(true);
    expect(selfhelp.readyForBlueprint, selfhelp.blockedReasons.join("; ")).toBe(true);
  });

  it("blocks blueprint until all evolution phases complete", () => {
    const partial = evaluateForgeEvolution(
      state({
        selectedGenre: "dark-romance",
        confidence: 0.96,
        extracted: {
          genreDNA: "Dark romance adulto slow burn",
          centralConflict: "Lei vuole fuggire ma lui conosce il segreto — ferita e rischio reale",
          protagonistWound: "Ferita di abbandono",
          targetReader: "Lettrici dark romance adulte che amano ossessione e tensione",
          promise: "Storia magnetica che fa desiderare due persone proibite",
          readerTransformation: "Il lettore chiude sentendo cambiamento e redenzione impossibile",
          emotionalTone: "Sensuale, pericoloso, lento, elegante, doloroso, ambiguo",
          setting: "Città notturna di hotel e segreti",
        } as GuidedInterviewState["extracted"],
      }),
    );
    expect(partial.bookUnderstood).toBe(false);
    expect(partial.readyForBlueprint).toBe(false);
    expect(partial.blockedReasons.length).toBeGreaterThan(0);
  });
});
