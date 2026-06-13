import { describe, expect, it } from "vitest";
import { runManuscriptQualityV3 } from "./index";

describe("ManuscriptQualityV3", () => {
  it("strips prompt leakage and duplicate paragraphs", () => {
    const raw = `Marco guardò fuori.\n\nMarco guardò fuori.\n\nAs an AI language model, I cannot help.`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Test", genre: "thriller", language: "Italian", numberOfChapters: 10 } as any,
    });
    expect(result.text).not.toContain("As an AI");
    expect(result.sanitized).toBe(true);
  });

  it("returns antiRepetitionRemoved count", () => {
    const result = runManuscriptQualityV3("Un paragrafo unico e pulito.", { language: "Italian" });
    expect(result.antiRepetitionRemoved).toBeGreaterThanOrEqual(0);
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("removes known technical leakage and broken punctuation in Italian prose", () => {
    const raw = `Marco chiuse la porta, .\n\nGenre Coach: usa dopo Scansione rapida o Chapter Doctor.\n\nThe next move would not wait for her.\n\nRestò in silenzio.`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Test", genre: "thriller", language: "Italian", numberOfChapters: 10 } as any,
    });
    expect(result.text).not.toContain("Genre Coach");
    expect(result.text).not.toContain("The next move");
    expect(result.text).not.toContain(", .");
    expect(result.text).toContain("Restò in silenzio.");
  });

  it("locks obvious English leakage out of Italian narrative output", () => {
    const raw = `Luca abbassò lo sguardo.\n\nMeanwhile, she said nothing softly.\n\nThe detail finally revealed itself — not as closure.`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Test", genre: "romance", language: "Italian", numberOfChapters: 10 } as any,
    });
    expect(result.text).toContain("nel frattempo");
    expect(result.text).not.toMatch(/The detail finally/i);
    expect(result.text).not.toMatch(/\bsoftly\b/i);
  });

  it("removes repeated emotional beats already used in prior chapters", () => {
    const priorText = `«Ho paura», disse Emma.\n\nLeo la strinse e promise: un giorno alla volta.`;
    const raw = [
      "Emma entrò senza togliersi il cappotto.",
      "«Ho paura», disse, perché aveva paura di perderlo e non sapeva come restare.",
      "Poi prese il telefono e chiamò l'avvocato. Da quel momento non poteva più fingere.",
      "La stanza sembrò più piccola.",
    ].join("\n\n");
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      priorText,
      config: { title: "Test", genre: "romance", language: "Italian", numberOfChapters: 10 } as any,
    });
    expect(result.text).not.toContain("perché aveva paura di perderlo");
    expect(result.text).toContain("chiamò l'avvocato");
    expect(result.antiRepetitionRemoved).toBeGreaterThan(0);
  });

  it("does not romance-humanize nonfiction/manual output", () => {
    const raw = `Framework operativo\n\nStep 1: definisci il risultato.\n\nslow burn e chimica romantica non appartengono a questa sezione.\n\nChecklist: misura, esegui, rivedi.`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Manuale", genre: "business", category: "Nonfiction", subcategory: "Manual", language: "Italian", numberOfChapters: 8 } as any,
    });
    expect(result.text).not.toMatch(/slow burn|chimica romantica/i);
    expect(result.text).toContain("Checklist");
  });

  it("preserves clean literary/poetry prose without aggressive trimming", () => {
    const raw = `Nel cortile, la pioggia faceva piano.\n\nNon chiedeva perdono. Cadeva e basta.\n\nLa bambina contò tre gocce sul dorso della mano.`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Poesie", genre: "poetry", category: "Poetry", language: "Italian", numberOfChapters: 6 } as any,
    });
    expect(result.text).toContain("Nel cortile");
    expect(result.text).toContain("Non chiedeva perdono");
    expect(result.text).toContain("tre gocce");
  });

  it("cleans marker-only output down to empty so generation can reject it", () => {
    const raw = `Genre Coach: usa dopo Scansione rapida.\n\nThe next move would not wait for her.\n\n, .`;
    const result = runManuscriptQualityV3(raw, {
      language: "Italian",
      config: { title: "Test", genre: "thriller", language: "Italian", numberOfChapters: 10 } as any,
    });
    expect(result.text).toBe("");
  });
});
