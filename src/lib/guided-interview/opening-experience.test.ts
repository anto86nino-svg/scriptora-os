import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_PREMATURE_PHRASES,
  getForgeDaypart,
  getForgeOpeningGreeting,
  isFirstForgeAssistantMessage,
  isTechnicalPrematureContent,
} from "./opening-experience";
import { getInitialInterviewState, getNextInterviewQuestion } from "./question-engine";
import { applyInterviewAnswer } from "./question-engine";
import { selectNextForgeQuestion } from "./interview-stages";
import { evaluateForgeReadiness } from "./forge-readiness";
import { getForgeMemory } from "./interview-memory";
import { getEditorialDepthQuestions } from "./book-understanding-engine";

describe("opening experience", () => {
  it("returns morning greeting before noon", () => {
    expect(getForgeDaypart(new Date("2026-05-29T09:00:00"))).toBe("morning");
    const text = getForgeOpeningGreeting({ date: new Date("2026-05-29T09:00:00") });
    expect(text).toMatch(/Buongiorno/i);
  });

  it("returns afternoon greeting between noon and 6pm", () => {
    expect(getForgeDaypart(new Date("2026-05-29T14:00:00"))).toBe("afternoon");
    const text = getForgeOpeningGreeting({ date: new Date("2026-05-29T14:00:00") });
    expect(text).toMatch(/Buon pomeriggio/i);
  });

  it("returns evening greeting after 6pm", () => {
    expect(getForgeDaypart(new Date("2026-05-29T20:00:00"))).toBe("evening");
    const text = getForgeOpeningGreeting({ date: new Date("2026-05-29T20:00:00") });
    expect(text).toMatch(/Buonasera/i);
  });

  it("empty state first message is scenic, not technical", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const opening = state.messages[0]?.content ?? "";
    expect(isFirstForgeAssistantMessage(state)).toBe(true);
    expect(opening).toMatch(/Buon(giorno| pomeriggio|asera)/i);
    expect(opening).toMatch(/Da dove iniziamo|frammento|modulo|taccuino/i);
    for (const phrase of FORBIDDEN_PREMATURE_PHRASES) {
      expect(opening.toLowerCase()).not.toContain(phrase);
    }
  });

  it("does not queue a technical question before first user answer", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const next = getNextInterviewQuestion(state);
    expect(next.done).toBe(false);
    expect(next.question).toBeUndefined();
    const depth = getEditorialDepthQuestions(state);
    for (const q of depth) {
      expect(isTechnicalPrematureContent(q.question)).toBe(false);
    }
  });
});

describe("interview stages", () => {
  it("non lo so produces guided options", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "non lo so");
    const q = selectNextForgeQuestion(state);
    expect(q).not.toBeNull();
    expect(q!.question).toMatch(/direzioni|vibra|strade|risuona|guid/i);
    expect((q!.quickSuggestions?.length ?? 0)).toBeGreaterThanOrEqual(3);
  });

  it("dark romance produces different memory than self-help", () => {
    let dark = getInitialInterviewState({ chatFirst: true });
    dark = applyInterviewAnswer(
      dark,
      "voglio scrivere una storia d'amore oscura tra una ragazza fragile e un uomo pericoloso in italiano",
    );
    let help = getInitialInterviewState({ chatFirst: true });
    help = applyInterviewAnswer(help, "voglio aiutare persone che si sentono bloccate con un self-help in inglese");

    expect(getForgeMemory(dark).slotValues.genre).not.toBe(getForgeMemory(help).slotValues.genre);
    const darkQ = selectNextForgeQuestion(dark);
    const helpQ = selectNextForgeQuestion(help);
    expect(darkQ?.id).not.toBe("genre-direction");
    expect(helpQ?.id).not.toBe("genre-direction");
    expect(String(getForgeMemory(dark).slotValues.genre)).toMatch(/romance|dark/i);
    expect(String(getForgeMemory(help).slotValues.genre)).toMatch(/self-help/i);
  });

  it("uncertain genre proposes multiple directions", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "una storia intensa con segreti e desiderio");
    state = applyInterviewAnswer(state, "non sono sicuro del genere esatto");
    const q = selectNextForgeQuestion(state);
    expect(q?.question ?? "").toMatch(/direzioni|strade|possibilit|risuona/i);
  });
});

describe("forge readiness", () => {
  it("readiness false when concept is vague", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const report = evaluateForgeReadiness(state);
    expect(report.ready).toBe(false);
    expect(report.missingCritical.length).toBeGreaterThan(0);
  });

  it("readiness improves when critical fields are present", () => {
    const before = evaluateForgeReadiness(getInitialInterviewState({ chatFirst: true }));
    let state = getInitialInterviewState({ chatFirst: true });
    const answers = [
      "Dark romance psicologico tra due persone ferite in una città gotica.",
      "Il lettore deve sentire ossessione elegante e pericolo morale.",
      "Lettrici adulte che amano tensione, vulnerabilità e confini.",
      "Tono sensuale, oscuro, lento, magnetico.",
      "Protagonista: lei fragile, cerca fuga. Antagonista: lui magnetico, pericoloso, ossessionato.",
      "Conflitto: lei vuole fuggire, lui è l'unica ancora e la minaccia.",
      "Finale devastante ma giusto — nessuno resta uguale.",
      "18 capitoli, prima persona, slow burn.",
      "Indice: incontro, tensione, caduta, conseguenza — escalation emotiva lenta.",
    ];
    for (const answer of answers) {
      const next = getNextInterviewQuestion(state);
      state = applyInterviewAnswer(state, answer, next.question ?? undefined);
    }
    const report = evaluateForgeReadiness(state);
    expect(report.missingCritical.length).toBeLessThan(before.missingCritical.length);
    expect(before.missingCritical.length).toBeGreaterThan(4);
  });
});
