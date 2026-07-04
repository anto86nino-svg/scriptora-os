import { describe, expect, it } from "vitest";
import {
  evaluateKeywordQuality,
  evaluateSummaryQuality,
  evaluateStudyTextQuality,
  hasStudyPlaceholderText,
} from "./study-quality-gates";

const GOOD_TEXT = `
La fotosintesi clorofilliana è il processo attraverso cui le piante trasformano acqua, anidride carbonica e luce in glucosio e ossigeno.
Questo processo avviene nei cloroplasti, dove la clorofilla assorbe energia luminosa e permette una serie di reazioni chimiche.
La fase luminosa produce energia chimica, mentre il ciclo di Calvin utilizza questa energia per fissare il carbonio.
Capire la fotosintesi è importante perché collega energia solare, catene alimentari, atmosfera e sopravvivenza degli organismi.
Gli studenti devono ricordare reagenti, prodotti, luogo del processo e relazione tra luce e produzione di glucosio.
`;

describe("Study text quality gate", () => {
  it("passes readable study material", () => {
    const report = evaluateStudyTextQuality(GOOD_TEXT, { sourceType: "txt" });

    expect(report.status).toBe("pass");
    expect(report.score).toBeGreaterThanOrEqual(78);
  });

  it("fails text that is too short for reliable OCR generation", () => {
    const report = evaluateStudyTextQuality("Foto pagina sfocata", { sourceType: "image" });

    expect(report.status).toBe("fail");
    expect(report.detectedIssues.join(" ")).toMatch(/troppo corto/i);
  });

  it("fails OCR text with split words and broken fragments", () => {
    const dirty = Array.from({ length: 10 }, () => "pa ro la con os cen za stu dio p\nxq ## 12 @@@\nframmento senza\n").join("\n");
    const report = evaluateStudyTextQuality(dirty, { sourceType: "image", ocrConfidence: 38 });

    expect(report.status).toBe("fail");
    expect(report.detectedIssues.join(" ")).toMatch(/sillabe|caratteri|confidenza/i);
  });

  it("warns on borderline but usable OCR text", () => {
    const borderline = `
La cellula è l'unità fondamentale degli esseri viventi. Contiene membrana, citoplasma e nucleo.
Alcune righe sono corte
mitocondrio
DNA
Il testo resta comprensibile perché descrive organelli, funzioni e collegamenti essenziali.
La membrana regola gli scambi, mentre i mitocondri producono energia per la cellula.
`;
    const report = evaluateStudyTextQuality(borderline, { sourceType: "image", ocrConfidence: 68 });

    expect(report.status).toBe("warning");
    expect(report.score).toBeGreaterThanOrEqual(55);
  });

  it("fails text with many random dirty characters", () => {
    const dirty = `${GOOD_TEXT}\n@@@ ### ççç ??? §§§ §§§ $$$$ @@@@ %% %% %%`.repeat(5);
    const report = evaluateStudyTextQuality(dirty, { sourceType: "image" });

    expect(report.status).toBe("fail");
  });
});

describe("Study output quality gates", () => {
  it("rejects table-like summaries in summary fields", () => {
    const report = evaluateSummaryQuality("| Concetto | Definizione |\n| --- | --- |\n| cellula | unità |", GOOD_TEXT);

    expect(report.status).toBe("fail");
    expect(report.detectedIssues.join(" ")).toMatch(/tabella/i);
  });

  it("rejects placeholder vocabulary explanations", () => {
    expect(hasStudyPlaceholderText("la spiegazione sta nel contesto del manoscritto")).toBe(true);

    const report = evaluateKeywordQuality([
      {
        word: "cellula",
        simple: "la spiegazione sta nel contesto del manoscritto",
        technical: "N/A",
        example: "placeholder",
      },
    ]);

    expect(report.status).toBe("fail");
    expect(report.detectedIssues.join(" ")).toMatch(/placeholder|incomplete/i);
  });
});
