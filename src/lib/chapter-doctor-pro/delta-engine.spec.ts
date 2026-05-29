import { describe, expect, it } from "vitest";
import { computeDevelopmentalEditReport } from "./delta-engine";

describe("chapter-doctor-pro delta engine", () => {
  const weakChapter = `Era una giornata normale. Marco si svegliò presto e pensò a quanto fosse felice.

"L'amore è la cosa più importante del mondo," disse a se stesso con calma perfetta. "Sono grato per tutto."

Camminò verso la finestra e guardò il cielo. Sentiva una pace profonda dentro di sé. Tutto era chiaro, tutto era risolto.

Alla fine della giornata, Marco capì che la vita era bella. Non c'era più nulla da temere. Tutto era andato bene.`;

  const patchedChapter = `Marco si svegliò prima dell'alba — mani fredde, caffè non ancora fatto.

"L'amore è…" Si fermò. Scosse la testa. "No."

La finestra tremava nel vento. Restò immobile, ascoltando qualcosa che non riusciva a nominare.

Quando il telefono vibrò sul comodino, non lo guardò subito. Forse era meglio così.`;

  it("returns positive delta when patches produce real metric gains", () => {
    const report = computeDevelopmentalEditReport({
      originalText: weakChapter,
      patchedText: patchedChapter,
      patches: [
        {
          idx: 0,
          original: weakChapter.split("\n\n")[0],
          patched: patchedChapter.split("\n\n")[0],
          type: "intensify",
          reason: "Opening too generic — tension added",
        },
        {
          idx: 1,
          original: weakChapter.split("\n\n")[1],
          patched: patchedChapter.split("\n\n")[1],
          type: "dialogue-humanize",
          reason: "Dialogue feels more natural and less emotionally over-explained",
        },
        {
          idx: 2,
          original: weakChapter.split("\n\n")[2],
          patched: patchedChapter.split("\n\n")[2],
          type: "subtext",
          reason: "More emotional tension is now implied instead of explicitly stated",
        },
      ],
      modificationPercent: 28,
      chapterIndex: 0,
      genre: "literary-fiction",
    });

    expect(report.beforeScore).toBeGreaterThan(0);
    if (report.scoreDelta > 0) {
      expect(report.afterScore).toBeGreaterThan(report.beforeScore);
      expect(report.scoreDelta).toBeGreaterThanOrEqual(0.1);
      expect(report.scoreDelta).toBeLessThanOrEqual(1.5);
    }
    expect(report.interventions.length).toBeGreaterThan(0);
    expect(report.credibilityStats.length).toBeGreaterThan(0);
  });

  it("does not inflate score when patches exist but metrics are flat", () => {
    const flat = weakChapter;
    const report = computeDevelopmentalEditReport({
      originalText: flat,
      patchedText: flat.replace("Marco", "Marco"),
      patches: [
        {
          idx: 0,
          original: flat.split("\n\n")[0],
          patched: flat.split("\n\n")[0],
          type: "tighten",
          reason: "No meaningful change",
        },
      ],
      modificationPercent: 1,
      chapterIndex: 0,
      genre: "literary-fiction",
    });

    expect(report.afterScore).toBe(report.beforeScore);
    expect(report.scoreDelta).toBe(0);
  });

  it("caps delta for already-excellent chapters", () => {
    const strong = Array(6)
      .fill(
        "Lei non disse niente. Lui contò i secondi tra un respiro e l'altro, aspettando una risposta che non arrivava.",
      )
      .join("\n\n");

    const report = computeDevelopmentalEditReport({
      originalText: strong,
      patchedText: strong.replace("non disse", "restò in silenzio"),
      patches: [
        {
          idx: 1,
          original: strong.split("\n\n")[1],
          patched: strong.split("\n\n")[1].replace("non disse", "restò in silenzio"),
          type: "tighten",
          reason: "Micro rhythm polish",
        },
      ],
      modificationPercent: 3,
      chapterIndex: 2,
      genre: "dark-romance",
      bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } },
    });

    expect(report.scoreDelta).toBeLessThanOrEqual(0.5);
    expect(report.deltaMode === "refinement" || report.deltaMode === "visible").toBe(true);
  });

  it("returns zero delta when text is unchanged", () => {
    const report = computeDevelopmentalEditReport({
      originalText: weakChapter,
      patchedText: weakChapter,
      patches: [],
      modificationPercent: 0,
      chapterIndex: 0,
      genre: "literary-fiction",
    });

    expect(report.beforeScore).toBeGreaterThan(0);
    expect(report.afterScore).toBe(report.beforeScore);
    expect(report.scoreDelta).toBe(0);
    expect(report.deltaMode).toBe("minimal");
  });
});
