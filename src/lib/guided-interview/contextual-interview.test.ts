import { describe, expect, it } from "vitest";
import { getInitialInterviewState, applyInterviewAnswer } from "./question-engine";
import {
  getContextualQuickSuggestions,
  inferInterviewBookSignals,
} from "./contextual-interview";
import { buildDnaLockFromInterviewState } from "./dna-lock";
import { isDnaTooDirtyToShow } from "./dna-cleaner";

function stateFromIdea(idea: string) {
  let state = getInitialInterviewState({ chatFirst: true });
  state = applyInterviewAnswer(state, idea);
  return state;
}

function chipLabels(state: ReturnType<typeof getInitialInterviewState>, key: string): string[] {
  return getContextualQuickSuggestions(key, state).map((c) => c.label);
}

const SELF_HELP_LABELS = ["Professionisti", "Creativi", "Studenti brillanti", "Persone bloccate"];

describe("contextual interview suggestion engine", () => {
  it("gothic input gets dark/gothic chips, not self-help", () => {
    const state = stateFromIdea(
      "Voglio un libro gotico, oscuro, elegante, pieno di presagi e ombre.",
    );
    const signals = inferInterviewBookSignals(state);
    expect(signals.category).toBe("gothic-dark");
    const labels = chipLabels(state, "targetReader");
    expect(labels.some((l) => /gotico|oscure|segreti|presagi|dark/i.test(l))).toBe(true);
    expect(labels.some((l) => SELF_HELP_LABELS.includes(l))).toBe(false);
  });

  it("thriller/horror input gets tension and fear chips", () => {
    const state = stateFromIdea(
      "Un thriller horror psicologico, realistico, con una minaccia vicina.",
    );
    const signals = inferInterviewBookSignals(state);
    expect(signals.category).toBe("thriller-horror");
    const labels = chipLabels(state, "targetReader");
    expect(labels.some((l) => /tensione|paura|minaccia|colpi|verità/i.test(l))).toBe(true);
  });

  it("dark romance input gets romance chips", () => {
    const state = stateFromIdea("Un dark romance slow burn con due personaggi feriti.");
    const signals = inferInterviewBookSignals(state);
    expect(["dark-romance", "romance"]).toContain(signals.category);
    const labels = chipLabels(state, "targetReader");
    expect(labels.some((l) => /romance|slow burn|attrazione|ferit|desiderio/i.test(l))).toBe(true);
  });

  it("self-help input gets coherent self-help chips", () => {
    const state = stateFromIdea(
      "Un manuale per aiutare persone bloccate a ritrovare disciplina.",
    );
    const signals = inferInterviewBookSignals(state);
    expect(["self-help", "manual"]).toContain(signals.category);
    const labels = chipLabels(state, "targetReader");
    expect(labels.some((l) => /bloccat|professionist|metodo|disciplin/i.test(l))).toBe(true);
  });

  it("study input gets university/exam chips", () => {
    const state = stateFromIdea(
      "Un libro per studenti universitari che devono preparare un esame difficile.",
    );
    const signals = inferInterviewBookSignals(state);
    expect(signals.category).toBe("study");
    const labels = chipLabels(state, "targetReader");
    expect(labels.some((l) => /student|universit|esame|metodo|memoria/i.test(l))).toBe(true);
  });

  it("poetry input gets poetry chips", () => {
    const state = stateFromIdea("Una raccolta poetica oscura sulla perdita e la rinascita.");
    const signals = inferInterviewBookSignals(state);
    expect(signals.category).toBe("poetry");
    const labels = chipLabels(state, "targetReader");
    expect(labels.some((l) => /poetic|sensibil|immagini|dolore|rinascita|voce/i.test(l))).toBe(true);
  });

  it("blocks blueprint before 10 user answers even with strong extracted fields", () => {
    const lock = buildDnaLockFromInterviewState({
      completed: false,
      currentStep: 7,
      confidence: 0.96,
      messages: Array.from({ length: 5 }, (_, i) => ({
        id: `u-${i}`,
        role: "user" as const,
        content: `Risposta dettagliata numero ${i + 1} con abbastanza testo per contare.`,
        createdAt: i,
      })),
      extracted: {
        readerTransformation: "Lasciare una paura sottile e una bellezza oscura addosso al lettore.",
        centralConflict: "Un segreto di famiglia che rompe l'equilibrio di una villa decadente.",
        emotionalTone: "Gotico, elegante, claustrofobico, pieno di presagi e ombre.",
        genreDNA: "Narrativa gotica lenta, immersiva, letteraria e inquietante.",
        promise: "Scoprire piano piano una verità sepolta nel passato.",
        setting: "Villa decadente, pioggia, nebbia, silenzi e memoria.",
        targetReader: "Lettori dark gothic amanti di segreti e atmosfere raffinate.",
      },
    } as any);

    expect(lock.readyForBlueprint).toBe(false);
  });

  it("dirty repetitive DNA keeps readyForBlueprint false", () => {
    const lock = buildDnaLockFromInterviewState({
      completed: false,
      currentStep: 12,
      confidence: 0.96,
      messages: Array.from({ length: 12 }, (_, i) => ({
        id: `u-${i}`,
        role: "user" as const,
        content: `Risposta ${i + 1} con dettagli utili e abbastanza lunghezza per contare davvero.`,
        createdAt: i,
      })),
      extracted: {
        readerTransformation: "un un un romanzo un romanzo gotico un romanzo",
        centralConflict: "Segreto segreto segreto di famiglia.",
        emotionalTone: "Oscuro oscuro oscuro.",
        genreDNA: "Gotico gotico gotico.",
        promise: "Presagi presagi presagi.",
        setting: "Ombre ombre ombre.",
        targetReader: "Lettori lettori lettori.",
      },
    } as any);

    expect(isDnaTooDirtyToShow({
      readerTransformation: "un un un romanzo un romanzo gotico un romanzo",
      centralConflict: "Segreto segreto segreto di famiglia.",
    })).toBe(true);
    expect(lock.readyForBlueprint).toBe(false);
  });
});
