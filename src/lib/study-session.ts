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
  "che","per","con","una","uno","del","della","delle","degli","alla","allo","come","non","sono","era","essere","anche","dopo","prima","questo","questa","quello","quella",
  "the","and","that","with","from","this","have","were","was","you","your",
  "les","des","que","pour","dans","une","avec","est",
  "por","para","los","las","una","uno","con",
]);

export function countStudyWords(text: string): number {
  return (text.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length;
}

function cleanText(value: string): string {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function sentences(text: string): string[] {
  return cleanText(text)
    .replace(/\n+/g, " ")
    .match(/[^.!?…]+[.!?…]+|[^.!?…]+$/g)
    ?.map((s) => s.trim())
    .filter((s) => countStudyWords(s) >= 6) || [];
}

function keywords(text: string, limit = 12): string[] {
  const words = text.toLowerCase().match(/[\p{L}][\p{L}'’-]{4,}/gu) || [];
  const counts = new Map<string, number>();

  for (const word of words) {
    const clean = word.replace(/[’']/g, "");
    if (STOP_WORDS.has(clean)) continue;
    counts.set(clean, (counts.get(clean) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
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

function buildOpenQuestions(title: string, concepts: string[]): OpenStudyQuestion[] {
  const base = concepts.slice(0, 8);
  const questions = base.length ? base : [title];

  return questions.map((concept) => ({
    question: `Spiega il ruolo di "${concept}" nel materiale e collegalo al tema principale.`,
    answerGuide: `Definisci "${concept}", spiega perché è importante, collega il concetto al tema "${title}" e aggiungi un esempio concreto.`,
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
  const words = countStudyWords(clean);
  const title = detectSubject(clean, sourceName);
  const keyConcepts = keywords(clean, 10).map((k) => k[0].toUpperCase() + k.slice(1));

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
