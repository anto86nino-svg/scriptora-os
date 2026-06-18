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
    state = applyInterviewAnswer(state, "Romanzo · Dark Romance · dark-romance · Narrativa");
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

  it("enriched question stays interviewer-only without co-author blocks", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "Romanzo · Dark Romance · dark-romance · Narrativa",
    );
    const enriched = enrichQuestionWithCoAuthor(state, {
      id: "tone-preset",
      key: "emotionalTone",
      question: "Il lettore deve uscire ferito, elettrizzato o trasformato?",
    });
    expect(enriched.question).toBe("Il lettore deve uscire ferito, elettrizzato o trasformato?");
    expect(enriched.question).not.toMatch(/Quindi stiamo costruendo/i);
  });

  it("uses genre expert lens for self-help", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Saggio · Self Help · self-help · Non Fiction");
    const turn = composeCoAuthorTurn(state, {
      id: "method-preset",
      key: "genreDNA",
      question: "Quale metodo concreto deve portare il lettore dal punto A al punto B?",
    });
    expect(turn.interpretation).toMatch(/percorso|metodo|trasformazione|lettore|problema centrale|self-help/i);
    expect(turn.proposal).toMatch(/metodo|step|risultat/i);
  });
});
