import JSZip from "jszip";
import { explainProfessionalWord, extractProfessionalTerms } from "@/lib/professional-dictionary";
import {
  buildInsufficientStudySession,
  buildTopicModeSession,
  classifyStudyInput,
} from "@/lib/study-os/study-topic-mode";

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
export type StudyDifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type StudyMaterialIntentType =
  | "auto"
  | "school_notes"
  | "book_manual"
  | "university_handout"
  | "pdf_document"
  | "narrative_manuscript"
  | "essay_theme"
  | "legal_document"
  | "image_page"
  | "other";

export type StudySubjectIntent =
  | "auto"
  | "italian_literature"
  | "history"
  | "geography"
  | "philosophy"
  | "law"
  | "economics"
  | "math"
  | "physics"
  | "chemistry"
  | "biology"
  | "medicine"
  | "psychology"
  | "computer-science"
  | "languages"
  | "art"
  | "music"
  | "other";

export type LiteraryGenreIntent =
  | "auto"
  | "literary_fiction"
  | "romance"
  | "dark_romance"
  | "thriller_mystery"
  | "fantasy"
  | "horror_gothic"
  | "memoir"
  | "narrative_self_help"
  | "poetry"
  | "narrative_essay"
  | "other";

export type StudyGoalIntent =
  | "quick_understanding"
  | "oral_test"
  | "exam_prep"
  | "complete_summary"
  | "quiz"
  | "flashcards"
  | "manuscript_analysis"
  | "oral_presentation";

export interface StudyIntentSettings {
  studyMaterialType?: StudyMaterialIntentType;
  studySubject?: StudySubjectIntent;
  literaryGenre?: LiteraryGenreIntent;
  studyGoal?: StudyGoalIntent;
  difficultyLevel?: StudyDifficultyLevel;
}

export interface StudyQualityScores {
  summaryQuality: number;
  quizQuality: number;
  vocabularyQuality: number;
  flashcardQuality: number;
  oralExamQuality: number;
  reasons: string[];
}

export interface DifficultWord {
  word: string;
  simple: string;
  technical: string;
  example: string;
  school?: string;
  advanced?: string;
  memoryTrick?: string;
  commonMistake?: string;
  precise?: string;
  newExample?: string;
  synonyms?: string[];
  antonyms?: string[];
  examQuestion?: string;
  connections?: string[];
  importance?: "alto" | "medio" | "basso";
}

export type StudyLearningLevel = "memory" | "understanding" | "application" | "exam" | "professor";

export interface Flashcard {
  front: string;
  back: string;
  type?: "definition" | "cause-effect" | "comparison" | "true-false" | "application" | "oral";
  level?: StudyDifficultyLevel;
  category?: string;
  example?: string;
  commonMistake?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard";
  memoryTrick?: string;
  commonMistake?: string;
  type?: "multiple-choice" | "true-false" | "short-answer" | "open" | "connection" | "case" | "comparison" | "own-words";
  sourceReference?: string;
  testedSkill?: string;
  learningLevel?: StudyLearningLevel;
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
  | "personal-growth"
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
  | "scientific_material"
  | "math_material"
  | "historical_material"
  | "literary_analysis"
  | "poetry"
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

export interface StudyLearningPackage {
  summaryUltraBrief: string;
  summaryStandard: string;
  summaryDeep: string;
  keyConcepts: string[];
  commonMistakes: string[];
  examQuestions: string[];
}

export interface StudyKnowledgeArea {
  concept: string;
  mastery: number;
  status: "strong" | "medium" | "weak";
  reason: string;
  nextAction: string;
}

export interface StudyAdaptiveCoachSnapshot {
  currentLevel: "base" | "in_progress" | "exam_ready";
  nextAction: string;
  gaps: string[];
  strengths: string[];
  estimatedPassProbability: number;
  knowledgeMap: StudyKnowledgeArea[];
}

export type StudySessionMode = "full" | "topic" | "insufficient";

export interface StudySessionResult {
  title: string;
  sourceName: string;
  words: number;
  contentType: StudyContentType;
  subjectLabel: string;
  studyMode: string;
  detectedSubject: string;
  difficulty: StudyDifficulty;
  /** full = materiale reale; topic = esplorazione argomento; insufficient = sotto soglia parole */
  sessionMode?: StudySessionMode;
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
  learningPackage?: StudyLearningPackage;
  knowledgeMap?: StudyKnowledgeArea[];
  adaptiveCoach?: StudyAdaptiveCoachSnapshot;
  keyConcepts: string[];
  studyMaterialType?: StudyMaterialIntentType;
  studySubject?: StudySubjectIntent;
  literaryGenre?: LiteraryGenreIntent;
  studyGoal?: StudyGoalIntent;
  difficultyLevel?: StudyDifficultyLevel;
  qualityScores?: StudyQualityScores;
}

export interface StudyFileReadResult {
  fileName: string;
  sourceType: "pdf" | "docx" | "txt" | "md" | "epub" | "image";
  text: string;
  warnings: string[];
  empty: boolean;
}

export type StudyImageOcrEngine = "text-detector" | "tesseract" | "manual";

export interface StudyImageOcrResult {
  text: string;
  engine: StudyImageOcrEngine;
  warnings: string[];
  empty: boolean;
  confidence?: number;
}

export interface StudyImportCapability {
  id: StudyFileReadResult["sourceType"];
  label: string;
  status: "READY" | "FALLBACK" | "UNAVAILABLE";
  evidence: string;
}

export type StudyImageOcrStatus = "preparing" | "browser-ocr" | "client-ocr" | "fallback";

export type StudyImageOcrOptions = {
  textDetectorCtor?: any;
  tesseractRecognize?: (image: Blob | File) => Promise<string | { text?: string; confidence?: number }>;
  skipPreprocess?: boolean;
  onStatus?: (status: StudyImageOcrStatus, message: string) => void;
};

export type StudyFileReadOptions = {
  imageOcr?: StudyImageOcrOptions;
};

export const STUDY_IMAGE_OCR_HINT =
  "Per una lettura migliore, fotografa la pagina in piano, con luce uniforme e testo nitido.";

export const STUDY_IMAGE_OCR_FALLBACK_COPY =
  "Non sono riuscito a leggere automaticamente questa immagine. Puoi scattare di nuovo con più luce, caricare una foto più nitida o incollare il testo.";

export const STUDY_IMAGE_UNSUPPORTED_FORMAT_COPY =
  "Questo formato foto potrebbe non essere supportato qui. Puoi convertirlo in JPG/PNG o continuare da browser.";

const STUDY_IMAGE_OCR_PARTIAL_COPY =
  "Ho letto parte del testo. Puoi correggerlo prima di continuare.";

const STUDY_IMAGE_OCR_SUCCESS_COPY =
  "Testo rilevato. Controlla l'anteprima e avvia l'analisi.";

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
  "without","yourself","become","became","becoming",
  "feel","feels","feeling","other","people","moment",


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

function normalizeStudyIntent(intent: StudyIntentSettings = {}): Required<StudyIntentSettings> {
  const difficulty = Number(intent.difficultyLevel || 3);
  return {
    studyMaterialType: intent.studyMaterialType || "auto",
    studySubject: intent.studySubject || "auto",
    literaryGenre: intent.literaryGenre || "auto",
    studyGoal: intent.studyGoal || "complete_summary",
    difficultyLevel: ([1, 2, 3, 4, 5].includes(difficulty) ? difficulty : 3) as StudyDifficultyLevel,
  };
}

function difficultyFromLevel(level: StudyDifficultyLevel): StudyDifficulty {
  if (level <= 1) return "soft";
  if (level >= 4) return "pro";
  return "medium";
}

function subjectIntentLabel(subject: StudySubjectIntent): string {
  const labels: Record<StudySubjectIntent, string> = {
    auto: "Rilevamento automatico",
    italian_literature: "Italiano / Letteratura",
    history: "Storia",
    geography: "Geografia",
    philosophy: "Filosofia",
    law: "Diritto",
    economics: "Economia",
    math: "Matematica",
    physics: "Fisica",
    chemistry: "Chimica",
    biology: "Biologia",
    medicine: "Medicina",
    psychology: "Psicologia",
    "computer-science": "Informatica",
    languages: "Inglese / Lingue",
    art: "Arte",
    music: "Musica",
    other: "Altra materia",
  };
  return labels[subject] || labels.auto;
}

function literaryGenreLabel(genre: LiteraryGenreIntent): string {
  const labels: Record<LiteraryGenreIntent, string> = {
    auto: "Narrativa / Letteratura",
    literary_fiction: "Narrativa / Letteratura",
    romance: "Romance",
    dark_romance: "Dark romance",
    thriller_mystery: "Thriller / Mystery",
    fantasy: "Fantasy",
    horror_gothic: "Horror / Gotico",
    memoir: "Memoir",
    narrative_self_help: "Self-help narrativo",
    poetry: "Poesia",
    narrative_essay: "Saggio narrativo",
    other: "Genere editoriale",
  };
  return labels[genre] || labels.auto;
}

function subjectIntentToMaterialType(subject: StudySubjectIntent): StudyMaterialType | null {
  const map: Partial<Record<StudySubjectIntent, StudyMaterialType>> = {
    italian_literature: "literature",
    history: "history",
    philosophy: "philosophy",
    law: "law",
    economics: "economics",
    math: "math",
    physics: "physics",
    chemistry: "chemistry",
    biology: "medicine",
    medicine: "medicine",
    psychology: "scientific-article",
    "computer-science": "computer-science",
    languages: "foreign-language",
  };
  return map[subject] || null;
}

function contentTypeForManualSubject(subject: StudySubjectIntent, materialType: StudyMaterialIntentType): StudyContentType | null {
  if (materialType === "narrative_manuscript") return "narrative_fiction";
  if (materialType === "legal_document" || subject === "law") return "legal_document";
  if (subject === "math") return "math_material";
  if (subject === "history") return "historical_material";
  if (subject === "italian_literature") return "literary_analysis";
  if (["physics", "chemistry", "biology", "medicine", "psychology"].includes(subject)) return "scientific_material";
  if (materialType === "essay_theme") return "essay";
  if (materialType === "book_manual" || materialType === "university_handout") return "textbook";
  if (materialType === "school_notes") return "study_notes";
  return null;
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
  const educationalScore = scorePatterns(lower, [
    /\b(definizione|concetto|modulo|obiettivo|apprendimento|didattic|accademico|universit|esame|lezione|dispensa|formula|teorema|ipotesi|metodo scientifico|capitolo\s+\d|unita didattica|obiettivi di apprendimento)\b/gi,
  ]);

  if (educationalScore >= 3 && fictionSignalsScore < 8) {
    return {
      contentType: "textbook",
      subjectLabel: "Manuale / Libro di testo",
      mode: "Studio guidato",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: [`Materiale didattico: ${educationalScore} segnali`, `Narrativa: ${fictionSignalsScore} segnali`],
    };
  }

  if (hasNarrativeStructure && fictionSignalsScore > legalKeywordScore && fictionSignalsScore >= 8) {
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

  const selfHelpScore = scorePatterns(lower, [
    /\b(boundaries|boundary|people pleasing|self worth|awakening|healing|let them be|nervous system|hypervigilance|hyper vigilance|emotional regulation|inner peace|self abandonment|personal growth|trauma|attachment|clarity|rescuing)\b/gi,
  ]);

  if (selfHelpScore >= 4) {
    return {
      contentType: "mixed_or_unknown",
      subjectLabel: "Crescita personale / Psicologia pratica / Letteratura motivazionale",
      mode: "Analisi concettuale",
      fictionSignalsScore,
      legalKeywordScore,
      legalDocumentScore,
      signals: [`Self Help: ${selfHelpScore} segnali`],
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
    type: "computer-science",
    label: "Informatica / Intelligenza Artificiale",
    patterns: [
      /\b(intelligenza artificiale|informatica|machine learning|deep learning|algoritmi|programmazione|rete neurale|reti neurali|computer vision|software|hardware|database|rete|api|codice|funzione|variabile|classe|server|protocollo|dataset|training|inferenza|nlp|transformer|chatgpt|llm)\b/gi,
      /\b(IA|AI|ML|DL)\b/g,
      /```|[{};<>]/g,
    ],
    strategy: ["definizioni", "algoritmi e modelli", "dataset e training", "applicazioni pratiche"],
  },
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
    type: "personal-growth",
    label: "Crescita personale / Psicologia pratica / Letteratura motivazionale",
    patterns: [
      /\b(self[-\s]?help|personal growth|motivational|motivation|mindset|boundaries|relationship|relationships|emotional|anxiety|healing|trauma|control|confidence|habits|let them be|mel robbins)\b/gi,
      /\b(crescita personale|psicologia pratica|motivazione|mentalità|confini|relazioni|emozioni|ansia|guarigione|abitudini|autostima|lascia che|lasciar andare)\b/gi,
    ],
    strategy: ["principi chiave", "applicazioni personali", "esempi pratici", "domande di riflessione"],
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

export function classifyStudyMaterial(text: string, sourceName = "", intent: StudyIntentSettings = {}): StudyMaterialClassification {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();
  const words = countStudyWords(clean);
  const manual = normalizeStudyIntent(intent);
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
  const manualType = subjectIntentToMaterialType(manual.studySubject);
  const manualContentType = contentTypeForManualSubject(manual.studySubject, manual.studyMaterialType);
  const hasManualOverride =
    manual.studyMaterialType !== "auto"
    || manual.studySubject !== "auto"
    || manual.literaryGenre !== "auto"
    || manual.studyGoal !== "complete_summary";
  const manualNarrative = manual.studyMaterialType === "narrative_manuscript";
  const manualPoetry = manual.literaryGenre === "poetry";
  const manualLegal = manual.studyMaterialType === "legal_document" || manual.studySubject === "law";
  const finalType = manualNarrative
    ? "literature"
    : manualLegal
      ? "law"
      : manualType || type;
  const finalLabel = manualNarrative
    ? literaryGenreLabel(manual.literaryGenre)
    : manual.studySubject !== "auto"
      ? subjectIntentLabel(manual.studySubject)
      : label;
  const finalContentType: StudyContentType = manualPoetry
    ? "poetry"
    : manualNarrative
      ? "narrative_fiction"
      : manualLegal && profile.contentType !== "narrative_fiction"
        ? "legal_document"
        : manualContentType || profile.contentType;
  const finalSubjectLabel = manualNarrative
    ? literaryGenreLabel(manual.literaryGenre)
    : manual.studySubject !== "auto"
      ? subjectIntentLabel(manual.studySubject)
      : profile.subjectLabel === "Materiale generale" ? label : profile.subjectLabel;
  const finalMode = finalContentType === "narrative_fiction"
    ? "Analisi narrativa"
    : finalContentType === "legal_document"
      ? "Analisi giuridica"
      : manual.studyGoal === "oral_test" || manual.studyGoal === "oral_presentation"
        ? "Interrogazione orale"
        : manual.studyGoal === "exam_prep"
          ? "Preparazione esame"
          : profile.mode;
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
    type: finalType,
    label: finalLabel,
    contentType: finalContentType,
    subjectLabel: finalSubjectLabel,
    mode: finalMode,
    confidence,
    language: detectStudyLanguage(clean || sourceName),
    difficultyScore,
    estimatedStudyMinutes,
    signals: [
      ...(hasManualOverride ? [`Scelte utente prioritarie: ${finalLabel}, livello ${manual.difficultyLevel}/5`] : []),
      ...profile.signals,
      ...(top?.score ? [`${top.label}: ${top.score} segnali`] : ["Classificazione generica"]),
      ...(second?.score ? [`Alternativa: ${second.label}`] : []),
    ],
    strategy: manualNarrative
      ? ["personaggi", "ambientazione", "conflitto", "tensione narrativa", "promesse aperte", "lessico narrativo"]
      : manual.studyGoal === "exam_prep" || manual.difficultyLevel >= 4
        ? ["definizioni", "collegamenti", "casi applicativi", "domande da esame", "capacità critica"]
        : override?.strategy || (top?.score ? top.strategy : ["concetti chiave", "riassunto progressivo", "quiz di comprensione"]),
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

  const BAD_PHRASES = new Set([
    "will become",
    "will feel",
    "feels like",
    "other people",
    "your own",
    "there will",
    "you will",
  ]);

  for (const phrase of phraseMatches) {
    const parts = phrase.split(" ");

    if (BAD_PHRASES.has(phrase)) continue;
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

function hasTechnicalArtifact(text: string): boolean {
  return /\b(undefined|null|\[object Object\]|stack trace|TypeError|ReferenceError|SyntaxError)\b/i.test(text)
    || /^\s*[{[][\s\S]*[}\]]\s*$/.test(text.trim());
}

function looksTruncatedStudyText(text: string): boolean {
  const clean = String(text || "").trim();
  if (!clean) return true;
  if (/[.…]{2,}\s*$/.test(clean)) return true;
  if (/\b(Viola sent|sent\.\.\.|sent…|guard\.\.\.|pens\.\.\.)/i.test(clean)) return true;
  if (/\b(domanda|risposta|spiegazione)\s*:\s*$/i.test(clean)) return true;
  return false;
}

export function sanitizeStudyOutput(output: unknown, fallback = "Questa sezione non ha abbastanza informazioni nel materiale caricato."): string {
  const clean = String(output || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\b(undefined|null|\[object Object\])\b/gi, "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!clean || hasTechnicalArtifact(clean)) return fallback;

  const seen = new Set<string>();
  const lines = clean
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line || hasTechnicalArtifact(line) || looksTruncatedStudyText(line)) return false;
      const key = line.toLowerCase().replace(/^[•\-\d.)\s]+/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return lines.length ? lines.join("\n") : fallback;
}

export function sanitizeStudyQuizQuestions(items: QuizQuestion[], fallback: QuizQuestion[] = []): QuizQuestion[] {
  const seen = new Set<string>();
  const clean = items
    .map((item) => {
      const options = (Array.isArray(item.options) ? item.options : [])
        .map((option) => sanitizeStudyOutput(option, ""))
        .filter(Boolean);
      const uniqueOptions = Array.from(new Set(options));
      const answer = Number.isFinite(Number(item.answer)) ? Math.max(0, Math.min(uniqueOptions.length - 1, Number(item.answer))) : 0;
      return {
        ...item,
        question: sanitizeStudyOutput(item.question, ""),
        options: uniqueOptions,
        answer,
        explanation: sanitizeStudyOutput(item.explanation, "Spiegazione non specificata nel materiale."),
        memoryTrick: item.memoryTrick ? sanitizeStudyOutput(item.memoryTrick, "") : "",
        commonMistake: item.commonMistake ? sanitizeStudyOutput(item.commonMistake, "") : "",
      };
    })
    .filter((item) => {
      const key = item.question.toLowerCase();
      if (!isValidStudyQuestion(item.question, seen)) return false;
      if (item.options.length < 2) return false;
      if (item.options.some((option) => !option || hasTechnicalArtifact(option) || looksTruncatedStudyText(option))) return false;
      seen.add(key);
      return true;
    });

  return clean.length ? clean.slice(0, 18) : fallback;
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
      learningLevel: "understanding",
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
      learningLevel: "application",
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
      learningLevel: "exam",
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
      learningLevel: "understanding",
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
      learningLevel: "memory",
    },
  ];
}

function levelDifficulty(level: StudyDifficultyLevel, index: number): "easy" | "medium" | "hard" {
  if (level <= 1) return index < 4 ? "easy" : "medium";
  if (level === 2) return index < 2 ? "easy" : index < 7 ? "medium" : "hard";
  if (level === 3) return index < 2 ? "easy" : index < 6 ? "medium" : "hard";
  return index < 2 ? "medium" : "hard";
}

function learningLevelForQuiz(index: number, total: number, level: StudyDifficultyLevel): StudyLearningLevel {
  const ratio = total <= 1 ? 1 : index / Math.max(1, total - 1);
  if (ratio < 0.22) return "memory";
  if (ratio < 0.45) return "understanding";
  if (ratio < 0.68) return "application";
  if (ratio < 0.78 || level < 4) return "exam";
  return "professor";
}

function buildProgressiveQuiz(
  concepts: string[],
  classification: StudyMaterialClassification,
  level: StudyDifficultyLevel,
): QuizQuestion[] {
  const base = concepts.length ? concepts : [classification.label];
  const questionCount = level >= 5 ? 15 : level >= 3 ? 12 : 10;
  const hardPrompts = [
    "Quale conseguenza deriva da",
    "Quale obiezione si potrebbe fare a",
    "Come applicheresti a un caso concreto",
    "Quale collegamento interdisciplinare puoi costruire con",
    "Perche' e' importante distinguere",
  ];

  return Array.from({ length: questionCount }, (_, index) => {
    const concept = base[index % base.length];
    const next = base[(index + 1) % base.length] || classification.label;
    const difficulty = levelDifficulty(level, index);
    const learningLevel = learningLevelForQuiz(index, questionCount, level);
    const isHard = difficulty === "hard";
    const isEasy = difficulty === "easy";
    const question = isEasy
      ? `Che cosa significa "${concept}" nel materiale?`
      : isHard
        ? `${hardPrompts[index % hardPrompts.length]} "${concept}" rispetto a "${next}"?`
        : `Quale affermazione descrive meglio il ruolo di "${concept}" nel materiale studiato?`;

    return {
      question,
      options: isEasy
        ? [
            `Un concetto da definire con parole semplici e collegare a ${classification.label}`,
            "Un dettaglio da ignorare perche' non serve allo studio",
            "Una parola da memorizzare senza contesto",
            "Un esempio esterno non presente nel materiale",
          ]
        : isHard
          ? [
              `Va spiegato collegando definizione, conseguenze e confronto con "${next}"`,
              "Va citato senza analisi critica",
              "Va trasformato in un fatto non presente nel materiale",
              "Va usato solo come titolo di paragrafo",
            ]
          : [
              "È un dettaglio secondario da memorizzare senza collegamenti",
              "È un concetto chiave da definire, spiegare e collegare al tema centrale",
              "È una parola da saltare se non compare nel titolo",
              "È utile solo se viene chiesto in modo identico nel test",
            ],
      answer: isHard ? 0 : isEasy ? 0 : 1,
      explanation: isHard
        ? `A livello ${level} devi argomentare: definizione, collegamento, conseguenza e possibile confronto.`
        : isEasy
          ? `La verifica base parte dalla definizione chiara e da un collegamento semplice al materiale.`
          : `La risposta migliore collega "${concept}" al tema centrale e non lo tratta come parola isolata.`,
      difficulty,
      type: isHard ? "connection" : isEasy ? "multiple-choice" : "comparison",
      sourceReference: classification.label,
      testedSkill: learningLevel === "memory"
        ? "memoria e definizione"
        : learningLevel === "understanding"
          ? "comprensione"
          : learningLevel === "application"
            ? "applicazione"
            : learningLevel === "professor"
              ? "ragionamento da professore"
              : "preparazione esame",
      learningLevel,
      memoryTrick: isHard ? "Rispondi sempre con: concetto -> prova dal testo -> conseguenza." : "Definizione + esempio + collegamento.",
      commonMistake: "Inventare informazioni non presenti o ripetere parole senza spiegarle.",
    } satisfies QuizQuestion;
  });
}

function buildProfessionalFlashcards(
  concepts: string[],
  classification: StudyMaterialClassification,
  level: StudyDifficultyLevel,
): Flashcard[] {
  const base = concepts.length ? concepts : [classification.label];
  return base.slice(0, 14).map((concept, index) => {
    const type: Flashcard["type"] =
      index % 4 === 0 ? "definition" : index % 4 === 1 ? "cause-effect" : index % 4 === 2 ? "comparison" : "application";
    return {
      front: type === "comparison"
        ? `Confronta "${concept}" con un altro concetto del materiale.`
        : type === "application"
          ? `Come useresti "${concept}" in una risposta orale?`
          : `Che cosa significa "${concept}" nel materiale?`,
      back: `Risposta attesa: definisci "${concept}", collegalo a ${classification.label} e aggiungi un esempio o una conseguenza ricavata dal testo.`,
      type,
      level,
      category: classification.label,
      example: `Esempio: "${concept}" va spiegato con una prova concreta del materiale.`,
      commonMistake: "Dare una definizione astratta senza collegarla al testo studiato.",
    };
  });
}

function buildProfessionalVocabulary(clean: string, words: number): DifficultWord[] {
  const professionalTerms = extractProfessionalTerms(clean, 18);
  const candidateWords = [
    ...professionalTerms,
    ...keywords(clean, words > 900 ? 24 : 14).filter((word) => word.length >= 6),
  ];
  const unique = Array.from(new Set(candidateWords.map((word) => word.trim()).filter(Boolean)));
  const target = words > 900 ? Math.max(8, Math.min(18, unique.length)) : Math.min(12, unique.length);
  const selected = unique.slice(0, Math.max(1, target));
  return selected.map((word, index) => {
    const entry = explainWord(word);
    const connections = selected
      .filter((candidate) => candidate.toLowerCase() !== word.toLowerCase())
      .slice(index + 1, index + 4);
    return {
      word: entry.word,
      simple: sanitizeStudyOutput(entry.simple, "Definizione semplice dedotta dal contesto."),
      technical: sanitizeStudyOutput(entry.technical, "Definizione precisa dedotta dal contesto."),
      school: `Definizione scolastica: "${entry.word}" e' un concetto da spiegare con definizione, contesto ed esempio tratto dal materiale.`,
      advanced: `Definizione avanzata: collega "${entry.word}" a meccanismi, conseguenze o confronti presenti nel testo, evitando informazioni esterne non verificate.`,
      precise: sanitizeStudyOutput(entry.technical, "Definizione dedotta dal contesto."),
      example: sanitizeStudyOutput(entry.example, `Esempio dal contesto: ${entry.word} compare nel materiale studiato.`),
      newExample: `Nuovo esempio: usa "${entry.word}" in una frase che spieghi il tema centrale.`,
      synonyms: [],
      antonyms: [],
      commonMistake: `Usare "${entry.word}" senza definirlo o senza collegarlo al materiale.`,
      examQuestion: `Come spiegheresti "${entry.word}" durante un'interrogazione?`,
      connections,
      importance: index < 6 ? "alto" : index < 12 ? "medio" : "basso",
    };
  });
}

function buildEvidenceInventory(clean: string): string {
  const dates = clean.match(/\b\d{3,4}\b/g) || [];
  const formulas = clean.match(/[=<>±√∑∫π]|\b[A-Z][a-z]?\d+\b/g) || [];
  const names = (clean.match(/\b[A-ZÀ-Ý][a-zà-ÿ]{2,}\b/g) || [])
    .filter((name) => !/Capitolo|Articolo|Studio|Diritto|Storia|Filosofia|Introduzione|Conclusione/.test(name));
  const parts = [
    dates.length ? `Date: ${Array.from(new Set(dates)).slice(0, 8).join(", ")}` : "Date: non specificato nel materiale",
    names.length ? `Nomi: ${Array.from(new Set(names)).slice(0, 8).join(", ")}` : "Nomi: non specificato nel materiale",
    formulas.length ? `Formule/simboli: ${Array.from(new Set(formulas)).slice(0, 8).join(", ")}` : "Formule/simboli: non specificato nel materiale",
  ];
  return parts.join("\n• ");
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
    question: `Vero o falso: "${concept}" è un concetto da collegare al tema centrale del materiale?`,
    options: ["Vero", "Falso", "Non determinabile", "Solo se appare nel titolo"],
    answer: 0,
    explanation: `"${concept}" è stato rilevato tra i concetti chiave; va definito e collegato, non memorizzato isolatamente.`,
    difficulty: index < 2 ? "easy" : "medium",
    learningLevel: index < 3 ? "memory" : "understanding",
    memoryTrick: "Vero se puoi collegarlo al tema centrale con un esempio.",
    commonMistake: "Trattare il concetto come parola da imparare a memoria senza contesto.",
  }));
}

function buildCommonMistakes(
  concepts: string[],
  difficultWords: DifficultWord[],
  classification: StudyMaterialClassification,
): string[] {
  const source = [
    ...difficultWords.map((item) => item.commonMistake || "").filter(Boolean),
    ...concepts.slice(0, 6).map((concept) => `Confondere "${concept}" con una parola da memorizzare, senza spiegare definizione, esempio e collegamento.`),
    classification.type === "math" || classification.type === "physics"
      ? "Saltare i passaggi intermedi: formula, significato dei simboli, sostituzione e conclusione devono restare visibili."
      : "",
    classification.type === "history"
      ? "Elencare date senza collegare cause, eventi e conseguenze."
      : "",
    classification.type === "law"
      ? "Citare norme o articoli senza spiegare obbligo, effetto pratico e caso applicativo."
      : "",
  ].filter(Boolean);

  return Array.from(new Set(source)).slice(0, 8);
}

function buildExamQuestionList(
  openQuestions: OpenStudyQuestion[],
  quiz: QuizQuestion[],
  concepts: string[],
): string[] {
  const questions = [
    ...openQuestions.map((item) => item.question),
    ...quiz.filter((item) => item.difficulty === "hard" || item.learningLevel === "exam" || item.learningLevel === "professor").map((item) => item.question),
    ...concepts.slice(0, 4).map((concept) => `Spiega "${concept}" collegando definizione, esempio e conseguenza.`),
  ];

  return Array.from(new Set(questions.map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 10);
}

function buildLearningPackage(input: {
  summaries: Record<StudySummaryMode, string>;
  keyConcepts: string[];
  difficultWords: DifficultWord[];
  openQuestions: OpenStudyQuestion[];
  quiz: QuizQuestion[];
  classification: StudyMaterialClassification;
}): StudyLearningPackage {
  return {
    summaryUltraBrief: input.summaries.ultraSimple || input.summaries.brief,
    summaryStandard: input.summaries.complete,
    summaryDeep: input.summaries.university || input.summaries.oralExam,
    keyConcepts: input.keyConcepts.slice(0, 12),
    commonMistakes: buildCommonMistakes(input.keyConcepts, input.difficultWords, input.classification),
    examQuestions: buildExamQuestionList(input.openQuestions, input.quiz, input.keyConcepts),
  };
}

function buildInitialKnowledgeMap(
  keyConcepts: string[],
  classification: StudyMaterialClassification,
  level: StudyDifficultyLevel,
): StudyKnowledgeArea[] {
  const base = keyConcepts.length ? keyConcepts : [classification.label];
  const difficultyPenalty = Math.max(0, level - 2) * 4 + Math.max(0, classification.difficultyScore - 5) * 3;

  return base.slice(0, 10).map((concept, index) => {
    const mastery = Math.max(35, Math.min(68, 58 - difficultyPenalty + (index < 3 ? 6 : index < 6 ? 0 : -5)));
    return {
      concept,
      mastery,
      status: mastery >= 70 ? "strong" : mastery >= 50 ? "medium" : "weak",
      reason: "Da verificare con quiz, flashcard e risposta orale.",
      nextAction: `Studia "${concept}" con definizione, esempio e domanda d'esame.`,
    };
  });
}

function buildInitialAdaptiveCoach(
  knowledgeMap: StudyKnowledgeArea[],
  learningPackage: StudyLearningPackage,
  classification: StudyMaterialClassification,
): StudyAdaptiveCoachSnapshot {
  const avg = knowledgeMap.length
    ? Math.round(knowledgeMap.reduce((sum, item) => sum + item.mastery, 0) / knowledgeMap.length)
    : 45;
  const gaps = knowledgeMap.filter((item) => item.status === "weak").map((item) => item.concept).slice(0, 4);
  const strengths = knowledgeMap.filter((item) => item.status !== "weak").map((item) => item.concept).slice(0, 4);

  return {
    currentLevel: avg >= 76 ? "exam_ready" : avg >= 55 ? "in_progress" : "base",
    nextAction: gaps[0]
      ? `Rinforza "${gaps[0]}" con riassunto standard, flashcard e una risposta orale.`
      : `Passa alla simulazione esame su ${classification.label}.`,
    gaps: gaps.length ? gaps : learningPackage.commonMistakes.slice(0, 3),
    strengths: strengths.length ? strengths : learningPackage.keyConcepts.slice(0, 3),
    estimatedPassProbability: Math.max(35, Math.min(82, avg + 12)),
    knowledgeMap,
  };
}

function uniqueCount(items: string[]): number {
  return new Set(items.map((item) => item.toLowerCase().replace(/\s+/g, " ").trim()).filter(Boolean)).size;
}

function sanitizedSummaryFallback(text?: string): string {
  return String(text || "Sezione non disponibile nel materiale caricato.").trim();
}

export function scoreStudySessionQuality(result: StudySessionResult): StudyQualityScores {
  const reasons: string[] = [];
  if (result.sessionMode === "topic" || result.sessionMode === "insufficient") {
    reasons.push("exploration_or_insufficient_mode");
  }
  if ((result.words || 0) < 40 && (result.quiz?.length || 0) > 0) {
    reasons.push("quiz_on_insufficient_material");
  }
  const summaryText = [
    result.lightSummary,
    result.mediumSummary,
    result.proSummary,
    result.studyNotesPro,
    ...Object.values(result.summaries || {}),
  ].join("\n");
  const quizQuestions = result.quiz.map((item) => item.question);
  const flashcardFronts = result.flashcards.map((item) => item.front);
  const vocabularyWords = result.difficultWords.map((item) => item.word);
  const oralQuestions = result.openQuestions.map((item) => item.question);

  const artifactPenalty = hasTechnicalArtifact(summaryText) ? 2 : 0;
  if (artifactPenalty) reasons.push("artifact_in_summary");
  if (quizQuestions.some(looksTruncatedStudyText)) reasons.push("truncated_quiz_question");
  if (uniqueCount(quizQuestions) < quizQuestions.length) reasons.push("duplicate_quiz_questions");
  if (uniqueCount(vocabularyWords) < vocabularyWords.length) reasons.push("duplicate_vocabulary");

  const summaryQuality = Math.max(1, Math.min(10,
    6
    + (countStudyWords(summaryText) > 220 ? 2 : 0)
    + (result.summaries && Object.keys(result.summaries).length >= 6 ? 1 : 0)
    + (summaryText.includes("non specificato") || !/\b(1999|2000|2020|Napoleone|Einstein)\b/i.test(summaryText) ? 1 : 0)
    - artifactPenalty,
  ));
  const quizPenalty =
    result.sessionMode === "topic" || result.sessionMode === "insufficient" || ((result.words || 0) < 40 && result.quiz.length > 0)
      ? 4
      : 0;
  const quizQuality = Math.max(1, Math.min(10,
    5
    + (result.quiz.length >= 8 ? 2 : 0)
    + (result.quiz.some((item) => item.difficulty === "hard") ? 1 : 0)
    + (result.quiz.every((item) => item.options.length >= 2 && item.explanation.trim()) ? 1 : 0)
    + (uniqueCount(quizQuestions) === quizQuestions.length ? 1 : -2)
    - quizPenalty,
  ));
  const vocabularyQuality = Math.max(1, Math.min(10,
    5
    + (result.difficultWords.length >= 8 ? 2 : 0)
    + (result.difficultWords.every((item) => item.simple && item.technical && item.example) ? 2 : 0)
    + (uniqueCount(vocabularyWords) === vocabularyWords.length ? 1 : -2),
  ));
  const flashcardQuality = Math.max(1, Math.min(10,
    5
    + (result.flashcards.length >= 6 ? 2 : 0)
    + (result.flashcards.every((item) => item.front && item.back && !/domanda$/i.test(item.front)) ? 2 : 0)
    + (uniqueCount(flashcardFronts) === flashcardFronts.length ? 1 : -2),
  ));
  const oralExamQuality = Math.max(1, Math.min(10,
    5
    + (result.openQuestions.length >= 5 ? 2 : 0)
    + (result.openQuestions.every((item) => item.question.endsWith("?") && item.answerGuide.trim()) ? 2 : 0)
    + (uniqueCount(oralQuestions) === oralQuestions.length ? 1 : -2),
  ));

  return {
    summaryQuality,
    quizQuality,
    vocabularyQuality,
    flashcardQuality,
    oralExamQuality,
    reasons,
  };
}

export function sanitizeStudySessionResult(result: StudySessionResult, fallback?: StudySessionResult): StudySessionResult {
  const safeQuiz = sanitizeStudyQuizQuestions(result.quiz || [], fallback?.quiz || []);
  const safeTrueFalse = sanitizeStudyQuizQuestions(result.trueFalse || [], fallback?.trueFalse || []);
  const safeOpenQuestions = sanitizeStudyOpenQuestions(result.openQuestions || [], fallback?.openQuestions || []);
  const seenWords = new Set<string>();
  const difficultWords = (result.difficultWords || [])
    .map((item) => ({
      ...item,
      word: sanitizeStudyOutput(item.word, ""),
      simple: sanitizeStudyOutput(item.simple, "Definizione semplice dedotta dal contesto."),
      technical: sanitizeStudyOutput(item.technical, "Definizione precisa dedotta dal contesto."),
      school: item.school ? sanitizeStudyOutput(item.school, "") : item.school,
      advanced: item.advanced ? sanitizeStudyOutput(item.advanced, "") : item.advanced,
      example: sanitizeStudyOutput(item.example, "Esempio non specificato nel materiale."),
      commonMistake: item.commonMistake ? sanitizeStudyOutput(item.commonMistake, "") : item.commonMistake,
      connections: Array.from(new Set((item.connections || []).map((connection) => sanitizeStudyOutput(connection, "")).filter(Boolean))).slice(0, 6),
    }))
    .filter((item) => {
      const key = item.word.toLowerCase();
      if (!item.word || seenWords.has(key)) return false;
      seenWords.add(key);
      return true;
    })
    .slice(0, 25);
  const seenCards = new Set<string>();
  const flashcards = (result.flashcards || [])
    .map((item) => ({
      ...item,
      front: sanitizeStudyOutput(item.front, ""),
      back: sanitizeStudyOutput(item.back, ""),
      example: item.example ? sanitizeStudyOutput(item.example, "") : item.example,
      commonMistake: item.commonMistake ? sanitizeStudyOutput(item.commonMistake, "") : item.commonMistake,
    }))
    .filter((item) => {
      const key = item.front.toLowerCase();
      if (!item.front || !item.back || seenCards.has(key) || looksTruncatedStudyText(item.front)) return false;
      seenCards.add(key);
      return true;
    })
    .slice(0, 18);
  const learningPackage = result.learningPackage
    ? {
        summaryUltraBrief: sanitizeStudyOutput(result.learningPackage.summaryUltraBrief, fallback?.learningPackage?.summaryUltraBrief || sanitizedSummaryFallback(result.lightSummary)),
        summaryStandard: sanitizeStudyOutput(result.learningPackage.summaryStandard, fallback?.learningPackage?.summaryStandard || sanitizedSummaryFallback(result.mediumSummary)),
        summaryDeep: sanitizeStudyOutput(result.learningPackage.summaryDeep, fallback?.learningPackage?.summaryDeep || sanitizedSummaryFallback(result.proSummary)),
        keyConcepts: Array.from(new Set((result.learningPackage.keyConcepts || []).map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 14),
        commonMistakes: Array.from(new Set((result.learningPackage.commonMistakes || []).map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 10),
        examQuestions: Array.from(new Set((result.learningPackage.examQuestions || []).map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 12),
      }
    : fallback?.learningPackage;
  const knowledgeMap = (result.knowledgeMap || fallback?.knowledgeMap || [])
    .map((item) => ({
      concept: sanitizeStudyOutput(item.concept, ""),
      mastery: Math.max(0, Math.min(100, Math.round(Number(item.mastery) || 0))),
      status: item.status === "strong" || item.status === "medium" || item.status === "weak" ? item.status : "medium",
      reason: sanitizeStudyOutput(item.reason, "Da verificare con esercizi e quiz."),
      nextAction: sanitizeStudyOutput(item.nextAction, "Ripassa il concetto e verifica con una domanda."),
    }))
    .filter((item) => item.concept)
    .slice(0, 12);
  const adaptiveCoach = result.adaptiveCoach || fallback?.adaptiveCoach;

  const semanticReady =
    result.sessionMode !== "topic"
    && result.sessionMode !== "insufficient"
    && (result.words || 0) >= 40
    && (result.keyConcepts?.length || 0) >= 3
    && [result.lightSummary, result.mediumSummary, result.proSummary]
      .some((part) => countStudyWords(String(part || "")) >= 8);

  const guardedQuiz = semanticReady ? safeQuiz : [];
  const guardedFlashcards = semanticReady ? (flashcards.length ? flashcards : fallback?.flashcards || []) : [];
  const guardedTrueFalse = semanticReady ? safeTrueFalse : [];
  const guardedDifficultWords = semanticReady ? (difficultWords.length ? difficultWords : fallback?.difficultWords || []) : [];

  const sanitized: StudySessionResult = {
    ...result,
    title: sanitizeStudyOutput(result.title, fallback?.title || "Sessione Studio"),
    detectedSubject: sanitizeStudyOutput(result.detectedSubject, fallback?.detectedSubject || "Materiale di studio"),
    subjectLabel: sanitizeStudyOutput(result.subjectLabel, fallback?.subjectLabel || "Materiale di studio"),
    studyMode: sanitizeStudyOutput(result.studyMode, fallback?.studyMode || "Studio guidato"),
    lightSummary: sanitizeStudyOutput(result.lightSummary, fallback?.lightSummary),
    mediumSummary: sanitizeStudyOutput(result.mediumSummary, fallback?.mediumSummary),
    proSummary: sanitizeStudyOutput(result.proSummary, fallback?.proSummary),
    studyNotesPro: sanitizeStudyOutput(result.studyNotesPro, fallback?.studyNotesPro),
    summaries: Object.fromEntries(
      Object.entries(result.summaries || {}).map(([key, value]) => [key, sanitizeStudyOutput(value, fallback?.summaries?.[key as StudySummaryMode])]),
    ) as Record<StudySummaryMode, string>,
    keyConcepts: Array.from(new Set((result.keyConcepts || []).map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 18),
    openQuestions: safeOpenQuestions,
    difficultWords: guardedDifficultWords,
    flashcards: guardedFlashcards,
    quiz: guardedQuiz,
    trueFalse: guardedTrueFalse,
    learningPackage,
    knowledgeMap,
    adaptiveCoach: adaptiveCoach
      ? {
          currentLevel: adaptiveCoach.currentLevel === "base" || adaptiveCoach.currentLevel === "exam_ready" ? adaptiveCoach.currentLevel : "in_progress",
          nextAction: sanitizeStudyOutput(adaptiveCoach.nextAction, "Completa quiz e interrogazione per aggiornare il percorso."),
          gaps: Array.from(new Set((adaptiveCoach.gaps || []).map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 6),
          strengths: Array.from(new Set((adaptiveCoach.strengths || []).map((item) => sanitizeStudyOutput(item, "")).filter(Boolean))).slice(0, 6),
          estimatedPassProbability: Math.max(0, Math.min(100, Math.round(Number(adaptiveCoach.estimatedPassProbability) || 0))),
          knowledgeMap: knowledgeMap.length ? knowledgeMap : adaptiveCoach.knowledgeMap || [],
        }
      : undefined,
  };

  return {
    ...sanitized,
    qualityScores: scoreStudySessionQuality(sanitized),
  };
}

export function getStudyImportCapabilities(
  browserOcrAvailable = typeof (globalThis as any).TextDetector === "function",
  clientOcrAvailable = true,
): StudyImportCapability[] {
  const imageStatus: StudyImportCapability["status"] = browserOcrAvailable || clientOcrAvailable ? "READY" : "FALLBACK";
  const imageEvidence = browserOcrAvailable
    ? "Browser TextDetector disponibile: OCR reale attivabile."
    : clientOcrAvailable
      ? "TextDetector non disponibile: OCR client-side lazy con Tesseract.js attivabile solo quando serve."
      : "OCR automatico non disponibile: resta il fallback umano senza simulare letture.";

  return [
    { id: "pdf", label: "PDF", status: "READY", evidence: "pdfjs legge PDF con testo selezionabile." },
    { id: "docx", label: "DOCX", status: "READY", evidence: "JSZip estrae word/document.xml." },
    { id: "txt", label: "TXT", status: "READY", evidence: "Lettura testuale nativa." },
    { id: "md", label: "MD", status: "READY", evidence: "Markdown trattato come testo strutturato." },
    { id: "epub", label: "EPUB", status: "READY", evidence: "JSZip estrae capitoli HTML/XHTML reali." },
    {
      id: "image",
      label: "Immagini/OCR",
      status: imageStatus,
      evidence: imageEvidence,
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

export function isStudyEducationalContentType(contentType: StudyContentType): boolean {
  return [
    "study_notes",
    "textbook",
    "scientific_material",
    "math_material",
    "historical_material",
    "essay",
    "legal_document",
    "mixed_or_unknown",
  ].includes(contentType);
}

export function analyzeStudyMaterial(
  text: string,
  sourceName = "materiale-studio.txt",
  intent: StudyIntentSettings = {},
): StudySessionResult {
  const clean = cleanText(text);
  const inputKind = classifyStudyInput(clean);
  if (inputKind.kind === "topic_only") {
    return buildTopicModeSession(clean, sourceName, intent);
  }
  if (inputKind.kind === "insufficient") {
    return buildInsufficientStudySession(clean, sourceName, intent, inputKind.wordCount);
  }

  const manual = normalizeStudyIntent(intent);
  const classification = classifyStudyMaterial(clean, sourceName, manual);
  const educationalProfile =
    isStudyEducationalContentType(classification.contentType)
    || manual.studyMaterialType === "book_manual"
    || manual.studyMaterialType === "university_handout"
    || manual.studyMaterialType === "school_notes"
    || manual.studyMaterialType === "pdf_document"
    || manual.studyMaterialType === "essay_theme";
  const narrativeMode = !educationalProfile
    && (classification.contentType === "narrative_fiction" || detectNarrative(clean));
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

  const difficultWords = buildProfessionalVocabulary(clean, words);
  const flashcards = buildProfessionalFlashcards(keyConcepts, classification, manual.difficultyLevel);
  const quiz = narrativeMode ? buildNarrativeQuiz(clean, title) : buildProgressiveQuiz(keyConcepts, classification, manual.difficultyLevel);
  const fallbackOpenQuestions = buildOpenQuestions(title, keyConcepts, narrativeMode, clean);
  const openQuestions = sanitizeStudyOpenQuestions(fallbackOpenQuestions, fallbackOpenQuestions);
  const trueFalse = buildTrueFalseQuiz(keyConcepts);
  const learningPackage = buildLearningPackage({
    summaries,
    keyConcepts,
    difficultWords,
    openQuestions,
    quiz,
    classification,
  });
  const knowledgeMap = buildInitialKnowledgeMap(keyConcepts, classification, manual.difficultyLevel);
  const adaptiveCoach = buildInitialAdaptiveCoach(knowledgeMap, learningPackage, classification);
  const studyNotesPro = [
    buildStudyNotesPro(title, keyConcepts, pro.length ? pro : medium),
    "",
    "5. Errori comuni",
    ...learningPackage.commonMistakes.slice(0, 6).map((item) => `• ${item}`),
    "",
    "6. Possibili domande d'esame",
    ...learningPackage.examQuestions.slice(0, 6).map((item) => `• ${item}`),
    "",
    "7. Date/nomi/formule/definizioni",
    `• ${buildEvidenceInventory(clean)}`,
  ].join("\n");

  const result: StudySessionResult = {
    title,
    sourceName,
    words,
    contentType: classification.contentType,
    subjectLabel: classification.subjectLabel,
    studyMode: classification.mode,
    detectedSubject: classification.subjectLabel || classification.label || keyConcepts.slice(0, 4).join(" · ") || title,
    difficulty: difficultyFromLevel(manual.difficultyLevel) || (classification.difficultyScore >= 8 || words > 4500 ? "pro" : classification.difficultyScore >= 5 || words > 1500 ? "medium" : "soft"),
    sessionMode: "full",
    classification,
    summaries,
    lightSummary: summaries.brief || paragraph("Riassunto leggero", light.length ? light : ["Il testo è breve: parti dai concetti principali e riscrivili con parole tue."]),
    mediumSummary: summaries.complete || paragraph("Riassunto medio", medium.length ? medium : light),
    proSummary: summaries.university || paragraph("Riassunto Pro", pro.length ? pro : medium),
    studyNotesPro,
    difficultWords,
    flashcards,
    openQuestions,
    quiz,
    trueFalse,
    exercises: buildExercises(keyConcepts, classification),
    conceptMap: buildConceptMap(title, keyConcepts, pro.length ? pro : medium, classification),
    learningPackage,
    knowledgeMap,
    adaptiveCoach,
    keyConcepts,
    studyMaterialType: manual.studyMaterialType,
    studySubject: manual.studySubject,
    literaryGenre: manual.literaryGenre,
    studyGoal: manual.studyGoal,
    difficultyLevel: manual.difficultyLevel,
  };
  return sanitizeStudySessionResult(result);
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
  const MAX_CHUNKS = 120;
  const MAX_CHARS = 120_000;

  const normalizeZipPath = (value: string) => value.replace(/\\/g, "/").replace(/^\/+/, "");
  const dirname = (value: string) => {
    const clean = normalizeZipPath(value);
    const index = clean.lastIndexOf("/");
    return index >= 0 ? clean.slice(0, index) : "";
  };
  const joinZipPath = (base: string, href: string) => {
    const cleanHref = normalizeZipPath(href);
    if (!base) return cleanHref;
    const parts = `${base}/${cleanHref}`.split("/");
    const resolved: string[] = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") resolved.pop();
      else resolved.push(part);
    }
    return resolved.join("/");
  };
  const isHtmlName = (name: string) => /\.(xhtml|html|htm)$/i.test(name);
  const isPackageName = (name: string) => /\.opf$/i.test(name);
  const isStructuralName = (name: string) =>
    /(^|\/)(nav|toc|cover|titlepage|copyright|colophon|imprint)\.(xhtml|html|htm)$/i.test(name);

  const getZipEntry = (name: string) => {
    const clean = normalizeZipPath(name);
    return zip.file(clean) || Object.values(zip.files).find((entry) => normalizeZipPath(entry.name) === clean) || null;
  };

  const readZipText = async (name: string): Promise<string | null> => {
    const entry = getZipEntry(name);
    if (!entry || entry.dir) return null;
    return entry.async("text");
  };

  const parseXml = (raw: string) => new DOMParser().parseFromString(raw, "application/xml");

  const extractHtmlText = (raw: string): string => {
    const withoutXmlNoise = raw
      .replace(/<\?xml[\s\S]*?\?>/gi, " ")
      .replace(/<!DOCTYPE[\s\S]*?>/gi, " ");

    const htmlDoc = new DOMParser().parseFromString(withoutXmlNoise, "text/html");
    const xmlDoc = new DOMParser().parseFromString(withoutXmlNoise, "application/xhtml+xml");

    const cleanDocument = (doc: Document) => {
      doc.querySelectorAll("script, style, nav, svg, noscript, head, title, meta, link").forEach((node) => node.remove());
      doc.querySelectorAll("h1, h2, h3, h4, h5, h6, p, div, section, article, li, br").forEach((node) => {
        node.appendChild(doc.createTextNode("\n\n"));
      });
      const bodyText = doc.body?.textContent || "";
      const fallbackText = doc.documentElement?.textContent || "";
      return bodyText || fallbackText;
    };

    const candidate = cleanDocument(htmlDoc) || cleanDocument(xmlDoc) || withoutXmlNoise;

    return candidate
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<head[\s\S]*?<\/head>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|li)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/\s*✦\s*/g, "\n\n✦ ")
      .replace(/([.!?])([A-Z][a-z])/g, "$1\n\n$2")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/^\s+|\s+$/g, "");
  };

  const extractFromEntries = async (entries: NonNullable<ReturnType<typeof getZipEntry>>[]) => {
    const chunks: string[] = [];
    let totalChars = 0;

    for (const entry of entries) {
      if (!entry || entry.dir || !isHtmlName(entry.name) || isStructuralName(entry.name)) continue;
      const raw = await entry.async("text");
      const text = extractHtmlText(raw);
      if (countStudyWords(text) < 10) continue;

      const remaining = MAX_CHARS - totalChars;
      if (remaining <= 0 || chunks.length >= MAX_CHUNKS) break;

      const next = text.length > remaining ? text.slice(0, remaining).trim() : text;
      if (next) {
        const signature = next.slice(0, 240).toLowerCase().replace(/\s+/g, " ");
        const alreadySeen = chunks.some((chunk) => chunk.slice(0, 240).toLowerCase().replace(/\s+/g, " ") === signature);
        if (!alreadySeen) {
          chunks.push(next);
          totalChars += next.length;
        }
      }
    }

    return chunks;
  };

  let opfPath = "";
  const containerXml = await readZipText("META-INF/container.xml");
  if (containerXml) {
    const containerDoc = parseXml(containerXml);
    const rootfile = Array.from(containerDoc.getElementsByTagName("rootfile"))[0];
    opfPath = normalizeZipPath(rootfile?.getAttribute("full-path") || "");
  }

  if (!opfPath) {
    opfPath = normalizeZipPath(
      Object.values(zip.files).find((entry) => !entry.dir && isPackageName(entry.name))?.name || ""
    );
  }

  let orderedEntries: NonNullable<ReturnType<typeof getZipEntry>>[] = [];

  if (opfPath) {
    const opfRaw = await readZipText(opfPath);
    if (opfRaw) {
      const opfDoc = parseXml(opfRaw);
      const opfBase = dirname(opfPath);
      const manifest = new Map<string, { href: string; mediaType: string; properties: string }>();

      Array.from(opfDoc.getElementsByTagName("item")).forEach((item) => {
        const id = item.getAttribute("id") || "";
        const href = item.getAttribute("href") || "";
        if (!id || !href) return;
        manifest.set(id, {
          href,
          mediaType: item.getAttribute("media-type") || "",
          properties: item.getAttribute("properties") || "",
        });
      });

      const spineIds = Array.from(opfDoc.getElementsByTagName("itemref"))
        .map((item) => item.getAttribute("idref") || "")
        .filter(Boolean);

      const spinePaths = spineIds
        .map((id) => manifest.get(id))
        .filter((item): item is { href: string; mediaType: string; properties: string } => Boolean(item))
        .filter((item) => {
          const href = item.href.toLowerCase();
          const media = item.mediaType.toLowerCase();
          return isHtmlName(href) || /xhtml|html/.test(media);
        })
        .map((item) => joinZipPath(opfBase, item.href));

      orderedEntries = spinePaths
        .map(getZipEntry)
        .filter((entry): entry is NonNullable<ReturnType<typeof getZipEntry>> => Boolean(entry && !entry.dir));

      if (!orderedEntries.length) {
        orderedEntries = Array.from(manifest.values())
          .filter((item) => {
            const href = item.href.toLowerCase();
            const media = item.mediaType.toLowerCase();
            return isHtmlName(href) || /xhtml|html/.test(media);
          })
          .map((item) => getZipEntry(joinZipPath(opfBase, item.href)))
          .filter((entry): entry is NonNullable<ReturnType<typeof getZipEntry>> => Boolean(entry && !entry.dir));
      }
    }
  }

  let chunks = await extractFromEntries(orderedEntries);

  if (countStudyWords(chunks.join(" ")) < 30) {
    const fallbackEntries = Object.values(zip.files)
      .filter((entry) => !entry.dir && isHtmlName(entry.name))
      .sort((a, b) => a.name.localeCompare(b.name));

    chunks = await extractFromEntries(fallbackEntries);
  }

  const fullText = chunks.join("\n\n").trim();
  if (!fullText) {
    throw new Error("EPUB letto ma non contiene testo estraibile. Potrebbe essere protetto, vuoto o composto da immagini.");
  }

  return fullText;
}

function isHeicLikeImage(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || /image\/hei[cf]/i.test(file.type);
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return await new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

async function preprocessImageForOcr(file: File, options: StudyImageOcrOptions = {}): Promise<{ image: Blob | File; warnings: string[] }> {
  const warnings: string[] = [];

  if (isHeicLikeImage(file)) {
    if (typeof document !== "undefined" && typeof createImageBitmap === "function") {
      try {
        options.onStatus?.("preparing", "Converto foto HEIC per l'OCR...");
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
        try {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const context = canvas.getContext("2d");
          if (context) {
            context.drawImage(bitmap, 0, 0);
            const blob = await canvasToBlob(canvas);
            if (blob) {
              warnings.push("Foto HEIC convertita automaticamente per la lettura OCR.");
              return { image: blob, warnings };
            }
          }
        } finally {
          bitmap.close?.();
        }
      } catch {
        warnings.push(STUDY_IMAGE_UNSUPPORTED_FORMAT_COPY);
      }
    } else {
      warnings.push(STUDY_IMAGE_UNSUPPORTED_FORMAT_COPY);
    }
  }

  if (options.skipPreprocess || typeof document === "undefined" || typeof createImageBitmap !== "function") {
    return { image: file, warnings };
  }

  options.onStatus?.("preparing", "Sto preparando la foto...");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  } catch {
    return { image: file, warnings };
  }

  try {
    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return { image: file, warnings };

    context.drawImage(bitmap, 0, 0, width, height);

    try {
      const imageData = context.getImageData(0, 0, width, height);
      const data = imageData.data;
      const contrast = 1.2;
      const intercept = 128 * (1 - contrast);

      for (let index = 0; index < data.length; index += 4) {
        const gray = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
        const adjusted = Math.max(0, Math.min(255, gray * contrast + intercept));
        data[index] = adjusted;
        data[index + 1] = adjusted;
        data[index + 2] = adjusted;
      }

      context.putImageData(imageData, 0, 0);
    } catch {
      // Canvas preprocessing is best-effort: OCR still runs on the resized image.
    }

    const blob = await canvasToBlob(canvas);
    return { image: blob || file, warnings };
  } finally {
    bitmap.close?.();
  }
}

async function readImageWithBrowserOcr(image: Blob | File, options: StudyImageOcrOptions = {}): Promise<string> {
  const TextDetectorCtor = options.textDetectorCtor || (globalThis as any).TextDetector;
  if (typeof TextDetectorCtor !== "function") {
    throw new Error("OCR_BROWSER_UNAVAILABLE");
  }
  if (typeof createImageBitmap !== "function") {
    throw new Error("IMAGE_DECODE_UNAVAILABLE");
  }

  let bitmap: ImageBitmap;
  try {
    options.onStatus?.("browser-ocr", "Sto leggendo il testo dall'immagine...");
    bitmap = await createImageBitmap(image);
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

async function readImageWithTesseractOcr(image: Blob | File, options: StudyImageOcrOptions = {}): Promise<{ text: string; confidence?: number }> {
  options.onStatus?.("client-ocr", "Sto leggendo il testo dall'immagine...");

  if (options.tesseractRecognize) {
    const result = await options.tesseractRecognize(image);
    if (typeof result === "string") return { text: result };
    return { text: String(result.text || ""), confidence: result.confidence };
  }

  const tesseract = await import("tesseract.js") as any;
  const recognize = tesseract.recognize || tesseract.default?.recognize;
  if (typeof recognize !== "function") throw new Error("OCR_CLIENT_UNAVAILABLE");

  const result = await recognize(image, "ita+eng", {
    logger: (message: { status?: string; progress?: number }) => {
      if (import.meta.env.DEV && import.meta.env.VITE_SCRIPTORA_DEV_MODE === "true" && message.status) {
        console.debug("[Study OCR]", message.status, typeof message.progress === "number" ? Math.round(message.progress * 100) : "");
      }
    },
  });

  return {
    text: String(result?.data?.text || ""),
    confidence: typeof result?.data?.confidence === "number" ? result.data.confidence : undefined,
  };
}

export async function readImageWithSmartOcr(file: File, options: StudyImageOcrOptions = {}): Promise<StudyImageOcrResult> {
  const warnings: string[] = [STUDY_IMAGE_OCR_HINT];
  const prepared = await preprocessImageForOcr(file, options);
  warnings.push(...prepared.warnings);

  try {
    const browserText = cleanText(await readImageWithBrowserOcr(prepared.image, options));
    if (countStudyWords(browserText) > 0) {
      const words = countStudyWords(browserText);
      warnings.push(words >= 40 ? STUDY_IMAGE_OCR_SUCCESS_COPY : STUDY_IMAGE_OCR_PARTIAL_COPY);
      return {
        text: browserText,
        engine: "text-detector",
        warnings,
        empty: false,
      };
    }
  } catch (error) {
    if (import.meta.env.DEV) devOnlyStudyOcrDiagnostic("browser", error);
  }

  try {
    const clientResult = await readImageWithTesseractOcr(prepared.image, options);
    const clientText = cleanText(clientResult.text);
    if (countStudyWords(clientText) > 0) {
      const words = countStudyWords(clientText);
      warnings.push(words >= 40 ? STUDY_IMAGE_OCR_SUCCESS_COPY : STUDY_IMAGE_OCR_PARTIAL_COPY);
      return {
        text: clientText,
        engine: "tesseract",
        warnings,
        empty: false,
        confidence: clientResult.confidence,
      };
    }
  } catch (error) {
    if (import.meta.env.DEV) devOnlyStudyOcrDiagnostic("client", error);
  }

  options.onStatus?.("fallback", STUDY_IMAGE_OCR_FALLBACK_COPY);
  warnings.push(STUDY_IMAGE_OCR_FALLBACK_COPY);
  return {
    text: "",
    engine: "manual",
    warnings,
    empty: true,
  };
}

function devOnlyStudyOcrDiagnostic(stage: "browser" | "client", error: unknown) {
  if (import.meta.env.VITE_SCRIPTORA_DEV_MODE !== "true") return;
  console.debug(`[Study OCR] ${stage} OCR failed`, error);
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
    if (import.meta.env.DEV && import.meta.env.VITE_SCRIPTORA_DEV_MODE === "true") {
      console.error("[StudySession PDF]", error);
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : "Impossibile leggere il PDF."
    );
  }
}

async function readScannedPdfWithOcr(file: File, options: StudyImageOcrOptions = {}): Promise<{ text: string; warnings: string[] }> {
  if (typeof document === "undefined") {
    throw new Error("Questo PDF sembra una scansione. Puoi caricare le pagine come immagini o incollare il testo.");
  }

  const pdfjsLib = await loadPdfJs();
  const arrayBuffer = await readBlobArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const warnings = ["Questo PDF sembra una scansione. Provo a leggerlo come immagine."];
  const chunks: string[] = [];
  const pagesToScan = Math.min(pdf.numPages, 6);

  for (let pageNumber = 1; pageNumber <= pagesToScan; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext("2d");
    if (!context) continue;

    await page.render({ canvasContext: context, viewport }).promise;
    const blob = await canvasToBlob(canvas);
    if (!blob) continue;

    const image = new File([blob], `${file.name}-pagina-${pageNumber}.png`, { type: "image/png" });
    const ocr = await readImageWithSmartOcr(image, options);
    warnings.push(...ocr.warnings);
    if (countStudyWords(ocr.text) > 0) {
      chunks.push(`Pagina ${pageNumber}\n\n${ocr.text}`);
    }
  }

  if (pdf.numPages > pagesToScan) {
    warnings.push(`Ho analizzato le prime ${pagesToScan} pagine scannerizzate per evitare un OCR troppo pesante nel browser.`);
  }

  const text = chunks.join("\n\n").trim();
  if (!text) {
    throw new Error("Questo PDF sembra una scansione. Non sono riuscito a leggerlo automaticamente: puoi caricare immagini piu' nitide o incollare il testo.");
  }

  return { text, warnings };
}

export async function readStudyFile(file: File, options: StudyFileReadOptions = {}): Promise<string> {
  return (await readStudyFileDetailed(file, options)).text;
}

export async function readStudyFileDetailed(file: File, options: StudyFileReadOptions = {}): Promise<StudyFileReadResult> {
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
    try {
      text = await readPdf(file);
    } catch (error) {
      if (!/scansione|selezionabile/i.test(error instanceof Error ? error.message : String(error))) {
        throw error;
      }
      const scanned = await readScannedPdfWithOcr(file, options.imageOcr);
      text = scanned.text;
      warnings.push(...scanned.warnings);
    }
  } else if (name.endsWith(".epub")) {
    sourceType = "epub";
    text = await readEpub(file);
  } else if (/\.(png|jpe?g|webp|heic|heif)$/i.test(name) || file.type.startsWith("image/")) {
    sourceType = "image";
    const ocr = await readImageWithSmartOcr(file, options.imageOcr);
    text = ocr.text;
    warnings.push(...ocr.warnings);
    if (!ocr.empty) {
      warnings.push(
        ocr.engine === "text-detector"
          ? "Testo estratto via OCR browser: verifica eventuali errori di riconoscimento."
          : "Testo estratto via OCR client-side: verifica eventuali errori di riconoscimento.",
      );
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

export async function readStudyFiles(files: File[], options: StudyFileReadOptions = {}): Promise<StudyFileReadResult> {
  if (!files.length) throw new Error("Nessun file selezionato.");
  const results: StudyFileReadResult[] = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      results.push(await readStudyFileDetailed(file, options));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : `${file.name}: errore lettura.`);
    }
  }

  const readable = results.filter((result) => countStudyWords(result.text) > 0);
  const imageResults = results.filter((result) => result.sourceType === "image");
  const allImages = results.length > 0 && results.every((result) => result.sourceType === "image");

  if (!readable.length) {
    if (imageResults.length) {
      return {
        fileName: imageResults.length === 1 ? imageResults[0].fileName : `${imageResults.length} immagini acquisite`,
        sourceType: "image",
        text: "",
        warnings: [...imageResults.flatMap((result) => result.warnings), ...errors],
        empty: true,
      };
    }
    throw new Error(errors.join(" ") || "Nessun testo leggibile nei file selezionati.");
  }

  const combined = allImages
    ? readable
        .map((result, index) => `Pagina ${index + 1}\n\n${result.text}`)
        .join("\n\n")
    : readable
        .map((result, index) => `=== MATERIALE ${index + 1}: ${result.fileName} ===\n\n${result.text}`)
        .join("\n\n");

  return {
    fileName: allImages
      ? readable.length === 1 ? readable[0].fileName : `${readable.length} pagine acquisite`
      : readable.length === 1 ? readable[0].fileName : `${readable.length} materiali uniti`,
    sourceType: allImages ? "image" : readable.length === 1 ? readable[0].sourceType : "txt",
    text: combined,
    warnings: [...readable.flatMap((result) => result.warnings), ...errors],
    empty: false,
  };
}
