import { describe, expect, it } from "vitest";
import {
  assembleChapterFromSubchapters,
  ensureNarrativeSubchapterOutlines,
  validateSubchapterNarrativeUnit,
} from "./subchapter-pipeline";

describe("subchapter-pipeline", () => {
  it("assembles chapter content only after subchapters exist", () => {
    const assembled = assembleChapterFromSubchapters([
      { title: "Evento", content: "A".repeat(120) },
      { title: "Conseguenza", content: "B".repeat(120) },
      { title: "Decisione", content: "C".repeat(120) },
    ]);
    expect(assembled).toContain("A".repeat(20));
    expect(assembled).toContain("C".repeat(20));
    expect(assembled.split("\n\n")).toHaveLength(3);
  });

  it("validates a real narrative subchapter unit", () => {
    const content = [
      "Marco entrò in cucina e trovò la tazza ancora calda, come se qualcuno fosse appena uscito.",
      "Non chiamò. Aspettò che il silenzio gli desse una risposta meno crudele di quella che temeva.",
      "Quando finalmente prese il telefono, capì che non poteva più rimandare.",
    ].join("\n\n");
    expect(validateSubchapterNarrativeUnit(content).valid).toBe(true);
  });

  it("labels subchapter outlines with narrative purposes", () => {
    const outlines = ensureNarrativeSubchapterOutlines([], "Capitolo di ritorno e scelta.", 3, {
      language: "Italian",
      genre: "romance",
      numberOfChapters: 10,
    });
    expect(outlines.map((outline) => outline.purpose)).toEqual(["Evento", "Conseguenza", "Decisione"]);
  });
});
