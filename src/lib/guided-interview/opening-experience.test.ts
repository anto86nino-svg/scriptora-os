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
import { getForgeMemory, isSlotFilled } from "./interview-memory";
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

  it("returns night daypart after 11pm", () => {
    expect(getForgeDaypart(new Date("2026-05-29T23:30:00"))).toBe("night");
  });

  it("empty state first message is host greeting, not technical", () => {
    const state = getInitialInterviewState({
      chatFirst: true,
      hostContext: { penName: "Antonino", date: new Date("2026-05-29T09:00:00") },
    });
    const opening = state.messages[0]?.content ?? "";
    expect(isFirstForgeAssistantMessage(state)).toBe(true);
    expect(opening).toMatch(/Buongiorno, Antonino/i);
    expect(opening).toMatch(/costruire il libro/i);
    for (const phrase of FORBIDDEN_PREMATURE_PHRASES) {
      expect(opening.toLowerCase()).not.toContain(phrase);
    }
  });

  it("queues genre question before first user answer", () => {
    const state = getInitialInterviewState({ chatFirst: true });
    const next = getNextInterviewQuestion(state);
    expect(next.done).toBe(false);
    expect(next.question?.question).toMatch(/Che tipo di libro/i);
    const depth = getEditorialDepthQuestions(state);
    for (const q of depth) {
      expect(isTechnicalPrematureContent(q.question)).toBe(false);
    }
  });
});

describe("interview stages", () => {
  it("non lo so produces guided options after genre selection", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Romanzo · Dark Romance · dark-romance · Narrativa");
    state = applyInterviewAnswer(state, "non lo so");
    const q = selectNextForgeQuestion(state);
    expect(q).not.toBeNull();
    expect(q!.question).toMatch(/limite|poli|ferita|tensione|direzioni|vibra|strade|risuona|guid/i);
    expect((q!.quickSuggestions?.length ?? 0)).toBeGreaterThanOrEqual(2);
  });

  it("dark romance produces different memory than self-help", () => {
    let dark = getInitialInterviewState({ chatFirst: true });
    dark = applyInterviewAnswer(dark, "Romanzo · Dark Romance · dark-romance · Narrativa");
    let help = getInitialInterviewState({ chatFirst: true });
    help = applyInterviewAnswer(help, "Saggio · Self Help · self-help · Non Fiction");

    expect(getForgeMemory(dark).slotValues.genre).not.toBe(getForgeMemory(help).slotValues.genre);
    const darkQ = selectNextForgeQuestion(dark);
    const helpQ = selectNextForgeQuestion(help);
    expect(darkQ?.id).not.toBe("genre-direction");
    expect(helpQ?.id).not.toBe("genre-direction");
    expect(String(getForgeMemory(dark).slotValues.genre)).toMatch(/romance|dark/i);
    expect(String(getForgeMemory(help).slotValues.genre)).toMatch(/self-help/i);
  });

  it("uncertain answer advances adaptive interview after genre lock", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "Romanzo · Thriller · thriller · Narrativa");
    state = applyInterviewAnswer(state, "una storia intensa con segreti e desiderio");
    state = applyInterviewAnswer(state, "non sono sicuro del genere esatto");
    const q = selectNextForgeQuestion(state);
    expect(q?.question ?? "").toMatch(/minaccia|segreto|paura|protagonista|finale|limite|vibra|direzioni|lingua|tono/i);
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
      "Romanzo · Dark Romance · dark-romance · Narrativa",
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
    const memory = getForgeMemory(state);
    expect(isSlotFilled(memory, "genre")).toBe(true);
    expect(report.missingCritical.length).toBeLessThan(before.missingCritical.length + 2);
    expect(before.missingCritical.length).toBeGreaterThan(0);
  });
});
