import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeStudyMaterial,
  classifyStudyMaterial,
  getStudyImportCapabilities,
  readImageWithSmartOcr,
  readStudyFileDetailed,
  readStudyFiles,
} from "@/lib/study-session";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("treats gothic-romantic narrative with legal keywords as narrative fiction, not law", () => {
    const chapter = studyText(
      "Capitolo 1",
      "Viola entrò nella villa mentre la pioggia batteva sui vetri. Damiano le porse un contratto di riservatezza e lei firmò senza leggere tutte le clausole, perché il dipinto nella sala sembrava guardarla. \"Non aprire quella porta\", disse lui. La proprietà era piena di stanze chiuse, silenzi e una tensione gotica che trasformava ogni passo in una promessa narrativa.",
    );

    const classification = classifyStudyMaterial(chapter, "la-notte-in-cui-tutto-inizio.txt");

    expect(classification.contentType).toBe("narrative_fiction");
    expect(classification.subjectLabel).toBe("Narrativa / Letteratura");
    expect(classification.mode).toBe("Analisi narrativa");
    expect(classification.label).not.toBe("Diritto");
    expect(classification.type).not.toBe("law");
  });

  it("keeps true legal templates classified as law", () => {
    const contract = studyText(
      "Contratto",
      "Le parti convengono quanto segue. Ai sensi del codice civile, il sottoscritto assume obblighi di riservatezza. Clausola 1 oggetto del contratto. Clausola 2 durata. Foro competente, normativa vigente, obbligazione, articolo e comma regolano il rapporto.",
    );

    const classification = classifyStudyMaterial(contract, "contratto-riservatezza.pdf");

    expect(classification.contentType).toBe("legal_document");
    expect(classification.subjectLabel).toBe("Diritto");
    expect(classification.type).toBe("law");
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

  it("generates clean craft-aware narrative questions before generic study prompts", () => {
    const chapter = studyText(
      "Capitolo narrativo",
      "Viola resta nella villa anche se Damiano le ha fatto firmare un contratto. Il dipinto della donna velata sembra cambiare espressione ogni notte. La porta chiusa in fondo al corridoio diventa il centro del mistero, mentre la pioggia, il silenzio e la tensione tra i due personaggi rendono ogni scena più ambigua.",
    );

    const result = analyzeStudyMaterial(chapter, "capitolo-viola-damiano.txt");
    const joined = result.openQuestions.map((item) => item.question).join(" ");

    expect(result.contentType).toBe("narrative_fiction");
    expect(joined).toMatch(/Viola|Damiano|dipinto|porta chiusa|tensione/i);
    expect(result.openQuestions.length).toBeGreaterThanOrEqual(5);
    expect(result.openQuestions.every((item) => item.question.endsWith("?"))).toBe(true);
    expect(joined).not.toMatch(/Viola sent|sent…|sent\.\.\.|Cosa sente Viola\?/i);
  });
});

describe("Study OS file ingestion", () => {
  it("espone capability import con fallback OCR client-side reale", () => {
    const withoutOcr = getStudyImportCapabilities(false);
    const withOcr = getStudyImportCapabilities(true);

    expect(withoutOcr.find((item) => item.id === "epub")?.status).toBe("READY");
    expect(withoutOcr.find((item) => item.id === "image")?.status).toBe("READY");
    expect(withoutOcr.find((item) => item.id === "image")?.evidence).toContain("Tesseract.js");
    expect(withOcr.find((item) => item.id === "image")?.status).toBe("READY");
  });

  it("usa il nome del file senza estensione anche per PDF ed EPUB", () => {
    expect(analyzeStudyMaterial(studyText("Diritto", "Articolo, comma, legge e costituzione."), "diritto-costituzionale.pdf").title).toBe("diritto costituzionale");
    expect(analyzeStudyMaterial(studyText("Storia", "Guerra, rivoluzione, monarchia e conseguenze."), "rivoluzione-francese.epub").title).toBe("rivoluzione francese");
  });

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

  it("uses browser TextDetector before RESULT-style file fallback", async () => {
    const text = studyText("Pagina OCR", "Storia, rivoluzione, guerra, monarchia, conseguenze e cause sono leggibili nella foto.");
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ close: vi.fn(), width: 800, height: 600 }));
    class FakeTextDetector {
      detect() {
        return Promise.resolve([{ rawValue: text }]);
      }
    }

    const file = new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" });
    const result = await readImageWithSmartOcr(file, {
      skipPreprocess: true,
      textDetectorCtor: FakeTextDetector,
    });

    expect(result.engine).toBe("text-detector");
    expect(result.empty).toBe(false);
    expect(result.text).toContain("Pagina OCR");
  });

  it("falls back to lazy client OCR when TextDetector is unavailable", async () => {
    const text = studyText("Pagina Tesseract", "Diritto, articolo, comma, norma, sentenza e costituzione sono leggibili nella foto.");
    const file = new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" });

    const result = await readImageWithSmartOcr(file, {
      skipPreprocess: true,
      tesseractRecognize: async () => ({ text, confidence: 88 }),
    });

    expect(result.engine).toBe("tesseract");
    expect(result.confidence).toBe(88);
    expect(result.text).toContain("Pagina Tesseract");
  });

  it("accepts common images and creates a manual fallback only after OCR levels fail", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "foto.png", { type: "image/png" });

    const result = await readStudyFileDetailed(file, {
      imageOcr: {
        skipPreprocess: true,
        tesseractRecognize: async () => {
          throw new Error("OCR_EMPTY_RESULT");
        },
      },
    });

    expect(result.sourceType).toBe("image");
    expect(result.empty).toBe(true);
    expect(result.text).toBe("");
    expect(result.warnings.join(" ")).toContain("Non sono riuscito a leggere automaticamente questa immagine");
  });

  it("merges multiple OCR image pages into one editable study text", async () => {
    const first = new File([new Uint8Array([1])], "pagina-1.png", { type: "image/png" });
    const second = new File([new Uint8Array([2])], "pagina-2.png", { type: "image/png" });

    const combined = await readStudyFiles([first, second], {
      imageOcr: {
        skipPreprocess: true,
        tesseractRecognize: async (image) => {
          const file = image as File;
          return file.name.includes("1")
            ? studyText("Prima pagina", "Fisica, forza, energia, massa, velocita e accelerazione descrivono il moto.")
            : studyText("Seconda pagina", "Chimica, atomo, molecola, reazione, legame e soluzione descrivono il processo.");
        },
      },
    });

    expect(combined.sourceType).toBe("image");
    expect(combined.fileName).toBe("2 pagine acquisite");
    expect(combined.text).toContain("Pagina 1");
    expect(combined.text).toContain("Pagina 2");
    expect(combined.text).toContain("Prima pagina");
    expect(combined.text).toContain("Seconda pagina");
    expect(analyzeStudyMaterial(combined.text, combined.fileName).words).toBeGreaterThan(40);
  });

  it("accepts camera HEIC/HEIF images without reporting unsupported format", async () => {
    const heic = new File([new Uint8Array([1, 2, 3])], "pagina.heic", { type: "image/heic" });
    const heif = new File([new Uint8Array([1, 2, 3])], "pagina.heif", { type: "image/heif" });

    const combined = await readStudyFiles([heic, heif], {
      imageOcr: {
        skipPreprocess: true,
        tesseractRecognize: async () => {
          throw new Error("OCR_EMPTY_RESULT");
        },
      },
    });

    expect(combined.sourceType).toBe("image");
    expect(combined.empty).toBe(true);
    expect(combined.fileName).toBe("2 immagini acquisite");
    expect(combined.warnings.join(" ")).not.toMatch(/Formato non supportato/i);
  });
});
