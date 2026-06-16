import { describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "./question-engine";

describe("guided interview continuation", () => {
  it("does not stop after first business answer", () => {
    let state = getInitialInterviewState({ selectedGenre: "business" });
    const first = getNextInterviewQuestion(state);
    expect(first.done).toBe(false);

    state = applyInterviewAnswer(
      state,
      "Aiutare professionisti a smettere di procrastinare con un sistema concreto di focus e avvio.",
    );
    const second = getNextInterviewQuestion(state);
    expect(second.done).toBe(false);
    expect(second.question?.key).not.toBe(first.question?.key);
  });

  it("keeps asking until critical fields are strong", () => {
    let state = getInitialInterviewState({ selectedGenre: "self-help" });
    const answers = [
      "Trasformare persone bloccate in lettori che agiscono ogni giorno con micro-passi concreti.",
      "Il lettore sa cosa fare ma rimanda per paura di fallire e per sovraccarico mentale.",
      "Tono diretto, umano, empatico ma senza fronzoli.",
      "DNA pratico con esercizi, esempi reali e progressione settimanale.",
      "Promessa: smontare la procrastinazione intelligente e tornare agenti della propria giornata.",
      "Contesto reale: lavoro, studio, creatività e vita quotidiana sotto pressione.",
      "Professionisti e creativi brillanti che procrastinano non per pigrizia ma per perfezionismo.",
    ];

    for (const answer of answers) {
      const next = getNextInterviewQuestion(state);
      if (next.done) break;
      state = applyInterviewAnswer(state, answer);
    }

    expect(state.dnaLock?.confidenceScore ?? 0).toBeGreaterThan(0.5);
    expect(state.dnaLock?.missingCriticalAnswers.length ?? 99).toBeLessThan(4);
  });
});
