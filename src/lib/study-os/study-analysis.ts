import { analyzeStudyMaterial, type StudySessionResult } from "@/lib/study-session";
import type {
  StudyExplanationPack,
  StudyGoal,
  StudyLevel,
  StudyMaterialAnalysis,
  StudyOsSessionResult,
  StudyPlanPack,
  StudySummaryPack,
} from "./study-types";

const SUBJECT_HINTS: Array<{ pattern: RegExp; subject: string; level: StudyLevel }> = [
  { pattern: /\b(rivoluzione francese|bastiglia|napoleone|1789|diritti dell'uomo)\b/i, subject: "Storia", level: "high_school" },
  { pattern: /\b(fotosintesi|clorofilla|cloroplasto|glucosio|anidride carbonica)\b/i, subject: "Biologia", level: "high_school" },
  { pattern: /\b(costituzione|articolo|parlamento|repubblica|diritti fondamentali)\b/i, subject: "Diritto / Educazione civica", level: "high_school" },
  { pattern: /\b(memoria|apprendimento|cognitiv|psicolog|letteratur|analisi del testo)\b/i, subject: "Università", level: "university" },
];

function detectStudyLevel(text: string, words: number): StudyLevel {
  const hint = SUBJECT_HINTS.find((entry) => entry.pattern.test(text));
  if (hint) return hint.level;
  if (words > 2500 || /\b(tesi|metodologia|ipotesi|bibliografia)\b/i.test(text)) return "university";
  if (words > 900 || /\b(esame|interrogazione|capitolo|paragrafo)\b/i.test(text)) return "high_school";
  return "middle_school";
}

function detectSubject(text: string, fallback: string): string {
  const hint = SUBJECT_HINTS.find((entry) => entry.pattern.test(text));
  return hint?.subject || fallback;
}

function buildConceptMap(topics: string[], keyTerms: string[]): string {
  if (!topics.length) return "Tema centrale\n  └─ Concetti da definire\n  └─ Cause → Effetti\n  └─ Esempi concreti";
  const lines = [`${topics[0] || "Materiale"}`];
  topics.slice(1, 5).forEach((topic, index) => {
    lines.push(`${"  ".repeat(index + 1)}├─ ${topic}`);
  });
  if (keyTerms.length) {
    lines.push("  └─ Termini chiave: " + keyTerms.slice(0, 6).join(", "));
  }
  return lines.join("\n");
}

function buildLocalStudyPlan(goal: StudyGoal, minutes: number): StudyPlanPack {
  const base: StudyPlanItemLike[] = [
    { title: "Lettura attiva", priority: "high", minutes: Math.max(8, Math.round(minutes * 0.2)), action: "Leggi il riassunto medio evidenziando cause, date e concetti." },
    { title: "Flashcard", priority: "high", minutes: Math.max(10, Math.round(minutes * 0.25)), action: "Ripassa 10 flashcard senza guardare le risposte." },
    { title: "Quiz", priority: "medium", minutes: Math.max(10, Math.round(minutes * 0.25)), action: "Completa il quiz e correggi ogni errore con spiegazione." },
    { title: "Interrogazione orale", priority: goal === "interrogation" ? "high" : "medium", minutes: Math.max(12, Math.round(minutes * 0.2)), action: "Rispondi a voce alle domande aperte." },
    { title: "Ripasso finale", priority: "low", minutes: Math.max(5, Math.round(minutes * 0.1)), action: "Rileggi errori comuni e checklist finale." },
  ];

  return {
    priorityOrder: base,
    dailyPlan: [
      "Giorno 1: comprensione (riassunto + schema)",
      "Giorno 2: memorizzazione attiva (flashcard + quiz)",
      "Giorno 3: simulazione (interrogazione + verifica)",
    ],
    activeRecallTasks: [
      "Chiudi gli appunti e riscrivi 5 concetti chiave",
      "Spiega il tema a voce in 2 minuti",
      "Rifai solo le domande sbagliate nel quiz",
    ],
    revisionSchedule: ["Ripasso a 24 ore", "Ripasso a 72 ore", "Verifica finale prima dell'esame"],
    examStrategy: goal === "exam"
      ? ["Parti dalle definizioni sicure", "Poi collega cause-effetti", "Chiudi con esempio concreto"]
      : ["Usa schema concettuale come base", "Alterna lettura e domande", "Non saltare le flashcard difficili"],
  };
}

type StudyPlanItemLike = StudyPlanPack["priorityOrder"][number];

export function buildLocalMaterialAnalysis(
  text: string,
  base: StudySessionResult,
  goal: StudyGoal = "exam",
): StudyMaterialAnalysis {
  const words = base.words;
  const level = detectStudyLevel(text, words);
  const subject = detectSubject(text, base.detectedSubject || base.title);
  const topics = base.keyConcepts.slice(0, 8);
  const keyTerms = base.difficultWords.map((w) => w.word).slice(0, 10);

  return {
    detectedSubject: subject,
    detectedLevel: level,
    mainTopics: topics.length ? topics : [subject],
    keyTerms,
    difficulty: base.difficulty,
    estimatedStudyTimeMinutes: Math.max(20, Math.round(words / 120 + base.quiz.length * 2)),
    prerequisites: level === "university"
      ? ["Conoscenze di base del corso", "Terminologia della disciplina"]
      : ["Comprensione del lessico scolastico", "Capacità di riassumere"],
    weakPoints: topics.length < 4
      ? ["Pochi concetti estratti — verifica che il testo sia completo"]
      : ["Collegamenti causa-effetto", "Definizioni precise", "Esempi applicativi"],
    confusionRisks: ["Confondere date e cause", "Memorizzare senza capire", "Saltare i termini tecnici"],
    recommendedMode: goal,
  };
}

export function buildLocalExplanationPack(text: string, base: StudySessionResult): StudyExplanationPack {
  const topic = base.keyConcepts[0] || base.title;
  return {
    simpleExplanation: `In parole semplici: il materiale parla di ${topic}. ${base.mediumSummary.split("\n").slice(0, 4).join(" ")}`,
    examLevelExplanation: base.proSummary || base.mediumSummary,
    advancedExplanation: base.studyNotesPro || base.proSummary,
    examples: base.difficultWords.slice(0, 3).map((w) => w.example).filter(Boolean),
    analogy: `Pensa a ${topic} come a un puzzle: ogni concetto è un pezzo che si collega agli altri.`,
    stepByStep: [
      "1. Identifica il tema centrale",
      "2. Definisci i concetti chiave",
      "3. Collega cause ed effetti",
      "4. Aggiungi un esempio concreto",
      "5. Verifica con quiz o interrogazione",
    ],
  };
}

export function buildLocalSummaryPack(base: StudySessionResult): StudySummaryPack {
  return {
    ultraShortSummary: base.lightSummary,
    standardSummary: base.mediumSummary,
    detailedSummary: base.proSummary,
    keyPoints: base.keyConcepts,
    formulasOrDates: [],
    commonMistakes: ["Confondere i concetti principali", "Ripetere senza spiegare con parole tue"],
    glossary: base.difficultWords.map((w) => ({ term: w.word, definition: w.simple })),
  };
}

export function enrichStudySessionLocally(
  text: string,
  sourceName: string,
  goal: StudyGoal = "exam",
): StudyOsSessionResult {
  const base = analyzeStudyMaterial(text, sourceName);
  const analysis = buildLocalMaterialAnalysis(text, base, goal);
  const explanationPack = buildLocalExplanationPack(text, base);
  const summaryPack = buildLocalSummaryPack(base);

  return {
    ...base,
    materialAnalysis: analysis,
    summaryPack,
    explanationPack,
    simpleExplanation: explanationPack.simpleExplanation,
    examLevelExplanation: explanationPack.examLevelExplanation,
    advancedExplanation: explanationPack.advancedExplanation,
    conceptMap: buildConceptMap(analysis.mainTopics, analysis.keyTerms),
    studyPlan: buildLocalStudyPlan(goal, analysis.estimatedStudyTimeMinutes),
    reviewChecklist: [
      "So definire i concetti chiave",
      "So spiegare cause e conseguenze",
      "Ho fatto almeno 10 flashcard",
      "Ho completato il quiz correggendo gli errori",
      "Ho simulato almeno 2 domande orali",
    ],
  };
}
