import { describe, expect, it } from "vitest";
import {
  buildFormatQualityRepairPrompt,
  buildUniversalWritingQualityRulesBlock,
  requiresFormatQualityRepair,
  validateFormatChapterQuality,
  validateNarrativeChapterQuality,
} from "./writing-quality-gate";

function issueKindsFor(text: string, context = {}) {
  return validateNarrativeChapterQuality(text, context).issues.map((issue) => issue.kind);
}

describe("writing quality gate", () => {
  it("flags duplicate contract/signature events", () => {
    const chapter = `Livia poso' il contratto sul tavolo. Marco prese la penna e firmo' l'accordo senza guardarla.

La pioggia batteva sui vetri. Dopo tre pagine di esitazioni, Livia riapri' la cartellina: il contratto era di nuovo davanti a loro, e Marco lo firmo' un'altra volta come se nulla fosse accaduto.`;

    expect(issueKindsFor(chapter)).toContain("duplicate_event");
  });

  it("flags repeated emotional beats", () => {
    const chapter = `Avrebbe dovuto andarsene. Non lo fece.
Avrebbe dovuto andarsene, e invece resto' sulla soglia. Non lo fece.
Avrebbe dovuto andarsene prima che fosse troppo tardi. Non lo fece.`;

    expect(issueKindsFor(chapter)).toContain("repeated_beat");
  });

  it("flags broken sentences", () => {
    const chapter = `La guardo' stesse leggendo qualcosa che lui non aveva mai confessato. La verita'. fosse cosi semplice.`;

    expect(issueKindsFor(chapter)).toContain("broken_sentence");
  });

  it("flags timeline confusion without a transition", () => {
    const chapter = `La mattina trovarono la lettera sotto la porta. Nel pomeriggio discussero del nome scritto in rosso. La mattina dopo erano ancora nella stessa stanza, senza che il capitolo avesse attraversato la sera o la notte.`;

    expect(issueKindsFor(chapter)).toContain("timeline_confusion");
  });

  it("flags poetry format contamination from novel tropes", () => {
    const chapter = `La raccolta avra' 20 capitoli con forced proximity, baci proibiti e trappole sentimentali. Capitolo 1: il love interest entra in scena con un cliffhanger seriale.`;

    expect(issueKindsFor(chapter, { bookFormat: "poetry_collection", genre: "poetry" })).toContain("format_contamination");
  });

  it("passes a coherent clean chapter", () => {
    const chapter = `La mattina, Elena trovo' una chiave nera nella tasca del cappotto di suo padre.

Nel pomeriggio la porto' alla serra, dove il lucchetto arrugginito cedette con un rumore secco. Dietro la porta non c'era un tesoro, ma una fotografia bruciata a meta': sua madre, giovane, accanto a un uomo che Elena non aveva mai visto.

Dopo una lunga notte senza sonno, la mattina dopo scelse di non mostrarla a nessuno. La nascose nel diario e scrisse una sola domanda: chi aveva cancellato il volto?`;

    const report = validateNarrativeChapterQuality(chapter, { genre: "thriller", language: "Italian" });

    expect(report.passed).toBe(true);
    expect(report.needsRepair).toBe(false);
    expect(report.issues).toHaveLength(0);
  });

  it("builds the non-negotiable Italian prompt rules", () => {
    const block = buildUniversalWritingQualityRulesBlock("Italian");

    expect(block).toContain("REGOLE QUALITA'");
    expect(block).toContain("Non ripetere due volte la stessa scena");
    expect(block).toContain("gancio concreto");
  });

  it("routes poetry to format-dedicated repair", () => {
    expect(requiresFormatQualityRepair({
      bookFormat: "poetry_collection",
      genre: "poetry",
    } as any)).toBe(true);
  });

  it("builds format repair prompt from kernel quality gate", () => {
    const report = validateFormatChapterQuality("Il protagonista affronta la trama.", {
      config: {
        bookFormat: "manual",
        genre: "manual",
        language: "Italian",
      } as any,
      language: "Italian",
      chapterTitle: "Capitolo 1",
    });

    const prompt = buildFormatQualityRepairPrompt({
      chapterText: "Il protagonista affronta la trama.",
      report,
      config: { bookFormat: "manual", genre: "manual", language: "Italian" } as any,
      language: "Italian",
      chapterTitle: "Capitolo 1",
    });

    expect(prompt).toContain("manual");
    expect(prompt).toContain("MUST HAVE");
    expect(prompt).toContain("REJECT IF");
  });
});
