import { describe, expect, it } from "vitest";
import {
  assembleChapterFromSubchapters,
  ensureNarrativeSubchapterOutlines,
  resolveGeneratedChapterAssembly,
  syncChapterContentWithSubchapters,
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

  it("resolves pipeline assembly into subchapters and merged chapter content", () => {
    const subs = [
      { title: "6.1", content: "Prima scena. ".repeat(40) },
      { title: "6.2", content: "Seconda scena. ".repeat(40) },
      { title: "6.3", content: "Terza scena. ".repeat(40) },
    ];
    const bloatedContent = `${subs.map((sub) => sub.content).join("\n\n")}\n\n${subs[0]!.content}`;

    const resolved = resolveGeneratedChapterAssembly({
      useSubchapterPipeline: true,
      generatedChapter: { content: bloatedContent, subchapters: subs },
      finalContent: bloatedContent,
      chapterIndex: 5,
      expectedCount: 3,
    });

    expect(resolved.subchapters).toHaveLength(3);
    expect(resolved.subchapters.every((sub) => sub.content.length >= 80)).toBe(true);
    expect(resolved.content).toBe(assembleChapterFromSubchapters(resolved.subchapters));
    expect(resolved.content).not.toContain(subs[0]!.content + "\n\n" + subs[0]!.content);
  });

  it("falls back to distribution when pipeline subchapters are empty", () => {
    const chapterContent = [
      "Prima unita narrativa con abbastanza testo per essere reale.",
      "Seconda unita narrativa con abbastanza testo per essere reale.",
      "Terza unita narrativa con abbastanza testo per essere reale.",
    ].map((paragraph) => `${paragraph} ${"dettaglio ".repeat(20)}`).join("\n\n");

    const resolved = resolveGeneratedChapterAssembly({
      useSubchapterPipeline: true,
      generatedChapter: { content: chapterContent, subchapters: [] },
      finalContent: chapterContent,
      chapterIndex: 5,
      expectedCount: 3,
    });

    expect(resolved.subchapters).toHaveLength(3);
    expect(resolved.subchapters.every((sub) => sub.content.length >= 80)).toBe(true);
    expect(resolved.content).toBe(assembleChapterFromSubchapters(resolved.subchapters));
  });

  it("syncChapterContentWithSubchapters redistributes edited chapter body into subchapters", () => {
    const subs = [
      { title: "6.1", content: "Prima scena. ".repeat(30) },
      { title: "6.2", content: "Seconda scena. ".repeat(30) },
      { title: "6.3", content: "Terza scena. ".repeat(30) },
    ];
    const edited = `${subs[0]!.content}\n\n${subs[1]!.content.slice(0, 120)} [Limite parole del piano raggiunto.]`;

    const synced = syncChapterContentWithSubchapters({ content: edited, subchapters: subs }, 5);
    expect(synced.content).toBe(edited);
    expect(synced.subchapters?.every((sub) => sub.content.length > 0)).toBe(true);
    expect(synced.content).toContain("[Limite parole del piano raggiunto.]");
  });
});
