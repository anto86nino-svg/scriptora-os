import JSZip from "jszip";
import { explainProfessionalWord, extractProfessionalTerms } from "@/lib/professional-dictionary";

async function loadPdfJs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url,
  ).toString();
  return pdfjsLib;
}

async function readBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const withArrayBuffer = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof withArrayBuffer.arrayBuffer === "function") {
    return withArrayBuffer.arrayBuffer();
  }
  if (typeof FileReader !== "undefined") {
    return await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.readAsArrayBuffer(blob);
    });
  }
  try {
    return await new Response(blob).arrayBuffer();
  } catch {
    throw new Error("File non leggibile.");
  }
}

async function readBlobText(blob: Blob): Promise<string> {
  const withText = blob as Blob & { text?: () => Promise<string> };
  if (typeof withText.text === "function") {
    return withText.text();
  }
  try {
    return await new Response(blob).text();
  } catch {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error("File non leggibile."));
      reader.onload = () => resolve(String(reader.result || ""));
      reader.readAsText(blob);
    });
  }
}

export type StudyDifficulty = "soft" | "medium" | "pro";

export interface DifficultWord {
  word: string;
  simple: string;
  technical: string;
  example: string;
  memoryTrick?: string;
  commonMistake?: string;
}

export interface Flashcard {
  front: string;
  back: string;
  type?: "definition" | "cause-effect" | "comparison" | "true-false" | "application" | "oral";
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  memoryTrick?: string;
  commonMistake?: string;
}

export interface OpenStudyQuestion {
  question: string;
  answerGuide: string;
}

export type StudyMaterialType =
  | "history"
  | "philosophy"
  | "literature"
  | "math"
  | "physics"
  | "chemistry"
  | "medicine"
  | "law"
  | "economics"
  | "computer-science"
  | "foreign-language"
  | "scientific-article"
  | "technical-manual"
  | "mixed-notes"
  | "general";

export type StudyContentType =
  | "narrative_fiction"
  | "study_notes"
  | "textbook"
  | "essay"
  | "legal_document"
  | "mixed_or_unknown";

export type StudySummaryMode =
  | "brief"
  | "complete"
  | "university"
  | "oral"
  | "ultraSimple"
  | "quickReview"
  | "chronological"
  | "causeEffect"
  | "bulletPoints"
  | "oralExam";

export interface StudyMaterialClassification {
  type: StudyMaterialType;
  label: string;
  contentType: StudyContentType;
  subjectLabel: string;
  mode: string;
  confidence: number;
  language: string;
  difficultyScore: number;
  estimatedStudyMinutes: number;
  signals: string[];
  strategy: string[];
}

export interface StudyExercise {
  id: string;
  type: "guided" | "free" | "correction" | "application" | "reasoning";
  prompt: string;
  solution?: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface StudyConceptMapNode {
  id: string;
  label: string;
  detail: string;
  level: number;
}

export interface StudyConceptMapRelation {
  from: string;
  to: string;
  label: string;
  type: "hierarchy" | "cause-effect" | "prerequisite" | "contrast" | "example";
}

export interface StudyConceptMap {
  title: string;
  nodes: StudyConceptMapNode[];
  relations: StudyConceptMapRelation[];
  exportText: string;
}

export interface StudySessionResult {
  title: string;
  sourceName: string;
  words: number;
  contentType: StudyContentType;
  subjectLabel: string;
  studyMode: string;
  detectedSubject: string;
  difficulty: StudyDifficulty;
  classification?: StudyMaterialClassification;
  summaries?: Record<StudySummaryMode, string>;
  lightSummary: string;
  mediumSummary: string;
  proSummary: string;
  studyNotesPro: string;
  openQuestions: OpenStudyQuestion[];
  difficultWords: DifficultWord[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
  trueFalse?: QuizQuestion[];
  exercises?: StudyExercise[];
  conceptMap?: StudyConceptMap;
  keyConcepts: string[];
}

export interface StudyFileReadResult {
  fileName: string;
  sourceType: "pdf" | "docx" | "txt" | "md" | "epub" | "image";
  text: string;
  warnings: string[];
  empty: boolean;
}

export interface StudyImportCapability {
  id: StudyFileReadResult["sourceType"];
  label: string;
  status: "READY" | "FALLBACK" | "UNAVAILABLE";
  evidence: string;
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
    .split(/\n\s*\n/)
    .map((page) => page.replace(/[ \t]+/g, " ").trim())
    .filter((page) => countStudyWords(page) > 0)
    .join("\n\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim();
}

function detectStudyLanguage(text: string): string {
  const lower = text.toLowerCase();
  const hits = {
    Italian: (lower.match(/\b(il|lo|la|gli|che|della|perché|quindi|sono|questo)\b/g) || []).length,
    English: (lower.match(/\b(the|and|that|because|therefore|this|with|between)\b/g) || []).length,
    Spanish: (lower.match(/\b(el|la|los|las|que|porque|entonces|este|con)\b/g) || []).length,
    French: (lower.match(/\b(le|la|les|des|que|parce|donc|avec|dans)\b/g) || []).length,
    German: (lower.match(/\b(der|die|das|und|weil|dass|mit|nicht|eine)\b/g) || []).length,
  };
  return Object.entries(hits).sort((a, b) => b[1] - a[1])[0]?.[0] || "Italian";
}

function scorePatterns(text: string, patterns: RegExp[]): number {
  return patterns.reduce((sum, pattern) => sum + (text.match(pattern)?.length || 0), 0);
}

type StudyContentProfile = {
  contentType: StudyContentType;
  subjectLabel: string;
  mode: string;
  fictionSignalsScore: number;
  legalKeywordScore: number;
  legalDocumentScore: number;
  signals: string[];
};

function detectStudyContentProfile(text: string): StudyContentProfile {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();
  const dialogueMarks = (clean.match(/[«»“”"]/g) || []).length;
  const properNames = (clean.match(/\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\b/g) || [])
    .filter((name) => !/Capitolo|Articolo|Codice|Diritto|Legge|Studio|Storia|Filosofia|Informatica|Chimica|Economia|Appendice/.test(name));
  const legalKeywordScore = scorePatterns(lower, [
    /\b(contratto|contratti|clausola|clausole|proprietà|firmò|firmare|firma|firmato|non divulgare|riservatezza|obbligo|obbligazione|diritto|norma|legge|articolo|comma|codice|sentenza|tribunale|giurisprudenza)\b/gi,
  ]);
  const legalDocumentScore = scorePatterns(lower, [
    /\b(le parti|premesso che|il sottoscritto|la sottoscritta|ai sensi|codice civile|tribunale|sentenza n\.|art\.\s*\d+|clausola\s+\d+|normativa vigente|oggetto del contratto)\b/gi,
    /^\s*\d+[\).]\s+(oggetto|durata|corrispettivo|obblighi|riservatezza|foro competente)/gim,
  ]);
  const fictionLexicalScore = scorePatterns(lower, [
    /\b(capitolo|scena|villa|corridoio|sala|ombra|pioggia|dipinto|porta chiusa|camera|silenzio|sguardo|sussurrò|disse|rispose|guardò|sentì|pensò|tremò|paura|desiderio|pericolo|mistero|segreto|tensione|gotic|romantic|suspense)\b/gi,
    /\b(lei|lui|viola|damiano|damien)\b/gi,
  ]);
  const dialogueScore = Math.min(8, Math.floor(dialogueMarks / 2));
  const properNameScore = Math.min(8, properNames.length);
  const fictionSignalsScore = fictionLexicalScore + dialogueScore + properNameScore;
  const hasNarrativeStructure = fictionLexicalScore + dialogueScore >= 3;

  if (hasNarrativeStructure && fictionSignalsScore > legalKeywordScore && fictionSignalsScore >= 5) {
    return {
      contentType: "narrative_fiction",
      subjectLabel: "Narrativa / Letteratura",
      mode: "Analisi narrativa",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: [
        `Narrativa: ${fictionSignalsScore} segnali`,
        legalKeywordScore ? `Keyword legali isolate: ${legalKeywordScore}` : "Nessuna keyword legale dominante",
      ],
    };
  }

  if (legalKeywordScore >= 4 && legalDocumentScore >= 2 && legalKeywordScore >= fictionSignalsScore) {
    return {
      contentType: "legal_document",
      subjectLabel: "Diritto",
      mode: "Analisi giuridica",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: [`Documento legale: ${legalDocumentScore} segnali strutturali`, `Diritto: ${legalKeywordScore} keyword`],
    };
  }

  if (/^[-•*]\s+/m.test(clean) || /\b(appunti|lezione|slide|dispensa|riassunto)\b/i.test(clean)) {
    return {
      contentType: "study_notes",
      subjectLabel: "Appunti di studio",
      mode: "Studio guidato",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: ["Struttura da appunti/materiale didattico"],
    };
  }

  if (/\b(manuale|capitolo|paragrafo|unità|esercizi|definizione|concetti chiave)\b/i.test(clean) && fictionSignalsScore < 5) {
    return {
      contentType: "textbook",
      subjectLabel: "Manuale / Libro di testo",
      mode: "Studio guidato",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: ["Struttura da libro di testo/manuale"],
    };
  }

  if (/\b(tesi|argomento|introduzione|conclusione|saggio|analisi critica)\b/i.test(clean)) {
    return {
      contentType: "essay",
      subjectLabel: "Saggio / Elaborato",
      mode: "Analisi argomentativa",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: ["Struttura argomentativa/saggistica"],
    };
  }

  return {
    contentType: "mixed_or_unknown",
    subjectLabel: "Materiale generale",
    mode: "Studio guidato",
    fictionSignalsScore,
    legalKeywordScore,
    legalDocumentScore,
    signals: ["Tipo contenuto non dominante"],
  };
}

const MATERIAL_DEFS: Array<{
  type: StudyMaterialType;
  label: string;
  patterns: RegExp[];
  strategy: string[];
}> = [
  {
    type: "history",
    label: "Storia",
    patterns: [/\b(secolo|guerra|rivoluzione|impero|periodo|anno|date|fonti|cause|conseguenze|trattato|monarchia|repubblica)\b/gi, /\b\d{3,4}\b/g],
    strategy: ["timeline", "cause e conseguenze", "personaggi/eventi", "date importanti"],
  },
  {
    type: "philosophy",
    label: "Filosofia",
    patterns: [/\b(filosofo|tesi|argomento|dialettica|etica|metafisica|epistemologia|kant|platone|aristotele|hegel|nietzsche)\b/gi],
    strategy: ["concetti", "autori", "tesi", "argomentazioni e confronti"],
  },
  {
    type: "literature",
    label: "Letteratura",
    patterns: [/\b(romanzo|poesia|autore|narratore|stile|metafora|similitudine|tema|contesto|figure retoriche|analisi del testo)\b/gi],
    strategy: ["tema", "stile", "contesto", "figure retoriche", "analisi del testo"],
  },
  {
    type: "math",
    label: "Matematica",
    patterns: [/\b(teorema|equazione|funzione|derivata|integrale|matrice|geometria|algebra|probabilità|dimostrazione)\b/gi, /[=<>±√∑∫π]/g],
    strategy: ["formule", "passaggi", "esercizi", "esempi guidati"],
  },
  {
    type: "physics",
    label: "Fisica",
    patterns: [/\b(forza|energia|massa|velocità|accelerazione|campo|onda|corrente|tensione|newton|joule|quantistica)\b/gi],
    strategy: ["formule", "leggi", "causa-effetto", "applicazioni numeriche"],
  },
  {
    type: "chemistry",
    label: "Chimica",
    patterns: [/\b(molecola|atomo|reazione|legame|acido|base|ossidazione|riduzione|soluzione|ph|tavola periodica)\b/gi, /\b[A-Z][a-z]?\d*\b/g],
    strategy: ["definizioni", "reazioni", "processi", "applicazioni"],
  },
  {
    type: "medicine",
    label: "Medicina/Biologia",
    patterns: [/\b(cellula|tessuto|organo|apparato|diagnosi|terapia|patologia|sintomo|enzima|dna|proteina|metabolismo)\b/gi],
    strategy: ["processi", "apparati", "meccanismi", "termini tecnici"],
  },
  {
    type: "law",
    label: "Diritto",
    patterns: [/\b(articolo|comma|codice|norma|legge|diritto|obbligazione|contratto|reato|sentenza|giurisprudenza|costituzione)\b/gi],
    strategy: ["norme", "principi", "casi", "definizioni operative"],
  },
  {
    type: "economics",
    label: "Economia",
    patterns: [/\b(mercato|domanda|offerta|inflazione|pil|costo|ricavo|profitto|bilancio|capitale|moneta|prezzo)\b/gi],
    strategy: ["concetti", "modelli", "grafici mentali", "casi applicativi"],
  },
  {
    type: "computer-science",
    label: "Informatica",
    patterns: [/\b(algoritmo|software|hardware|database|rete|api|codice|funzione|variabile|classe|server|protocollo)\b/gi, /```|[{};<>]/g],
    strategy: ["definizioni", "flussi", "esempi guidati", "debug concettuale"],
  },
  {
    type: "foreign-language",
    label: "Lingua straniera",
    patterns: [/\b(grammar|vocabulary|pronunciation|verb|tense|translation|listening|reading|speaking|writing)\b/gi],
    strategy: ["vocabolario", "regole", "frasi modello", "produzione attiva"],
  },
  {
    type: "scientific-article",
    label: "Articolo scientifico",
    patterns: [/\b(abstract|method|methods|results|discussion|conclusion|doi|peer reviewed|campione|studio|risultati)\b/gi],
    strategy: ["domanda di ricerca", "metodo", "risultati", "limiti"],
  },
  {
    type: "technical-manual",
    label: "Manuale tecnico",
    patterns: [/\b(procedura|installazione|configurazione|passaggio|step|manuale|requisiti|errore|parametro)\b/gi],
    strategy: ["procedura", "prerequisiti", "errori comuni", "applicazioni"],
  },
  {
    type: "mixed-notes",
    label: "Appunti misti",
    patterns: [/^[-•*]\s+/gm, /\b(appunti|nota|prof|slide|lezione|ricordare|importante)\b/gi],
    strategy: ["riordino", "gerarchia", "concetti mancanti", "domande probabili"],
  },
];

export function classifyStudyMaterial(text: string, sourceName = ""): StudyMaterialClassification {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();
  const words = countStudyWords(clean);
  const profile = detectStudyContentProfile(clean || sourceName);
  const scored = MATERIAL_DEFS.map((def) => {
    const score = scorePatterns(lower, def.patterns);
    return { ...def, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  const override = profile.contentType === "narrative_fiction"
    ? { type: "literature" as StudyMaterialType, label: "Narrativa / Letteratura", strategy: ["personaggi", "ambientazione", "conflitto", "temi", "stile", "tensione narrativa"] }
    : profile.contentType === "legal_document"
      ? { type: "law" as StudyMaterialType, label: "Diritto", strategy: ["norme", "clausole", "obblighi", "definizioni operative"] }
      : null;
  const type = override?.type || (top && top.score > 0 ? top.type : "general");
  const label = override?.label || (top && top.score > 0 ? top.label : "Materiale generale");
  const longSentences = sentences(clean).filter((s) => countStudyWords(s) > 28).length;
  const formulaSignals = scorePatterns(clean, [/[=<>±√∑∫π]/g]);
  const difficultyScore = Math.max(
    1,
    Math.min(10, Math.round((words > 4500 ? 3 : words > 1800 ? 2 : 1) + longSentences * 0.08 + formulaSignals * 0.2 + (top?.score || 0) * 0.12)),
  );
  const estimatedStudyMinutes = Math.max(8, Math.round(words / 160 + difficultyScore * 3));
  const confidence = top?.score
    ? Math.max(45, Math.min(98, Math.round(55 + top.score * 6 - (second?.score || 0) * 2)))
    : 40;

  return {
    type,
    label,
    contentType: profile.contentType,
    subjectLabel: profile.subjectLabel === "Materiale generale" ? label : profile.subjectLabel,
    mode: profile.mode,
    confidence,
    language: detectStudyLanguage(clean || sourceName),
    difficultyScore,
    estimatedStudyMinutes,
    signals: [...profile.signals, ...(top?.score ? [`${top.label}: ${top.score} segnali`] : ["Classificazione generica"])].concat(
      second?.score ? [`Alternativa: ${second.label}`] : [],
    ),
    strategy: override?.strategy || (top?.score ? top.strategy : ["concetti chiave", "riassunto progressivo", "quiz di comprensione"]),
  };
}



function detectNarrative(text: string): boolean {
  return detectStudyContentProfile(text).contentType === "narrative_fiction";
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
  narrative = false,
  sourceText = ""
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
    return buildNarrativeOpenQuestions(sourceText, title);
  }

  return concepts.slice(0, 5).map((concept) => ({
    question: `Spiega il significato di "${concept}" nel testo.`,
    answerGuide: `Definisci "${concept}" e collegalo al tema centrale del materiale.`,
  }));
}

function hasWords(text: string, words: string[]): boolean {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function isValidStudyQuestion(question: string, seen = new Set<string>()): boolean {
  const clean = question.replace(/\s+/g, " ").trim();
  const key = clean.toLowerCase();
  if (!clean.endsWith("?")) return false;
  if (countStudyWords(clean) < 6) return false;
  if (seen.has(key)) return false;
  if (/[.…]{2,}\??$/.test(clean) || /\b(sent|sentì|guard|pens|volt)\s*[.…]/i.test(clean)) return false;
  if (/^(cosa sente|cosa vede|chi è|dove va)\s+[^?]*\?$/i.test(clean)) return false;
  return true;
}

export function sanitizeStudyOpenQuestions(items: OpenStudyQuestion[], fallback: OpenStudyQuestion[]): OpenStudyQuestion[] {
  const seen = new Set<string>();
  const clean = items
    .map((item) => ({
      question: String(item.question || "").replace(/\s+/g, " ").trim(),
      answerGuide: String(item.answerGuide || "").trim() || "Rispondi con prove dal testo e collega la risposta al capitolo.",
    }))
    .filter((item) => {
      const ok = isValidStudyQuestion(item.question, seen);
      if (ok) seen.add(item.question.toLowerCase());
      return ok;
    });
  return clean.length >= 3 ? clean.slice(0, 10) : fallback;
}

function buildNarrativeOpenQuestions(text: string, title: string): OpenStudyQuestion[] {
  const hasViola = hasWords(text, ["Viola"]);
  const hasDamiano = hasWords(text, ["Damiano", "Damien"]);
  const hasDipinto = hasWords(text, ["dipinto", "quadro", "ritratto"]);
  const hasVilla = hasWords(text, ["villa", "casa", "proprietà"]);
  const hasDoor = hasWords(text, ["porta chiusa", "porta", "stanza chiusa"]);
  const pair = hasViola && hasDamiano ? "Viola e Damiano" : "i personaggi principali";

  return [
    {
      question: hasViola
        ? "Perché Viola accetta di restare nella villa nonostante percepisca il pericolo?"
        : `Perché il personaggio centrale continua ad avanzare dentro il conflitto di "${title}"?`,
      answerGuide: "Analizza desiderio, paura, bisogno emotivo e pressione della scena usando prove testuali.",
    },
    {
      question: `Che tipo di potere si crea tra ${pair}: seduzione, controllo, dipendenza o ambiguità?`,
      answerGuide: "Descrivi la dinamica emotiva, chi conduce la scena e quali dettagli cambiano l'equilibrio.",
    },
    {
      question: hasDipinto
        ? "In che modo il dipinto riflette il trauma interiore o il mistero del capitolo?"
        : "Quale oggetto, immagine o dettaglio simbolico concentra il mistero del capitolo?",
      answerGuide: "Collega simbolo, atmosfera e promessa narrativa senza ridurli a semplice decorazione.",
    },
    {
      question: hasDoor
        ? "Quale funzione narrativa ha la porta chiusa?"
        : "Quale elemento nascosto crea una promessa narrativa per il capitolo successivo?",
      answerGuide: "Spiega se apre mistero, minaccia, desiderio, segreto familiare o tensione psicologica.",
    },
    {
      question: hasVilla
        ? "Quali dettagli costruiscono l'atmosfera gotica della villa?"
        : "Quali dettagli costruiscono l'atmosfera dominante della scena?",
      answerGuide: "Individua ambiente, luce, suoni, ritmo delle frasi e reazioni dei personaggi.",
    },
    {
      question: "Dove il capitolo aumenta davvero la tensione e dove invece rischia di ripeterla?",
      answerGuide: "Distingui beat nuovi, escalation, ripetizioni emotive e scene che cambiano davvero la situazione.",
    },
    {
      question: "Quale promessa narrativa apre il finale del capitolo?",
      answerGuide: "Spiega quale domanda resta aperta e perché dovrebbe spingere il lettore a continuare.",
    },
  ];
}

function buildNarrativeQuiz(text: string, title: string): QuizQuestion[] {
  const hasDipinto = hasWords(text, ["dipinto", "quadro", "ritratto"]);
  const hasVilla = hasWords(text, ["villa", "proprietà"]);
  const hasDoor = hasWords(text, ["porta chiusa", "porta"]);
  return [
    {
      question: `Qual è la domanda narrativa più importante aperta da "${title}"?`,
      options: [
        "Capire soltanto dove si trova il personaggio",
        "Scoprire quale desiderio o segreto rende pericolosa la permanenza nella scena",
        "Memorizzare tutte le descrizioni dell'ambiente",
        "Stabilire se il testo contiene parole giuridiche",
      ],
      answer: 1,
      explanation: "In narrativa conta la promessa: desiderio, segreto, rischio e conseguenza tengono aperta la lettura.",
      difficulty: "medium",
    },
    {
      question: hasVilla ? "Che funzione ha la villa nell'atmosfera gotica del capitolo?" : "Che funzione ha l'ambientazione nella tensione del capitolo?",
      options: [
        "È solo uno sfondo neutro",
        "Agisce come pressione emotiva e moltiplica mistero, controllo e isolamento",
        "Serve solo a indicare il luogo geografico",
        "Trasforma il capitolo in un documento legale",
      ],
      answer: 1,
      explanation: "L'ambientazione gotica non è neutra: modifica percezione, ritmo e pericolo.",
      difficulty: "medium",
    },
    {
      question: hasDipinto ? "Perché il dipinto può essere letto come simbolo narrativo?" : "Perché un dettaglio visivo può diventare simbolo narrativo?",
      options: [
        "Perché interrompe la scena senza conseguenze",
        "Perché concentra memoria, trauma, mistero o desiderio in un'immagine concreta",
        "Perché rende il testo più lungo",
        "Perché sostituisce ogni conflitto tra personaggi",
      ],
      answer: 1,
      explanation: "Un simbolo funziona quando porta sottotesto e promessa, non solo decorazione.",
      difficulty: "hard",
    },
    {
      question: hasDoor ? "Quale effetto produce la porta chiusa sul lettore?" : "Quale effetto produce un segreto non ancora rivelato sul lettore?",
      options: [
        "Chiude ogni domanda narrativa",
        "Crea una soglia: qualcosa è nascosto e va scoperto",
        "Rende inutile il conflitto emotivo",
        "Serve solo a descrivere l'arredamento",
      ],
      answer: 1,
      explanation: "La soglia o il segreto rinviano a una rivelazione futura e alimentano tensione.",
      difficulty: "medium",
    },
    {
      question: "Quale risposta dimostra una vera comprensione narrativa del capitolo?",
      options: [
        "Elencare parole isolate senza collegarle",
        "Spiegare motivazioni, conflitto, atmosfera e promessa aperta",
        "Contare solo quante volte appare un personaggio",
        "Classificare il testo in base a una singola keyword",
      ],
      answer: 1,
      explanation: "La comprensione narrativa collega personaggi, scena, sottotesto e progressione.",
      difficulty: "easy",
    },
  ];
}

function formatLines(title: string, lines: string[]): string {
  return [title, ...lines.map((line) => `• ${line}`)].join("\n");
}

function buildChronology(lines: string[], classification: StudyMaterialClassification): string {
  const chronological = lines
    .filter((line) => /\b(prima|poi|dopo|successivamente|infine|inizialmente|\d{3,4})\b/i.test(line))
    .slice(0, 10);
  const source = chronological.length ? chronological : lines.slice(0, 8);
  const title = classification.type === "history" ? "Riassunto cronologico / timeline" : "Sequenza logica del materiale";
  return formatLines(title, source.map((line, index) => `${index + 1}. ${line}`));
}

function buildCauseEffect(lines: string[], classification: StudyMaterialClassification): string {
  const causeLines = lines
    .filter((line) => /\b(perché|causa|conseguenza|quindi|provoca|porta a|effetto|risultato|dunque)\b/i.test(line))
    .slice(0, 10);
  const source = causeLines.length ? causeLines : lines.slice(0, 8);
  return [
    classification.type === "history" ? "Cause → Eventi → Conseguenze" : "Catena causa-effetto",
    ...source.map((line) => `• ${line.replace(/\s+/g, " ")}`),
  ].join("\n");
}

function simplifyLine(line: string): string {
  const clean = line.replace(/\s+/g, " ").trim();
  const words = clean.split(/\s+/);
  if (words.length <= 18) return clean;
  return `${words.slice(0, 18).join(" ")}.`;
}

function buildSummaries(
  title: string,
  clean: string,
  classification: StudyMaterialClassification,
): Record<StudySummaryMode, string> {
  const light = pickSentences(clean, 8);
  const medium = pickSentences(clean, 16);
  const pro = pickSentences(clean, 28);
  const concepts = keywords(clean, 12).map((k) => k[0].toUpperCase() + k.slice(1));
  const strategyLine = `Strategia: ${classification.strategy.join(" · ")}.`;

  return {
    brief: formatLines("Riassunto breve", light.slice(0, 6)),
    complete: formatLines("Riassunto completo", medium.length ? medium : light),
    university: [
      "Riassunto universitario",
      `Tesi/tema centrale: ${title}.`,
      strategyLine,
      ...pro.slice(0, 18).map((line) => `• ${line}`),
      "• Per un esame: collega definizioni, esempi e implicazioni invece di ripetere frasi isolate.",
    ].join("\n"),
    oral: [
      "Riassunto per interrogazione",
      `Apertura: il materiale parla di ${title}.`,
      ...medium.slice(0, 10).map((line) => `• Spiega: ${line}`),
      "• Chiudi sempre con un esempio o una conseguenza.",
    ].join("\n"),
    ultraSimple: formatLines("Riassunto ultra semplice", (light.length ? light : medium).slice(0, 8).map(simplifyLine)),
    quickReview: [
      "Ripasso veloce",
      ...concepts.slice(0, 8).map((concept) => `• ${concept}: definizione + esempio + collegamento.`),
      "• Se hai 5 minuti: ripeti a voce i primi 5 concetti senza guardare.",
    ].join("\n"),
    chronological: buildChronology([...light, ...medium], classification),
    causeEffect: buildCauseEffect([...medium, ...pro], classification),
    bulletPoints: formatLines("Riassunto a punti", [...concepts.slice(0, 8), ...light.slice(0, 6)]),
    oralExam: [
      "Riassunto per esame orale",
      `1. Presenta l'argomento: ${title}.`,
      `2. Metodo di risposta consigliato: ${classification.strategy.join(", ")}.`,
      ...pro.slice(0, 12).map((line, index) => `${index + 3}. ${line}`),
      "Conclusione: collega almeno due concetti e prepara un esempio concreto.",
    ].join("\n"),
  };
}

function relationLabelFor(classification: StudyMaterialClassification, index: number): StudyConceptMapRelation["type"] {
  if (classification.type === "history" || classification.type === "physics" || classification.type === "chemistry" || classification.type === "medicine") {
    return index % 2 === 0 ? "cause-effect" : "prerequisite";
  }
  if (classification.type === "philosophy" || classification.type === "law") return index % 2 === 0 ? "contrast" : "hierarchy";
  return index % 3 === 0 ? "example" : "hierarchy";
}

function buildConceptMap(title: string, concepts: string[], proLines: string[], classification: StudyMaterialClassification): StudyConceptMap {
  const safeConcepts = concepts.length ? concepts.slice(0, 9) : [title];
  const nodes: StudyConceptMapNode[] = [
    { id: "root", label: title, detail: classification.label, level: 0 },
    ...safeConcepts.map((concept, index) => ({
      id: `concept-${index}`,
      label: concept,
      detail: proLines[index] || `Concetto da collegare a ${title}.`,
      level: index < 3 ? 1 : 2,
    })),
  ];

  const relations: StudyConceptMapRelation[] = safeConcepts.map((_, index) => ({
    from: index < 3 ? "root" : `concept-${Math.max(0, index - 3)}`,
    to: `concept-${index}`,
    label: index < 3 ? "include" : index % 2 === 0 ? "dipende da" : "si collega a",
    type: relationLabelFor(classification, index),
  }));

  const exportText = [
    `MAPPA CONCETTUALE — ${title}`,
    "",
    ...nodes.map((node) => `${"  ".repeat(node.level)}- ${node.label}: ${node.detail}`),
    "",
    "Relazioni",
    ...relations.map((rel) => `- ${nodes.find((n) => n.id === rel.from)?.label || rel.from} -> ${nodes.find((n) => n.id === rel.to)?.label || rel.to}: ${rel.label} (${rel.type})`),
  ].join("\n");

  return { title, nodes, relations, exportText };
}

function buildExercises(concepts: string[], classification: StudyMaterialClassification): StudyExercise[] {
  const primary = concepts.slice(0, 6);
  const base = primary.length ? primary : [classification.label];
  return [
    {
      id: "guided-1",
      type: "guided",
      prompt: `Spiega ${base[0]} seguendo: definizione → perché è importante → esempio.`,
      solution: `Una risposta forte definisce ${base[0]}, lo collega a ${classification.label} e chiude con un esempio concreto.`,
      explanation: "Esercizio guidato per costruire una risposta da interrogazione.",
      difficulty: "easy",
    },
    {
      id: "application-1",
      type: "application",
      prompt: `Applica ${base[1] || base[0]} a un caso reale o a un esempio inventato coerente col materiale.`,
      solution: "L'esempio deve usare solo concetti presenti nel materiale e mostrare causa, effetto o conseguenza.",
      explanation: "Verifica se sai usare il concetto, non solo ripeterlo.",
      difficulty: "medium",
    },
    {
      id: "reasoning-1",
      type: "reasoning",
      prompt: `Confronta ${base[0]} con ${base[2] || base[1] || "un secondo concetto"}: cosa hanno in comune e cosa cambia?`,
      solution: "Risposta attesa: almeno una somiglianza, una differenza e un collegamento al tema centrale.",
      explanation: "Allena il ragionamento comparativo.",
      difficulty: "hard",
    },
    {
      id: "free-1",
      type: "free",
      prompt: `Scrivi una risposta libera di 8-10 righe sul tema centrale: ${classification.label}.`,
      explanation: "Usa questa traccia per simulare una domanda aperta da verifica.",
      difficulty: "medium",
    },
  ];
}

function buildTrueFalseQuiz(concepts: string[]): QuizQuestion[] {
  return concepts.slice(0, 6).map((concept, index) => ({
    question: `Vero o falso: "${concept}" è un concetto da collegare al tema centrale del materiale.`,
    options: ["Vero", "Falso", "Non determinabile", "Solo se appare nel titolo"],
    answer: 0,
    explanation: `"${concept}" è stato rilevato tra i concetti chiave; va definito e collegato, non memorizzato isolatamente.`,
    difficulty: index < 2 ? "easy" : "medium",
    memoryTrick: "Vero se puoi collegarlo al tema centrale con un esempio.",
    commonMistake: "Trattare il concetto come parola da imparare a memoria senza contesto.",
  }));
}

export function getStudyImportCapabilities(ocrAvailable = typeof (globalThis as any).TextDetector === "function"): StudyImportCapability[] {
  return [
    { id: "pdf", label: "PDF", status: "READY", evidence: "pdfjs legge PDF con testo selezionabile." },
    { id: "docx", label: "DOCX", status: "READY", evidence: "JSZip estrae word/document.xml." },
    { id: "txt", label: "TXT", status: "READY", evidence: "Lettura testuale nativa." },
    { id: "md", label: "MD", status: "READY", evidence: "Markdown trattato come testo strutturato." },
    { id: "epub", label: "EPUB", status: "READY", evidence: "JSZip estrae capitoli HTML/XHTML reali." },
    {
      id: "image",
      label: "Immagini/OCR",
      status: ocrAvailable ? "READY" : "UNAVAILABLE",
      evidence: ocrAvailable
        ? "Browser TextDetector disponibile: OCR reale attivabile."
        : "TextDetector non disponibile: Scriptora non simula OCR.",
    },
  ];
}

function detectSubject(text: string, sourceName: string): string {
  const keys = keywords(text, 5);
  const base = sourceName.replace(/\.(txt|md|markdown|docx|pdf|epub)$/i, "").replace(/[_-]+/g, " ").trim();
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
  const classification = classifyStudyMaterial(clean, sourceName);
  const narrativeMode = classification.contentType === "narrative_fiction" || detectNarrative(clean);
  const words = countStudyWords(clean);
  const title = detectSubject(clean, sourceName);
  const keyConcepts = keywords(
    clean,
    narrativeMode ? 6 : 10
  ).map((k) => k[0].toUpperCase() + k.slice(1));

  const light = pickSentences(clean, 8);
  const medium = pickSentences(clean, 16);
  const pro = pickSentences(clean, 28);
  const summaries = buildSummaries(title, clean, classification);

  const professionalTerms = extractProfessionalTerms(clean, 10);
  const difficultWords = (professionalTerms.length ? professionalTerms : keywords(clean, 8).filter((word) => word.length >= 7))
    .slice(0, 10)
    .map(explainWord);

  const flashcards = keyConcepts.slice(0, 8).map((concept) => ({
    front: `Che cosa significa "${concept}" nel testo?`,
    back: `È uno dei concetti chiave del materiale. Spiegalo con parole semplici e collegalo all'argomento principale: ${title}.`,
  }));

  const quiz = narrativeMode ? buildNarrativeQuiz(clean, title) : keyConcepts.slice(0, 10).map((concept, index) => ({
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
  const fallbackOpenQuestions = buildOpenQuestions(title, keyConcepts, narrativeMode, clean);

  return {
    title,
    sourceName,
    words,
    contentType: classification.contentType,
    subjectLabel: classification.subjectLabel,
    studyMode: classification.mode,
    detectedSubject: classification.subjectLabel || classification.label || keyConcepts.slice(0, 4).join(" · ") || title,
    difficulty: classification.difficultyScore >= 8 || words > 4500 ? "pro" : classification.difficultyScore >= 5 || words > 1500 ? "medium" : "soft",
    classification,
    summaries,
    lightSummary: summaries.brief || paragraph("Riassunto leggero", light.length ? light : ["Il testo è breve: parti dai concetti principali e riscrivili con parole tue."]),
    mediumSummary: summaries.complete || paragraph("Riassunto medio", medium.length ? medium : light),
    proSummary: summaries.university || paragraph("Riassunto Pro", pro.length ? pro : medium),
    studyNotesPro: buildStudyNotesPro(title, keyConcepts, pro.length ? pro : medium),
    difficultWords,
    flashcards,
    openQuestions: sanitizeStudyOpenQuestions(fallbackOpenQuestions, fallbackOpenQuestions),
    quiz,
    trueFalse: buildTrueFalseQuiz(keyConcepts),
    exercises: buildExercises(keyConcepts, classification),
    conceptMap: buildConceptMap(title, keyConcepts, pro.length ? pro : medium, classification),
    keyConcepts,
  };
}

async function readDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await readBlobArrayBuffer(file));
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

async function readEpub(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await readBlobArrayBuffer(file));
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && /\.(xhtml|html|htm|xml)$/i.test(entry.name) && !/container\.xml|opf$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!entries.length) throw new Error("EPUB non leggibile: capitoli HTML non trovati.");

  const chunks: string[] = [];
  for (const entry of entries.slice(0, 80)) {
    const raw = await entry.async("text");
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const text = (doc.body?.textContent || raw)
      .replace(/\s+/g, " ")
      .replace(/^\s+|\s+$/g, "");
    if (countStudyWords(text) >= 20) chunks.push(text);
  }

  const fullText = chunks.join("\n\n").trim();
  if (!fullText) throw new Error("EPUB letto ma senza testo studiabile.");
  return fullText;
}

async function readImageWithBrowserOcr(file: File): Promise<string> {
  const TextDetectorCtor = (globalThis as any).TextDetector;
  if (typeof TextDetectorCtor !== "function") {
    throw new Error("OCR_BROWSER_UNAVAILABLE");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("IMAGE_DECODE_UNAVAILABLE");
  }
  try {
    const detector = new TextDetectorCtor();
    const detections = await detector.detect(bitmap);
    const text = (Array.isArray(detections) ? detections : [])
      .map((item: any) => String(item?.rawValue || item?.text || "").trim())
      .filter(Boolean)
      .join("\n");
    if (!text.trim()) {
      throw new Error("OCR_EMPTY_RESULT");
    }
    return text;
  } finally {
    bitmap.close?.();
  }
}


async function readPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await loadPdfJs();
    const arrayBuffer = await readBlobArrayBuffer(file);

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
  return (await readStudyFileDetailed(file)).text;
}

export async function readStudyFileDetailed(file: File): Promise<StudyFileReadResult> {
  const name = file.name.toLowerCase();
  const warnings: string[] = [];
  let text = "";
  let sourceType: StudyFileReadResult["sourceType"] = "txt";

  if (name.endsWith(".docx")) {
    sourceType = "docx";
    text = await readDocx(file);
  } else if (name.endsWith(".txt")) {
    sourceType = "txt";
    text = await readBlobText(file);
  } else if (name.endsWith(".md") || name.endsWith(".markdown")) {
    sourceType = "md";
    text = await readBlobText(file);
  } else if (name.endsWith(".pdf")) {
    sourceType = "pdf";
    text = await readPdf(file);
  } else if (name.endsWith(".epub")) {
    sourceType = "epub";
    text = await readEpub(file);
  } else if (/\.(png|jpe?g|webp|heic|heif)$/i.test(name) || file.type.startsWith("image/")) {
    sourceType = "image";
    try {
      text = await readImageWithBrowserOcr(file);
      warnings.push("Testo estratto via OCR browser: verifica eventuali errori di riconoscimento.");
    } catch {
      text = "";
      warnings.push("Non riesco a leggere automaticamente questo file da qui. Puoi incollare il testo oppure continuare da browser.");
    }
  } else {
    throw new Error("Formato non supportato. Usa PDF, EPUB, TXT, MD, Markdown, DOCX o immagini JPG/PNG/WebP/HEIC.");
  }

  const clean = cleanText(text);
  const empty = countStudyWords(clean) === 0;
  if (empty && sourceType !== "image") throw new Error(`${file.name}: file vuoto o senza testo studiabile.`);

  return {
    fileName: file.name,
    sourceType,
    text: clean,
    warnings,
    empty,
  };
}

export async function readStudyFiles(files: File[]): Promise<StudyFileReadResult> {
  if (!files.length) throw new Error("Nessun file selezionato.");
  const results: StudyFileReadResult[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      results.push(await readStudyFileDetailed(file));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name}: errore lettura.`);
    }
  }

  const readable = results.filter((result) => countStudyWords(result.text) > 0);
  if (!readable.length) {
    const acceptedImages = results.filter((result) => result.sourceType === "image");
    if (acceptedImages.length) {
      return {
        fileName: acceptedImages.length === 1 ? acceptedImages[0].fileName : `${acceptedImages.length} immagini acquisite`,
        sourceType: "image",
        text: "",
        warnings: [...acceptedImages.flatMap((result) => result.warnings), ...errors],
        empty: true,
      };
    }
    throw new Error(errors.join(" ") || "Nessun testo leggibile nei file selezionati.");
  }

  const combined = readable
    .map((result, index) => `=== MATERIALE ${index + 1}: ${result.fileName} ===\n\n${result.text}`)
    .join("\n\n");

  return {
    fileName: readable.length === 1 ? readable[0].fileName : `${readable.length} materiali uniti`,
    sourceType: readable.length === 1 ? readable[0].sourceType : "txt",
    text: combined,
    warnings: [...readable.flatMap((result) => result.warnings), ...errors],
    empty: false,
  };
}
