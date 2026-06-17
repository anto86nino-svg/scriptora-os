import { describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
  resolveActiveInterviewQuestion,
} from "./question-engine";
import { getContinueFollowUpQuestion } from "./interview-continue";
import { buildDnaLockFromInterviewState } from "./dna-lock";

function stateWithFullExtracted(userMessageCount: number) {
  const messages = Array.from({ length: userMessageCount }, (_, i) => ({
    id: `u-${i}`,
    role: "user" as const,
    content: `Risposta dettagliata numero ${i + 1} con abbastanza testo per contare davvero.`,
    createdAt: i,
  }));

  return {
    ...getInitialInterviewState({ chatFirst: true }),
    currentStep: 12,
    confidence: 0.96,
    messages,
    extracted: {
      readerTransformation: "Lasciare una paura sottile e una bellezza oscura addosso al lettore.",
      centralConflict: "Un segreto di famiglia che rompe l'equilibrio di una villa decadente.",
      emotionalTone: "Gotico, elegante, claustrofobico, pieno di presagi e ombre.",
      genreDNA: "Narrativa gotica lenta, immersiva, letteraria e inquietante.",
      promise: "Scoprire piano piano una verità sepolta nel passato.",
      setting: "Villa decadente, pioggia, nebbia, silenzi e memoria.",
      targetReader: "Lettori dark gothic amanti di segreti e atmosfere raffinate.",
      depthReaderFit: "Lettori dark gothic amanti di segreti e atmosfere raffinate.",
      depthCoreFear: "Paura sottile di ciò che la memoria nasconde.",
      depthPacingChoice: "Lento e inquietante, elegante e oscuro.",
      depthDoNotBecome: "Non deve diventare generico o troppo esplicativo.",
      depthFinalDirection: "Gotico moderno: atmosfera oscura, segreti, luoghi carichi di memoria.",
    },
  };
}

describe("interview continue flow", () => {
  it("surfaces a follow-up question when engine is done but DNA is not ready", () => {
    const state = stateWithFullExtracted(5);
    const raw = getNextInterviewQuestion(state);
    expect(raw.done).toBe(true);

    const active = resolveActiveInterviewQuestion(state, raw, { continueNonce: 1 });
    expect(active.done).toBe(false);
    expect(active.question?.question.length).toBeGreaterThan(12);
    expect(active.question?.quickSuggestions?.length ?? 0).toBeGreaterThan(0);
  });

  it("continue follow-up changes when avoidQuestionId is set", () => {
    const state = stateWithFullExtracted(5);
    const first = getContinueFollowUpQuestion(state, { continueNonce: 1 });
    const second = getContinueFollowUpQuestion(state, {
      continueNonce: 2,
      avoidQuestionId: first.id,
    });
    expect(second.id).not.toBe(first.id);
  });

  it("applyInterviewAnswer accepts answers when queue is exhausted", () => {
    const state = stateWithFullExtracted(5);
    const raw = getNextInterviewQuestion(state);
    const active = resolveActiveInterviewQuestion(state, raw);
    const updated = applyInterviewAnswer(
      state,
      "Una storia oscura, emotiva, gotica, piena di presagi e ombre.",
      active.question,
    );
    expect(updated.messages.filter((m) => m.role === "user").length).toBe(6);
  });

  it("opens blueprint path only when DNA is truly ready", () => {
    const state = stateWithFullExtracted(10);
    const lock = buildDnaLockFromInterviewState(state);
    expect(lock.readyForBlueprint).toBe(true);
    const raw = getNextInterviewQuestion(state);
    expect(raw.done).toBe(true);
    const active = resolveActiveInterviewQuestion(state, raw);
    expect(active.done).toBe(true);
  });

  it("direction follow-up avoids self-help chips for gothic input", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "Voglio un libro gotico, oscuro, elegante, pieno di presagi e ombre.",
    );
    const followUp = getContinueFollowUpQuestion(state, { continueNonce: 1 });
    const labels = followUp.quickSuggestions?.map((c) => c.label) ?? [];
    expect(labels.some((l) => l === "Professionisti")).toBe(false);
    expect(labels.some((l) => l === "Studenti brillanti")).toBe(false);
    if (followUp.key === "depthFinalDirection") {
      expect(labels.some((l) => /gotica|mistero|oscura/i.test(l))).toBe(true);
    }
  });
});
