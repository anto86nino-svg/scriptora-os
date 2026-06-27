import JSZip from "jszip";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyzeStudyMaterial,
  classifyStudyMaterial,
  getStudyImportCapabilities,
  readImageWithSmartOcr,
  readStudyFileDetailed,
  readStudyFiles,
  sanitizeStudyOutput,
  sanitizeStudyQuizQuestions,
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

  it("classifies English self-help books as growth psychology instead of mathematics", () => {
    const text = studyText(
      "Let Them Be",
      "Mel Robbins explains the Let Them Be theory through emotional boundaries, relationships, anxiety, mindset, control, confidence, habits, healing and personal growth. The chapter is motivational literature and practical psychology, not formulas or equations.",
    );

    const classification = classifyStudyMaterial(text, "Let Them Be.epub");

    expect(classification.type).toBe("personal-growth");
    expect(classification.subjectLabel).toBe("Crescita personale / Psicologia pratica / Letteratura motivazionale");
    expect(classification.type).not.toBe("math");
    expect(classification.label).not.toBe("Matematica");
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

  it("builds a single-pass learning package, contextual dictionary and cognitive quiz levels", () => {
    const result = analyzeStudyMaterial(studyText(
      "Biologia",
      "La cellula contiene membrana, nucleo, mitocondrio, DNA, proteine, enzimi e metabolismo. La mitosi consente la divisione cellulare, mentre la meiosi produce cellule sessuali con combinazioni genetiche diverse.",
    ), "biologia-cellula.txt", { studySubject: "biology", studyGoal: "exam_prep", difficultyLevel: 5 });

    expect(result.learningPackage?.summaryUltraBrief).toBeTruthy();
    expect(result.learningPackage?.summaryStandard).toBeTruthy();
    expect(result.learningPackage?.summaryDeep).toBeTruthy();
    expect(result.learningPackage?.commonMistakes.length).toBeGreaterThan(0);
    expect(result.learningPackage?.examQuestions.length).toBeGreaterThan(0);
    expect(result.difficultWords.some((item) => item.school && item.advanced && item.commonMistake)).toBe(true);
    expect(result.difficultWords.some((item) => item.connections && item.connections.length > 0)).toBe(true);
    expect(new Set(result.quiz.map((item) => item.learningLevel)).has("professor")).toBe(true);
    expect(result.knowledgeMap?.length).toBeGreaterThan(0);
    expect(result.adaptiveCoach?.estimatedPassProbability).toBeGreaterThan(0);
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

  it("respects manual narrative material type even with legal keywords", () => {
    const chapter = studyText(
      "Capitolo Viola",
      "Viola firmò un contratto di proprietà con clausole rigide, ma la scena resta narrativa: dialogo, villa, tensione, mistero, Damiano e una porta chiusa che promette una rivelazione.",
    );

    const classification = classifyStudyMaterial(chapter, "capitolo.txt", {
      studyMaterialType: "narrative_manuscript",
      literaryGenre: "horror_gothic",
      studyGoal: "manuscript_analysis",
      difficultyLevel: 5,
    });

    expect(classification.contentType).toBe("narrative_fiction");
    expect(classification.subjectLabel).toBe("Horror / Gotico");
    expect(classification.type).toBe("literature");
  });

  it("respects manual law intent for true contracts", () => {
    const contract = studyText(
      "Contratto",
      "Le parti convengono ai sensi del codice civile. Clausola 1 oggetto del contratto. Clausola 2 obblighi. Clausola 3 riservatezza. Foro competente, normativa vigente, responsabilità e consenso regolano il rapporto.",
    );

    const classification = classifyStudyMaterial(contract, "contratto.pdf", {
      studyMaterialType: "legal_document",
      studySubject: "law",
      studyGoal: "exam_prep",
      difficultyLevel: 4,
    });

    expect(classification.contentType).toBe("legal_document");
    expect(classification.subjectLabel).toBe("Diritto");
    expect(classification.type).toBe("law");
  });

  it("treats long pasted material as ready instead of short text", () => {
    const text = Array.from({ length: 3248 }, (_, index) => `parola${index}`).join(" ");
    const result = analyzeStudyMaterial(text, "appunti-lunghi.txt");

    expect(result.words).toBe(3248);
    expect(result.lightSummary).not.toContain("Minimo 40 parole");
  });

  it("sanitizes broken quiz questions before UI", () => {
    const quiz = sanitizeStudyQuizQuestions([
      {
        question: "Viola sent...",
        options: ["A", "B", "C", "D"],
        answer: 0,
        explanation: "Rotta",
      },
      {
        question: "Perché Viola resta nella villa nonostante il pericolo?",
        options: ["Per il conflitto narrativo", "undefined", "Per caso", "Per nessun motivo"],
        answer: 0,
        explanation: "La risposta richiede prove dal testo.",
      },
    ]);

    expect(quiz.map((item) => item.question).join(" ")).not.toMatch(/Viola sent/i);
    expect(quiz[0].question).toMatch(/\?$/);
    expect(quiz[0].options.join(" ")).not.toContain("undefined");
  });

  it("changes quiz depth between level 1 and level 5", () => {
    const text = studyText(
      "Storia",
      "La rivoluzione nasce da cause economiche, crisi politica, monarchia, guerra, conseguenze sociali, trattato e cambiamenti istituzionali.",
    );
    const easy = analyzeStudyMaterial(text, "storia.txt", { studySubject: "history", difficultyLevel: 1 });
    const hard = analyzeStudyMaterial(text, "storia.txt", { studySubject: "history", difficultyLevel: 5, studyGoal: "exam_prep" });

    expect(easy.quiz[0].question).toMatch(/Che cosa significa/i);
    expect(hard.quiz.some((item) => /conseguenza|obiezione|caso concreto|collegamento|perche/i.test(item.question))).toBe(true);
    expect(hard.quiz.filter((item) => item.difficulty === "hard").length).toBeGreaterThan(easy.quiz.filter((item) => item.difficulty === "hard").length);
  });

  it("builds rich vocabulary without duplicates for long technical material", () => {
    const text = studyText(
      "Biologia",
      "Cellula, mitocondrio, metabolismo, proteina, enzima, membrana, tessuto, organismo, diagnosi, terapia, patologia, sintomo e DNA descrivono processi biologici collegati.",
    );
    const result = analyzeStudyMaterial(text, "biologia.txt", { studySubject: "biology", difficultyLevel: 4 });
    const unique = new Set(result.difficultWords.map((item) => item.word.toLowerCase()));

    expect(result.difficultWords.length).toBeGreaterThanOrEqual(8);
    expect(result.difficultWords.length).toBeLessThanOrEqual(25);
    expect(unique.size).toBe(result.difficultWords.length);
    expect(result.difficultWords.every((item) => item.simple && item.technical && item.example && item.examQuestion)).toBe(true);
  });

  it("does not invent dates or names when they are absent", () => {
    const text = studyText(
      "Appunti",
      "Il materiale spiega un concetto generale, le sue conseguenze e alcuni esempi senza fornire date, nomi propri o formule.",
    );
    const result = analyzeStudyMaterial(text, "appunti.txt", { studySubject: "philosophy" });

    expect(result.studyNotesPro).toContain("Date: non specificato nel materiale");
    expect(result.studyNotesPro).toContain("Formule/simboli: non specificato nel materiale");
    expect(result.studyNotesPro).not.toMatch(/\b1789|Napoleone|Einstein\b/);
  });

  it("removes technical artifacts from study output", () => {
    expect(sanitizeStudyOutput("undefined\n[object Object]\nDomanda valida sul testo.")).toBe("Domanda valida sul testo.");
    expect(sanitizeStudyOutput("{\"raw\":true}")).toBe("Questa sezione non ha abbastanza informazioni nel materiale caricato.");
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


  it("reads a realistic EPUB with OPF spine in reading order", async () => {
    const zip = new JSZip();
    zip.file("META-INF/container.xml", `<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
      </container>`);
    zip.file("OPS/content.opf", `<?xml version="1.0"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
        <manifest>
          <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
          <item id="chapter2" href="chapter2.xhtml" media-type="application/xhtml+xml"/>
          <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
        </manifest>
        <spine>
          <itemref idref="chapter2"/>
          <itemref idref="chapter1"/>
        </spine>
      </package>`);
    zip.file("OPS/nav.xhtml", "<html><body><nav>Indice navigazione capitolo uno capitolo due contenuto non studiabile ripetuto molte volte.</nav></body></html>");
    zip.file("OPS/chapter1.xhtml", "<html><body><p>Primo capitolo sulla repubblica romana con senato consoli leggi istituzioni conflitti cittadini e memoria storica.</p></body></html>");
    zip.file("OPS/chapter2.xhtml", "<html><body><p>Secondo capitolo sull impero romano con Augusto province esercito amministrazione cultura potere e trasformazioni politiche.</p></body></html>");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = new File([buffer], "roma.epub", { type: "application/epub+zip" });

    const result = await readStudyFileDetailed(file);

    expect(result.sourceType).toBe("epub");
    expect(result.text).toContain("Secondo capitolo");
    expect(result.text).toContain("Primo capitolo");
    expect(result.text.indexOf("Secondo capitolo")).toBeLessThan(result.text.indexOf("Primo capitolo"));
    expect(result.text).not.toContain("Indice navigazione");
  });

  it("falls back to internal HTML files when OPF spine is missing", async () => {
    const zip = new JSZip();
    zip.file("Text/chapter-a.html", "<html><body><p>Capitolo leggibile senza spine con storia diritto economia società fonti concetti esempi e verifica.</p></body></html>");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = new File([buffer], "fallback.epub", { type: "application/epub+zip" });

    const result = await readStudyFileDetailed(file);

    expect(result.sourceType).toBe("epub");
    expect(result.text).toContain("Capitolo leggibile senza spine");
  });

  it("ignores nav toc and cover only EPUB content", async () => {
    const zip = new JSZip();
    zip.file("nav.xhtml", "<html><body><nav>Indice capitolo capitolo capitolo capitolo capitolo capitolo capitolo capitolo capitolo capitolo.</nav></body></html>");
    zip.file("toc.xhtml", "<html><body><p>Sommario pagina indice navigazione contenuto elenco sezioni capitoli titoli riferimenti link.</p></body></html>");
    zip.file("cover.xhtml", "<html><body><p>Copertina titolo autore immagine copertina frontespizio catalogo editore isbn.</p></body></html>");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = new File([buffer], "vuoto.epub", { type: "application/epub+zip" });

    await expect(readStudyFileDetailed(file)).rejects.toThrow(/non contiene testo estraibile/i);
  });

  it("keeps short EPUB chapter chunks with at least ten words", async () => {
    const zip = new JSZip();
    zip.file("OPS/chapter1.xhtml", "<html><body><p>Roma antica nasce cresce combatte governa costruisce strade leggi eserciti.</p></body></html>");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = new File([buffer], "breve.epub", { type: "application/epub+zip" });

    const result = await readStudyFileDetailed(file);

    expect(result.sourceType).toBe("epub");
    expect(result.text).toContain("Roma antica nasce");
  });



  it("cleans real XHTML head script and raw tags from EPUB chapters", async () => {
    const zip = new JSZip();
    zip.file("OPS/chapter.xhtml", `<?xml version="1.0" encoding="UTF-8"?>
      <html xml:lang="it" xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <title>Chapter 1 — Test</title>
          <link rel="stylesheet" href="css/book.css" type="text/css"/>
          <script src="js/book.js"/>
          <meta charset="UTF-8"/>
        </head>
        <body dir="ltr">
          <div>
            <h1>Chapter 1 — The Moment You Stop Chasing</h1>
            <p>You don’t need to make an announcement when you decide to stop carrying other people’s weather inside your chest.</p>
            <p>Boundaries allow love to breathe without becoming a container for what refuses to be contained.</p>
          </div>
        </body>
      </html>`);
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = new File([buffer], "real-clean.epub", { type: "application/epub+zip" });

    const result = await readStudyFileDetailed(file);

    expect(result.text).toContain("The Moment You Stop Chasing");
    expect(result.text).toContain("Boundaries allow love to breathe");
    expect(result.text).not.toContain("</title>");
    expect(result.text).not.toContain("<link");
    expect(result.text).not.toContain("<script");
    expect(result.text).not.toContain("<body");
    expect(result.text).not.toContain("book.css");
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
