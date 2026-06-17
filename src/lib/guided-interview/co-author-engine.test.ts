import { describe, expect, it } from "vitest";
import { applyInterviewAnswer, getInitialInterviewState } from "./question-engine";
import {
  composeCoAuthorTurn,
  enrichQuestionWithCoAuthor,
  formatCoAuthorMessage,
  isForbiddenGenericQuestion,
} from "./co-author-engine";
import { getForgeMemory } from "./interview-memory";

describe("co-author engine", () => {
  it("formats four-part co-author turn", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "voglio scrivere un dark romance in italiano ambientato in Sicilia",
    );
    const turn = composeCoAuthorTurn(state, {
      id: "tone-preset",
      key: "emotionalTone",
      question: "Il lettore deve uscire ferito, elettrizzato o trasformato?",
    });
    const message = formatCoAuthorMessage(turn);
    expect(message).toMatch(/Quindi stiamo costruendo/i);
    expect(message).toMatch(/Mi sembra che|La promessa che sento/i);
    expect(message).toMatch(/Potremo|Potremmo|Una possibilità/i);
    expect(message).toMatch(/ferito|elettrizzato|trasformato/i);
  });

  it("rejects forbidden generic questions", () => {
    expect(isForbiddenGenericQuestion("Raccontami il libro come lo racconteresti a un amico")).toBe(
      true,
    );
    expect(isForbiddenGenericQuestion("Il finale deve spezzare il cuore o liberare?")).toBe(false);
  });

  it("enriched question contains memory after italian dark romance answer", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "dark romance in italiano su una ragazza fragile e un uomo pericoloso in Sicilia",
    );
    const enriched = enrichQuestionWithCoAuthor(state, {
      id: "tone-preset",
      key: "emotionalTone",
      question: "Il lettore deve uscire ferito, elettrizzato o trasformato?",
    });
    expect(enriched.question).toMatch(/Italiano|dark/i);
    expect(enriched.question).not.toMatch(/raccontami il libro come lo racconteresti/i);
    const memory = getForgeMemory(state);
    expect(memory.slotValues.language).toBe("Italiano");
  });

  it("uses genre expert lens for self-help", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "libro self-help in inglese per persone bloccate");
    const turn = composeCoAuthorTurn(state, {
      id: "method-preset",
      key: "genreDNA",
      question: "Quale metodo concreto deve portare il lettore dal punto A al punto B?",
    });
    expect(turn.interpretation).toMatch(/percorso|metodo|trasformazione|lettore/i);
    expect(turn.proposal).toMatch(/metodo|step|risultat/i);
  });
});
