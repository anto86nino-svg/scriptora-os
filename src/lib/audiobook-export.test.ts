import { describe, expect, it } from "vitest";
import type { BookProject } from "@/types/book";
import { isRealAudioFileExportSupported } from "@/lib/audiobook-capabilities";
import {
  buildAudiobookManifest,
  buildAudiobookScript,
  estimateAudiobookDuration,
  sanitizeAudiobookText,
  splitBookIntoAudioChapters,
} from "./audiobook-export";

function sampleProject(): BookProject {
  return {
    id: "p1",
    phase: "chapters",
    config: {
      title: "Un detective indaga",
      subtitle: "Thriller urbano",
      language: "Italian",
      authorName: "Mario Rossi",
      numberOfChapters: 2,
    } as BookProject["config"],
    chapters: [
      {
        title: "La prima traccia",
        content: "## Intro\n\nIl detective **Marco** entrò. Genre Coach suggerì un tono cupo. [Tap Play] per continuare.",
        subchapters: [],
      },
      {
        title: "CHUNK_START segreto",
        content: "Chapter Intelligence segnalò un problema. La pioggia batteva sui vetri.",
        subchapters: [],
      },
      {
        title: "Vuoto",
        content: "   ",
        subchapters: [],
      },
    ],
    blueprint: null,
    frontMatter: {} as BookProject["frontMatter"],
    backMatter: {} as BookProject["backMatter"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("audiobook capabilities guard", () => {
  it("non promette MP3/M4B finché non c'è backend TTS", () => {
    expect(isRealAudioFileExportSupported()).toBe(false);
  });
});

describe("sanitizeAudiobookText", () => {
  it("rimuove markdown e label tecniche/UI", () => {
    const raw = "## Titolo\n\n**Marco** corre. Export Studio · Analysis Pro. [Tap Play] adesso.";
    const clean = sanitizeAudiobookText(raw);
    expect(clean).toContain("Marco");
    expect(clean).toContain("corre");
    expect(clean).not.toContain("**");
    expect(clean).not.toContain("[Tap Play]");
    expect(clean).not.toContain("Export Studio");
    expect(clean).not.toContain("Analysis Pro");
  });

  it("filtra righe prompt leakage", () => {
    const raw = "CHUNK_START\n\nTesto valido qui.";
    const clean = sanitizeAudiobookText(raw);
    expect(clean).not.toContain("CHUNK_START");
    expect(clean).toContain("Testo valido");
  });

  it("rimuove contaminazioni inline tipo Genre Coach", () => {
    const clean = sanitizeAudiobookText("Marco cammina. Genre Coach consiglia ritmo lento.");
    expect(clean).toContain("Marco cammina");
    expect(clean).not.toContain("Genre Coach");
  });

  it("ripulisce marker streaming e placeholder prima del TTS", () => {
    const clean = sanitizeAudiobookText(
      'La porta si aprì.__DELTA__{"content":"Non va letto."} undefined null __RESULT__{"success":true}',
    );

    expect(clean).toContain("La porta si aprì.");
    expect(clean).not.toContain("__DELTA__");
    expect(clean).not.toContain("__RESULT__");
    expect(clean).not.toContain("undefined");
    expect(clean).not.toContain("null");
  });
});

describe("estimateAudiobookDuration", () => {
  it("calcola durata coerente a 150 wpm", () => {
    const words = Array.from({ length: 300 }, (_, i) => `word${i}`).join(" ");
    expect(estimateAudiobookDuration(words, 150)).toBe(2);
    expect(estimateAudiobookDuration("", 150)).toBe(0);
  });
});

describe("splitBookIntoAudioChapters", () => {
  it("ordina capitoli con id e salta vuoti", () => {
    const segments = splitBookIntoAudioChapters(sampleProject());
    expect(segments).toHaveLength(2);
    expect(segments[0].id).toBe("p1-ch-0");
    expect(segments[0].index).toBe(0);
    expect(segments[0].title).toContain("prima");
    expect(segments[1].text).toContain("pioggia");
    expect(segments[1].text).not.toContain("Chapter Intelligence");
  });
});

describe("buildAudiobookManifest", () => {
  it("restituisce metadata corretti e exportMode onesto", () => {
    const manifest = buildAudiobookManifest(sampleProject());
    expect(manifest.title).toBe("Un detective indaga");
    expect(manifest.author).toBe("Mario Rossi");
    expect(manifest.chapterCount).toBe(2);
    expect(manifest.exportMode).toBe("script_and_listen_only");
    expect(manifest.estimatedTotalMinutes).toBeGreaterThan(0);
  });
});

describe("buildAudiobookScript", () => {
  it("include titolo, autore, capitoli e pause ma non label UI", () => {
    const script = buildAudiobookScript(sampleProject());
    expect(script.plainText).toContain("Un detective indaga");
    expect(script.plainText).toContain("Autore: Mario Rossi");
    expect(script.plainText).toContain("Capitolo 1.");
    expect(script.plainText).toContain("[Pausa breve]");
    expect(script.plainText).toContain("[Pausa lunga]");
    expect(script.plainText).not.toContain("Genre Coach");
    expect(script.plainText).not.toContain("Export Studio");
    expect(script.manifest.chapters).toHaveLength(2);
  });
});
