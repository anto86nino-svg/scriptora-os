import { describe, expect, it } from "vitest";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "./question-engine";
import {
  buildForgeMemoryRecap,
  getForgeMemory,
  isQuestionAlreadyAnswered,
  isSimilarQuestionRecentlyAsked,
  isSlotFilled,
  markQuestionAsked,
  selectNextMemoryQuestion,
  updateForgeMemoryFromAnswer,
} from "./interview-memory";
import { evaluateForgeReadiness } from "./forge-readiness";
import { evaluateEditorialUnderstanding } from "./book-understanding-engine";

describe("interview memory", () => {
  it("saves Italian language and skips language question", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "voglio scrivere un dark romance in italiano su una ragazza fragile e un uomo pericoloso",
    );
    const memory = getForgeMemory(state);
    expect(memory.slotValues.language).toBe("Italiano");
    expect(memory.slotValues.genre).toMatch(/dark-romance|dark romance/i);

    const next = selectNextMemoryQuestion(state);
    expect(next?.id).not.toBe("language-confirmation");
    expect(next?.question ?? "").not.toMatch(/in che lingua/i);
  });

  it("after dark romance does not ask genre again, moves forward", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "voglio scrivere un dark romance in italiano su una ragazza fragile e un uomo pericoloso",
    );
    const next = selectNextMemoryQuestion(state);
    expect(next?.id).not.toBe("genre-direction");
    expect(["tone-preset", "audience-preset", "promise-preset", "characters-preset"]).toContain(
      next?.id,
    );
  });

  it("does not repeat asked question keys", () => {
    const memory = markQuestionAsked(
      "language-confirmation",
      markQuestionAsked("language-confirmation", getForgeMemory(getInitialInterviewState({ chatFirst: true }))),
    );
    expect(isQuestionAlreadyAnswered("language-confirmation", memory)).toBe(true);
    expect(isSimilarQuestionRecentlyAsked("language-confirmation", memory)).toBe(true);
  });

  it("non lo so shows preset choices", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "ho un'idea confusa su un libro intenso");
    state = applyInterviewAnswer(state, "non lo so, guidami");
    const next = selectNextMemoryQuestion(state);
    expect(next?.quickSuggestions?.length ?? 0).toBeGreaterThanOrEqual(3);
    expect(next?.question ?? "").toMatch(/direzioni|opzioni|vibra/i);
  });

  it("advances stage after useful answers", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    const answers = [
      "dark romance in italiano tra due persone ferite",
      "Italiano",
      "Dark romance psicologico",
      "Tono elegante e oscuro",
    ];
    for (const answer of answers) {
      const next = getNextInterviewQuestion(state);
      state = applyInterviewAnswer(state, answer, next.question ?? undefined);
    }
    const memory = getForgeMemory(state);
    expect(memory.usefulAnswerCount).toBeGreaterThanOrEqual(4);
    expect(memory.currentStage).not.toBe("welcome");
    expect(isSlotFilled(memory, "language")).toBe(true);
    expect(isSlotFilled(memory, "genre")).toBe(true);
  });

  it("readiness false when language missing", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "thriller psicologico su segreti familiari");
    const report = evaluateForgeReadiness(state);
    expect(report.ready).toBe(false);
    expect(report.missingCritical).toContain("lingua");
  });

  it("readiness false when genre missing", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, "voglio scrivere in italiano qualcosa di molto personale");
    const report = evaluateForgeReadiness(state);
    expect(report.ready).toBe(false);
    expect(report.missingCritical.some((m) => /genere|tipo/.test(m))).toBe(true);
  });

  it("readiness true only with critical slots filled", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    const { memory: seeded } = updateForgeMemoryFromAnswer(
      getInitialInterviewState({ chatFirst: true }),
      "dark romance in italiano",
      { id: "opening", key: "openingSpark" },
    );
    let rich = {
      ...getInitialInterviewState({ chatFirst: true }),
      forgeMemory: {
        ...seeded,
        usefulAnswerCount: 6,
        slotValues: {
          ...seeded.slotValues,
          rawIdea: "Dark romance tra ragazza fragile e uomo pericoloso in città gotica.",
          language: "Italiano",
          genre: "dark-romance",
          bookType: "Dark romance",
          tone: "Elegante, oscuro, sensuale, lento.",
          audience: "Lettrici adulte che amano ossessione e vulnerabilità.",
          promise: "Desiderio proibito con conseguenze reali.",
          protagonist: "Lei fragile, lui pericoloso, entrambi feriti.",
          centralConflict: "Attrazione e paura del tradimento.",
          endingDirection: "Finale devastante ma giusto.",
          chapterCount: "18",
          pov: "Prima persona",
          title: "Titolo provvisorio",
        },
        answeredSlots: {
          rawIdea: true,
          language: true,
          genre: true,
          bookType: true,
          tone: true,
          audience: true,
          promise: true,
          protagonist: true,
          centralConflict: true,
          endingDirection: true,
          chapterCount: true,
          pov: true,
          title: true,
        },
      },
      messages: Array.from({ length: 8 }, (_, i) => ({
        id: `u-${i}`,
        role: "user" as const,
        content: `Risposta dettagliata numero ${i + 1} con abbastanza testo per contare.`,
        createdAt: i,
      })),
    };
    const report = evaluateForgeReadiness(rich);
    expect(report.ready).toBe(true);
  });

  it("mini recap contains saved data and missing slots", () => {
    const { memory } = updateForgeMemoryFromAnswer(
      getInitialInterviewState({ chatFirst: true }),
      "dark romance in italiano elegante e oscuro",
      { id: "spark-idea", key: "openingSpark" },
    );
    memory.usefulAnswerCount = 3;
    const recap = buildForgeMemoryRecap(memory);
    expect(recap).toMatch(/Fin qui ho capito/i);
    expect(recap).toMatch(/lingua|direzione|italiano|dark/i);
  });

  it("preset choice updates slot values", () => {
    const { memory, diff } = updateForgeMemoryFromAnswer(
      getInitialInterviewState({ chatFirst: true }),
      "English",
      { id: "language-confirmation", key: "language" },
    );
    expect(memory.slotValues.language).toBe("English");
    expect(diff.newlyFilledSlots).toContain("language");
    expect(isSlotFilled(memory, "language")).toBe(true);
  });

  it("thriller profile answers build editorial understanding", () => {
    let s = getInitialInterviewState({ chatFirst: true });
    s = applyInterviewAnswer(s, "Un uomo trova qualcosa che non avrebbe dovuto trovare.");
    const answers: Record<string, string> = {
      readerTransformation:
        "Il lettore deve chiudere con paranoia crescente e la certezza che nessuno è innocente.",
      centralConflict:
        "Indagine personale contro un sistema che lo vuole silenziato — ogni indizio scoperto costa qualcosa di reale.",
      protagonistWound: "Ha ignorato un crimine passato e ora la verità lo raggiunge.",
      narrativeDrive: "Ogni prova lo avvicina a un complotto più grande di lui.",
      emotionalTone: "Teso, claustrofobico, investigativo, disturbante, realistico.",
      genreDNA: "Thriller psicologico investigativo noir urbano, non horror soprannaturale.",
      promise: "Una corsa contro il tempo dove ogni risposta apre una domanda più pericolosa.",
      setting: "Città industriale, magazzini, archivi, notti senza luna.",
      targetReader: "Lettori di thriller psicologico che amano indizi, sospetti e verità nascoste.",
    };
    for (const [key, value] of Object.entries(answers)) {
      s = applyInterviewAnswer(s, value, { id: `seed-${key}`, key });
    }
    s = applyInterviewAnswer(s, "Italiano", { id: "seed-language", key: "language" });
    const report = evaluateEditorialUnderstanding(s);
    expect(report.readyForBlueprint).toBe(true);
  });

  it("self-help in english does not suggest dark romance", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "voglio un libro in inglese self help per persone bloccate",
    );
    const memory = getForgeMemory(state);
    expect(memory.slotValues.language).toBe("English");
    expect(memory.slotValues.genre).toMatch(/self-help/i);
    const next = selectNextMemoryQuestion(state);
    expect(next?.quickSuggestions?.map((c) => c.label).join(" ") ?? "").not.toMatch(
      /Dark romance/i,
    );
  });
});
