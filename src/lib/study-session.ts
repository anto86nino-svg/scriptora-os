import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";
import { explainProfessionalWord, extractProfessionalTerms } from "@/lib/professional-dictionary";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export type StudyDifficulty = "soft" | "medium" | "pro";

export interface DifficultWord {
  word: string;
  simple: string;
  technical: string;
  example: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface OpenStudyQuestion {
  question: string;
  answerGuide: string;
}

export interface StudySessionResult {
  title: string;
  sourceName: string;
  words: number;
  detectedSubject: string;
  difficulty: StudyDifficulty;
  lightSummary: string;
  mediumSummary: string;
  proSummary: string;
  studyNotesPro: string;
  openQuestions: OpenStudyQuestion[];
  difficultWords: DifficultWord[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  keyConcepts: string[];
}

const STOP_WORDS = new Set([
  // IT
  "che","per","con","una","uno","del","della","delle",
  "degli","alla","allo","come","non","sono","era",
  "essere","anche","dopo","prima","questo","questa",
  "quello","quella","quindi","perché","mentre","molto",
  "sempre","ancora","nulla","qualcosa","qualcuno",
  "giorno","volta","uomo","donna","casa","porta",
  "stava","disse","diceva","guardò","guardava",
  "sentì","pensò","fece","normale","normalità",

  // EN
  "the","and","that","with","from","this","have",
  "were","was","you","your","because","chapter",
  "dont","you're","youre","maybe","being","into",
  "when","what","where","which","would","could",
  "should","there","their","them","than","then",
  "just","really","very","much","still","also",
  "something","someone","nothing","everything",
  "dont","didnt","cant","couldnt","ive","im",
  "its","thats","theyre","hes","shes",

  // FR / ES

  "che","per","con","una","uno","del","della","delle","degli","alla","allo","come","non","sono","era","essere","anche","dopo","prima","questo","questa","quello","quella",
  "the","and","that","with","from","this","have","were","was","you","your",
  "les","des","que","pour","dans","une","avec","est",
  "por","para","los","las","una","uno","con",

  // parole inutili narrativa
  "aveva","quella","quello","questa","questo",
  "momento","qualsiasi","sotto","dentro","fuori",
  "normale","normalità","parte","giorno","volta",
  "uomo","donna","casa","porta","mano","occhi",
  "stava","disse","diceva","guardò","guardava",
  "sentì","pensò","fece","certo","molto","sempre",
  "ancora","mentre","nulla","qualcosa","qualcuno",

]);

export function countStudyWords(text: string): number {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

function cleanText(value: string): string {
  let text = String(value || "");

  text = text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ");

  // taglia front matter editoriale comune
  const garbagePatterns = [
    /copyright[\s\S]{0,800}/ig,
    /tutti i diritti riservati[\s\S]{0,600}/ig,
    /nessuna parte di questo libro[\s\S]{0,1200}/ig,
    /about the author[\s\S]{0,1200}/ig,
    /dedication[\s\S]{0,800}/ig,
    /how to use this book[\s\S]{0,1200}/ig,
    /table of contents[\s\S]{0,1000}/ig,
    /auth-stephen-king/ig,
  ];

  for (const pattern of garbagePatterns) {
    text = text.replace(pattern, " ");
  }

  // prova a partire dal primo capitolo vero
  const chapterMatch = text.match(
    /(chapter\s+1|capitolo\s+1|chapter one)/i
  );

  if (chapterMatch?.index && chapterMatch.index > 500) {
    text = text.slice(chapterMatch.index);
  }

  return text
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}



function detectNarrative(text: string): boolean {
  const lower = text.toLowerCase();

  const score =
    (lower.match(/chapter|capitolo/g)?.length || 0) * 2 +
    (lower.match(/[“"]/g)?.length || 0) +
    (lower.match(/disse|rispose|guardò|sussurrò|urlò/g)?.length || 0);

  return score >= 4;
}

function sentences(text: string): string[] {
  return cleanText(text)
    .replace(/\n+/g, " ")
    .match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
    ?.map((s) => s.trim())
    .filter((s) => countStudyWords(s) >= 6) || [];
}


function keywords(text: string, limit = 12): string[] {
  const clean = text.toLowerCase();

  // cattura frasi concetto tipo:
  // emotional regulation, nervous system, attachment style
  const phraseMatches =
    clean.match(/[a-z][a-z'-]{3,}\s+[a-z][a-z'-]{3,}/g) || [];

  const phraseCounts = new Map<string, number>();

  for (const phrase of phraseMatches) {
    const parts = phrase.split(" ");

    if (parts.some((p) => STOP_WORDS.has(p))) continue;
    if (phrase.length < 8) continue;

    phraseCounts.set(
      phrase,
      (phraseCounts.get(phrase) || 0) + 1
    );
  }

  const wordMatches =
    clean.match(/[\p{L}][\p{L}'’-]{4,}/gu) || [];

  const wordCounts = new Map<string, number>();

  for (const word of wordMatches) {
    const normalized = word.replace(/[’']/g, "");

    if (STOP_WORDS.has(normalized)) continue;
    if (normalized.length < 5) continue;

    wordCounts.set(
      normalized,
      (wordCounts.get(normalized) || 0) + 1
    );
  }

  const phrases = [...phraseCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(3, Math.floor(limit / 2)))
    .map(([w]) => w);

  const words = [...wordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);

  return [...new Set([...phrases, ...words])]
    .slice(0, limit);
}

function pickSentences(text: string, wanted: number): string[] {
  const all = sentences(text);
  const keys = keywords(text, 16);

  return all
    .map((sentence, index) => {
      const lower = sentence.toLowerCase();
      const score = keys.reduce((sum, key) => sum + (lower.includes(key) ? 1 : 0), 0) + Math.max(0, 6 - index * 0.08);
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, wanted)
    .map((item) => item.sentence);
}

function paragraph(title: string, lines: string[]): string {
  return [`${title}`, ...lines.map((line) => `• ${line}`)].join("\n");
}

function buildStudyNotesPro(title: string, concepts: string[], proLines: string[]): string {
  const conceptLines = concepts.length
    ? concepts.map((concept) => `• ${concept}: definiscilo, spiegalo con parole tue e collegalo al tema centrale.`)
    : ["• Individua tema centrale, causa, conseguenza e messaggio principale."];

  const memoryLines = proLines.slice(0, 10).map((line) => `• ${line}`);

  return [
    "Scheda Studio Pro",
    "",
    `Tema centrale: ${title}`,
    "",
    "1. Concetti da sapere",
    ...conceptLines,
    "",
    "2. Spiegazione approfondita",
    ...memoryLines,
    "",
    "3. Collegamenti logici",
    "• Cerca sempre il rapporto tra origine del problema, conseguenze e possibile soluzione.",
    "• Collega ogni concetto a un esempio concreto tratto dal materiale.",
    "• Distingui definizione, meccanismo e applicazione pratica.",
    "",
    "4. Cosa ricordare per una verifica/interrogazione",
    "• Non limitarti a ripetere: spiega perché il concetto è importante.",
    "• Usa parole chiave, esempi e collegamenti tra sezioni.",
    "• Prepara una risposta lunga di 1-2 minuti sul tema centrale.",
  ].join("\n");
}


function buildOpenQuestions(
  title: string,
  concepts: string[],
  narrative = false
): OpenStudyQuestion[] {

  const joined = concepts.join(" ").toLowerCase();

  const selfHelp =
    joined.includes("trauma") ||
    joined.includes("emotion") ||
    joined.includes("relationship") ||
    joined.includes("attachment") ||
    joined.includes("mindset") ||
    joined.includes("anxiety");

  if (selfHelp) {
    return [
      {
        question: "Qual è il messaggio centrale del testo e quale problema cerca di risolvere?",
        answerGuide: "Spiega il problema principale, il ragionamento dell'autore e le possibili soluzioni."
      },
      {
        question: "Quali concetti psicologici o emotivi vengono spiegati nel materiale?",
        answerGuide: "Definisci i concetti chiave e collega ogni concetto a un esempio concreto."
      },
      {
        question: "In che modo il testo suggerisce di cambiare comportamento o prospettiva?",
        answerGuide: "Descrivi il cambiamento proposto e perché potrebbe essere utile."
      }
    ];
  }

  if (narrative) {
    return [
      {
        question: "Qual è il conflitto principale della storia?",
        answerGuide: "Spiega il problema centrale e come influenza la trama."
      },
      {
        question: "Come cambia l’atmosfera del racconto?",
        answerGuide: "Analizza emozioni, tensione e ambientazione."
      },
      {
        question: "Come evolvono i personaggi principali?",
        answerGuide: "Descrivi motivazioni, paure e cambiamenti."
      }
    ];
  }

  return concepts.slice(0, 5).map((concept) => ({
    question: `Spiega il significato di "${concept}" nel testo.`,
    answerGuide: `Definisci "${concept}" e collegalo al tema centrale del materiale.`,
  }));
}

function detectSubject(text: string, sourceName: string): string {
  const keys = keywords(text, 5);
  const base = sourceName.replace(/\.(txt|md|markdown|docx)$/i, "").replace(/[_-]+/g, " ").trim();
  if (base && base.length > 3) return base;
  return keys.length ? keys.map((k) => k[0].toUpperCase() + k.slice(1)).join(", ") : "Materiale di studio";
}

function explainWord(word: string): DifficultWord {
  const entry = explainProfessionalWord(word);
  return {
    word: entry.word,
    simple: entry.simple,
    technical: entry.technical,
    example: entry.example,
  };
}

export function analyzeStudyMaterial(text: string, sourceName = "materiale-studio.txt"): StudySessionResult {
  const clean = cleanText(text);
  const narrativeMode = detectNarrative(clean);
  const words = countStudyWords(clean);
  const title = detectSubject(clean, sourceName);
  const keyConcepts = keywords(
    clean,
    narrativeMode ? 6 : 10
  ).map((k) => k[0].toUpperCase() + k.slice(1));

  const light = pickSentences(clean, 8);
  const medium = pickSentences(clean, 16);
  const pro = pickSentences(clean, 28);

  const professionalTerms = extractProfessionalTerms(clean, 10);
  const difficultWords = (professionalTerms.length ? professionalTerms : keywords(clean, 8).filter((word) => word.length >= 7))
    .slice(0, 10)
    .map(explainWord);

  const flashcards = keyConcepts.slice(0, 8).map((concept) => ({
    front: `Che cosa significa "${concept}" nel testo?`,
    back: `È uno dei concetti chiave del materiale. Spiegalo con parole semplici e collegalo all'argomento principale: ${title}.`,
  }));

  const quiz = keyConcepts.slice(0, 10).map((concept, index) => ({
    question: `Quale affermazione descrive meglio il ruolo di "${concept}" nel materiale studiato?`,
    options: [
      "È un dettaglio secondario da memorizzare senza collegamenti",
      "È un concetto chiave da definire, spiegare e collegare al tema centrale",
      "È una parola da saltare se non compare nel titolo",
      "È utile solo se viene chiesto in modo identico nel test",
    ],
    answer: 1,
    explanation: `La risposta corretta è collegare "${concept}" al tema centrale. In un'interrogazione non basta ricordare: bisogna spiegare, collegare e applicare.`,
  }));

  return {
    title,
    sourceName,
    words,
    detectedSubject: keyConcepts.slice(0, 4).join(" · ") || title,
    difficulty: words > 4500 ? "pro" : words > 1500 ? "medium" : "soft",
    lightSummary: paragraph("Riassunto leggero", light.length ? light : ["Il testo è breve: parti dai concetti principali e riscrivili con parole tue."]),
    mediumSummary: paragraph("Riassunto medio", medium.length ? medium : light),
    proSummary: paragraph("Riassunto Pro", pro.length ? pro : medium),
    difficultWords,
    flashcards,
    openQuestions: buildOpenQuestions(title, keyConcepts, narrativeMode),
    quiz,
    keyConcepts,
  };
}

async function readDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("text");
  if (!xml) throw new Error("DOCX non leggibile.");

  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const paragraphs = Array.from(doc.getElementsByTagName("w:p")).map((paragraph) =>
    Array.from(paragraph.getElementsByTagName("w:t"))
      .map((node) => node.textContent || "")
      .join("")
  );

  return paragraphs.map((p) => p.trim()).filter(Boolean).join("\n\n");
}


async function readPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;

    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();

      const text = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text) pages.push(text);
    }

    const fullText = pages.join("\n\n").trim();

    if (!fullText) {
      throw new Error(
        "Questo PDF sembra una scansione o non contiene testo selezionabile."
      );
    }

    return fullText;
  } catch (error) {
    console.error("[StudySession PDF]", error);

    throw new Error(
      error instanceof Error
        ? error.message
        : "Impossibile leggere il PDF."
    );
  }
}

export async function readStudyFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".docx")) return readDocx(file);
  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) return file.text();

  if (name.endsWith(".pdf")) return readPdf(file);

  throw new Error("Formato non supportato. Usa TXT, MD, Markdown o DOCX.");
}
