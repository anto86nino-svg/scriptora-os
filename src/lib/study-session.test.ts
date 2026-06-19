import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  analyzeStudyMaterial,
  classifyStudyMaterial,
  readStudyFileDetailed,
  readStudyFiles,
} from "@/lib/study-session";

function studyText(topic: string, body: string): string {
  return Array.from({ length: 8 }, (_, index) => `${topic} ${index + 1}. ${body}`).join("\n\n");
}

describe("Study OS material analysis", () => {
  it("classifies core school and university subjects from real textual signals", () => {
    expect(classifyStudyMaterial(studyText("Storia", "La rivoluzione del 1789 ebbe cause economiche, guerra, monarchia e conseguenze politiche.")).type).toBe("history");
    expect(classifyStudyMaterial(studyText("Diritto", "Articolo, comma, codice civile, norma, contratto, obbligazione e costituzione regolano il caso.")).type).toBe("law");
    expect(classifyStudyMaterial(studyText("Informatica", "Algoritmo, database, funzione, variabile, classe, server, API e protocollo descrivono il software.")).type).toBe("computer-science");
    expect(classifyStudyMaterial(studyText("Chimica", "Atomo, molecola, reazione, legame, acido, base, ossidazione, riduzione e soluzione.")).type).toBe("chemistry");
    expect(classifyStudyMaterial(studyText("Economia", "Domanda, offerta, mercato, prezzo, inflazione, PIL, costo, ricavo e bilancio.")).type).toBe("economics");
  });

  it("generates distinct study modes, notes, true-false, exercises and maps", () => {
    const result = analyzeStudyMaterial(studyText(
      "Fisica",
      "La forza modifica il moto. Energia, massa, velocita, accelerazione, campo e onda sono concetti collegati da leggi e applicazioni numeriche.",
    ));

    expect(result.studyNotesPro).toContain("Scheda Studio Pro");
    expect(result.summaries?.brief).toBeTruthy();
    expect(result.summaries?.university).toBeTruthy();
    expect(result.summaries?.brief).not.toBe(result.summaries?.university);
    expect(result.trueFalse?.length).toBeGreaterThan(0);
    expect(result.exercises?.length).toBeGreaterThanOrEqual(3);
    expect(result.conceptMap?.nodes.length).toBeGreaterThan(2);
  });
});

describe("Study OS file ingestion", () => {
  it("reads and merges multiple text files with source headings", async () => {
    const first = new File([studyText("Prima dispensa", "Storia, cause, conseguenze e periodo storico.")], "prima.txt", { type: "text/plain" });
    const second = new File([studyText("Seconda dispensa", "Diritto, articolo, comma, norma e sentenza.")], "seconda.md", { type: "text/markdown" });

    const result = await readStudyFiles([first, second]);

    expect(result.fileName).toBe("2 materiali uniti");
    expect(result.text).toContain("MATERIALE 1: prima.txt");
    expect(result.text).toContain("MATERIALE 2: seconda.md");
    expect(result.sourceType).toBe("txt");
  });

  it("reads EPUB files instead of advertising unsupported import", async () => {
    const zip = new JSZip();
    zip.file("OPS/chapter1.xhtml", "<html><body><h1>Capitolo</h1><p>Storia rivoluzione guerra monarchia repubblica trattato conseguenze cause anno secolo fonti periodo. La lezione spiega eventi, contesto politico, crisi economica, fonti e cambiamenti istituzionali.</p></body></html>");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = new File([buffer], "manuale.epub", { type: "application/epub+zip" });

    const result = await readStudyFileDetailed(file);

    expect(result.sourceType).toBe("epub");
    expect(result.text).toContain("Storia rivoluzione");
  });

  it("does not fake OCR when browser OCR is unavailable", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" });

    await expect(readStudyFileDetailed(file)).rejects.toThrow(/OCR non disponibile/);
  });
});
