import { describe, expect, it, vi } from "vitest";
import {
  analyzeChapterContinuityAssembly,
  repairChapterContinuityAssembly,
} from "./chapter-continuity-assembly";
import { runNarrativeContinuityGate } from "./narrative-continuity-gate";

const CHAPTER_3_FAILURE = {
  subchapters: [
    {
      title: "3.1 — L'incontro",
      content: [
        "Sofia aprì la porta e Alessandro entrò senza parlare.",
        "Sul tavolo c'era la foto del padre, ingiallita dal tempo.",
        "«Questo è Carlo Rinaldi», disse lei. «Rimini, 1964. La lettera spiega tutto.»",
        "Lui annuì piano, come se ogni parola pesasse più del necessario.",
        "Quando uscirono dal silenzio, lei disse solo: «Possiamo scoprirlo insieme.»",
      ].join("\n\n"),
    },
    {
      title: "3.2 — Prima dell'incontro",
      content: [
        "Alessandro era a casa quando trovò di nuovo quella foto nel cassetto.",
        "La guardò a lungo, poi decise di andare da Sofia.",
        "Prese la macchina verso il centro, con le mani che non trovarono a da fare sul volante.",
        "Sapeva che quell'incontro avrebbe cambiato tutto, ma non poteva più rimandare.",
      ].join("\n\n"),
    },
    {
      title: "3.3 — La soglia",
      content: [
        "Davanti al portone di Sofia, Alessandro esitò un secondo.",
        "Poi suonò il campanello e attese, con il cuore che batteva più forte del necessario.",
        "Quando lei aprì la porta, lui entrò come se varcasse una soglia già attraversata mille volte.",
        "Sul tavolo c'era di nuovo la foto del padre. «Questo è Carlo Rinaldi», ripeté lei. «Rimini, 1964.»",
      ].join("\n\n"),
    },
  ],
};

const CHAPTER_3_REPAIRED = {
  subchapters: [
    CHAPTER_3_FAILURE.subchapters[0]!,
    {
      title: "3.2 — Dopo l'incontro",
      content: [
        "Uscirono insieme dal portone con la promessa ancora sospesa tra loro.",
        "Alessandro non tornò subito a casa: camminò fino al parco, ripensando alla foto e alla lettera.",
        "La sera lo trovò più lucido, non più diviso tra paura e desiderio di sapere.",
        "Quando il telefono restò muto, capì che la scoperta sarebbe continuata il giorno dopo.",
      ].join("\n\n"),
    },
    {
      title: "3.3 — La conseguenza",
      content: [
        "Il mattino seguente Alessandro tornò da Sofia perché lei lo aveva chiamato.",
        "«Ho trovato un'altra lettera», disse senza preamboli, stando già in soggiorno con lui.",
        "Non servì ripetere nomi o date: parlarono solo di cosa fare adesso.",
        "La scoperta non era finita, ma almeno non dovevano più ricominciare dallo stesso punto.",
      ].join("\n\n"),
    },
  ],
};

describe("chapter-continuity-assembly — Chapter 3 regression", () => {
  it("detects backward time travel, duplicate threshold, and duplicate revelation", () => {
    const assembly = analyzeChapterContinuityAssembly(CHAPTER_3_FAILURE);
    const gate = runNarrativeContinuityGate({
      title: "Spostati di un secondo",
      content: "",
      subchapters: CHAPTER_3_FAILURE.subchapters,
    });

    expect(gate.pass).toBe(false);
    expect(gate.score).toBeLessThan(50);
    expect(assembly.criticalFailureTypes).toEqual(
      expect.arrayContaining(["backward_time_travel", "duplicate_threshold", "duplicate_revelation"]),
    );
    expect(gate.criticalFailures.length).toBeGreaterThan(0);
  });

  it("flags corrupted merge fragments", () => {
    const assembly = analyzeChapterContinuityAssembly(CHAPTER_3_FAILURE);
    expect(assembly.errors.some((e) => /corrotto|merge/i.test(e.message))).toBe(true);
  });

  it("scores repaired sequence higher than failure fixture", () => {
    const failed = runNarrativeContinuityGate({
      title: "Spostati di un secondo",
      content: "",
      subchapters: CHAPTER_3_FAILURE.subchapters,
    });
    const repaired = runNarrativeContinuityGate({
      title: "Spostati di un secondo",
      content: "",
      subchapters: CHAPTER_3_REPAIRED.subchapters,
    });

    expect(repaired.score).toBeGreaterThan(failed.score);
    expect(repaired.score).toBeGreaterThanOrEqual(60);
    expect(repaired.pass).toBe(true);
  });

  it("improves score after mock regeneration of offending subchapters", async () => {
    const regen = vi.fn(async (subIndex: number) => {
      const replacement = CHAPTER_3_REPAIRED.subchapters[subIndex]!;
      return { title: replacement.title, content: replacement.content };
    });

    const repair = await repairChapterContinuityAssembly(
      { title: "Spostati di un secondo", content: "", subchapters: CHAPTER_3_FAILURE.subchapters },
      {
        language: "Italian",
        maxRegenAttemptsPerSubchapter: 2,
        regenerateSubchapter: regen,
      },
    );

    const gate = runNarrativeContinuityGate(repair.chapter);
    expect(regen).toHaveBeenCalled();
    expect(gate.score).toBeGreaterThan(50);
    expect(gate.pass).toBe(true);
  });
});
