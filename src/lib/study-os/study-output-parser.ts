import type { StudySessionResult } from "@/lib/study-session";
import { enrichStudySessionLocally } from "./study-analysis";
import { containsStudyLeak, sanitizeStudyOsOutput } from "./study-quality";
import type {
  StudyExplanationPack,
  StudyGoal,
  StudyLevel,
  StudyMaterialAnalysis,
  StudyOsSessionResult,
  StudyPlanPack,
  StudySummaryPack,
} from "./study-types";

function normalizeString(value: unknown, fallback = ""): string {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value.filter(Boolean) as T[]) : [];
}

function sanitizeField(value: string, language: string): string {
  return sanitizeStudyOsOutput(value, language).text;
}

function normalizeMaterialAnalysis(parsed: any, fallback: StudyMaterialAnalysis): StudyMaterialAnalysis {
  const raw = parsed?.materialAnalysis || {};
  const level = raw.detectedLevel === "middle_school" || raw.detectedLevel === "university"
    ? raw.detectedLevel
    : "high_school";
  const mode = raw.recommendedMode as StudyGoal;
  const recommendedMode: StudyGoal =
    mode === "interrogation" || mode === "quiz" || mode === "summary" || mode === "quick_review"
      ? mode
      : "exam";

  return {
    detectedSubject: normalizeString(raw.detectedSubject || parsed?.detectedSubject, fallback.detectedSubject),
    detectedLevel: level,
    mainTopics: normalizeArray<string>(raw.mainTopics).slice(0, 12).map((t) => normalizeString(t)).filter(Boolean),
    keyTerms: normalizeArray<string>(raw.keyTerms).slice(0, 16).map((t) => normalizeString(t)).filter(Boolean),
    difficulty: fallback.difficulty,
    estimatedStudyTimeMinutes: Math.max(15, Number(raw.estimatedStudyTimeMinutes) || fallback.estimatedStudyTimeMinutes),
    prerequisites: normalizeArray<string>(raw.prerequisites).slice(0, 6),
    weakPoints: normalizeArray<string>(raw.weakPoints).slice(0, 6),
    confusionRisks: normalizeArray<string>(raw.confusionRisks).slice(0, 6),
    recommendedMode: recommendedMode,
  };
}

function normalizeStudyPlan(parsed: any, fallback?: StudyPlanPack): StudyPlanPack | undefined {
  const raw = parsed?.studyPlan;
  if (!raw && !fallback) return undefined;
  const priorityOrder = normalizeArray<any>(raw?.priorityOrder).slice(0, 8).map((item) => ({
    title: normalizeString(item?.title, "Attività"),
    priority: item?.priority === "low" || item?.priority === "medium" ? item.priority : "high",
    minutes: Math.max(5, Number(item?.minutes) || 10),
    action: normalizeString(item?.action, "Completa l'attività indicata."),
  }));

  return {
    priorityOrder: priorityOrder.length ? priorityOrder : fallback?.priorityOrder || [],
    dailyPlan: normalizeArray<string>(raw?.dailyPlan).slice(0, 5),
    activeRecallTasks: normalizeArray<string>(raw?.activeRecallTasks).slice(0, 6),
    revisionSchedule: normalizeArray<string>(raw?.revisionSchedule).slice(0, 5),
    examStrategy: normalizeArray<string>(raw?.examStrategy).slice(0, 5),
  };
}

export function parseStudyOsAiResponse(
  parsed: any,
  fallback: StudyOsSessionResult,
  language = "Italian",
): StudyOsSessionResult {
  const materialAnalysis = normalizeMaterialAnalysis(parsed, fallback.materialAnalysis!);

  const difficultWords = normalizeArray<any>(parsed?.difficultWords).slice(0, 14).map((item) => ({
    word: sanitizeField(normalizeString(item?.word, "Termine"), language),
    simple: sanitizeField(normalizeString(item?.simple, "Spiegazione semplice non disponibile."), language),
    technical: sanitizeField(normalizeString(item?.technical, "Spiegazione tecnica non disponibile."), language),
    example: sanitizeField(normalizeString(item?.example, "Prova a usare questo termine in una frase tua."), language),
  }));

  const flashcards = normalizeArray<any>(parsed?.flashcards).slice(0, 16).map((item) => ({
    front: sanitizeField(normalizeString(item?.front, "Domanda"), language),
    back: sanitizeField(normalizeString(item?.back, "Risposta"), language),
    difficulty: item?.difficulty === "easy" || item?.difficulty === "hard" ? item.difficulty : "medium",
  }));

  const openQuestions = normalizeArray<any>(parsed?.openQuestions).slice(0, 12).map((item) => ({
    question: sanitizeField(normalizeString(item?.question, "Domanda aperta"), language),
    answerGuide: sanitizeField(normalizeString(item?.answerGuide, "Rispondi definendo, spiegando e collegando al tema."), language),
  }));

  const quiz = normalizeArray<any>(parsed?.quiz).slice(0, 14).map((item) => {
    const options = normalizeArray<string>(item?.options).map((o) => sanitizeField(String(o || "").trim(), language)).filter(Boolean).slice(0, 4);
    const answer = Number.isFinite(Number(item?.answer)) ? Number(item.answer) : 0;
    return {
      question: sanitizeField(normalizeString(item?.question, "Domanda di verifica"), language),
      options: options.length === 4 ? options : ["Opzione A", "Opzione B", "Opzione C", "Opzione D"],
      answer: Math.max(0, Math.min(3, answer)),
      explanation: sanitizeField(normalizeString(item?.explanation, "Rileggi il concetto nel riassunto."), language),
      difficulty: item?.difficulty === "easy" || item?.difficulty === "hard" ? item.difficulty : "medium",
      memoryTrick: sanitizeField(normalizeString(item?.memoryTrick, ""), language),
      commonMistake: sanitizeField(normalizeString(item?.commonMistake, ""), language),
    };
  });

  const keyConcepts = normalizeArray<string>(parsed?.keyConcepts).map((item) => sanitizeField(String(item || "").trim(), language)).filter(Boolean).slice(0, 16);

  const explanationPack: StudyExplanationPack = {
    simpleExplanation: sanitizeField(normalizeString(parsed?.simpleExplanation, fallback.simpleExplanation || ""), language),
    examLevelExplanation: sanitizeField(normalizeString(parsed?.examLevelExplanation, fallback.examLevelExplanation || ""), language),
    advancedExplanation: sanitizeField(normalizeString(parsed?.advancedExplanation, fallback.advancedExplanation || ""), language),
    examples: normalizeArray<string>(parsed?.examples).slice(0, 5).map((e) => sanitizeField(e, language)),
    analogy: sanitizeField(normalizeString(parsed?.analogy, fallback.explanationPack?.analogy || ""), language),
    stepByStep: normalizeArray<string>(parsed?.stepByStep).slice(0, 8).map((s) => sanitizeField(s, language)),
  };

  const summaryPack: StudySummaryPack = {
    ultraShortSummary: sanitizeField(normalizeString(parsed?.lightSummary, fallback.lightSummary), language),
    standardSummary: sanitizeField(normalizeString(parsed?.mediumSummary, fallback.mediumSummary), language),
    detailedSummary: sanitizeField(normalizeString(parsed?.proSummary, fallback.proSummary), language),
    keyPoints: keyConcepts.length ? keyConcepts : fallback.keyConcepts,
    formulasOrDates: normalizeArray<string>(parsed?.formulasOrDates).slice(0, 12).map((f) => sanitizeField(f, language)),
    commonMistakes: normalizeArray<string>(parsed?.commonMistakes).slice(0, 8).map((m) => sanitizeField(m, language)),
    glossary: difficultWords.map((w) => ({ term: w.word, definition: w.simple })),
  };

  const result: StudyOsSessionResult = {
    ...fallback,
    title: sanitizeField(normalizeString(parsed?.title, fallback.title), language),
    detectedSubject: sanitizeField(normalizeString(parsed?.detectedSubject, fallback.detectedSubject), language),
    difficulty: parsed?.difficulty === "soft" || parsed?.difficulty === "pro" ? parsed.difficulty : fallback.difficulty,
    lightSummary: summaryPack.ultraShortSummary,
    mediumSummary: summaryPack.standardSummary,
    proSummary: summaryPack.detailedSummary,
    studyNotesPro: sanitizeField(normalizeString(parsed?.studyNotesPro, fallback.studyNotesPro), language),
    openQuestions: openQuestions.length ? openQuestions : fallback.openQuestions,
    difficultWords: difficultWords.length ? difficultWords : fallback.difficultWords,
    flashcards: flashcards.length ? flashcards : fallback.flashcards,
    quiz: quiz.length ? quiz : fallback.quiz,
    keyConcepts: keyConcepts.length ? keyConcepts : fallback.keyConcepts,
    materialAnalysis,
    summaryPack,
    explanationPack,
    simpleExplanation: explanationPack.simpleExplanation,
    examLevelExplanation: explanationPack.examLevelExplanation,
    advancedExplanation: explanationPack.advancedExplanation,
    conceptMap: sanitizeField(normalizeString(parsed?.conceptMap, fallback.conceptMap || ""), language),
    studyPlan: normalizeStudyPlan(parsed, fallback.studyPlan),
    reviewChecklist: normalizeArray<string>(parsed?.reviewChecklist).slice(0, 10).map((c) => sanitizeField(c, language)),
  };

  const leakFields = [
    result.lightSummary,
    result.simpleExplanation || "",
    result.conceptMap || "",
    result.studyNotesPro,
  ];
  if (leakFields.some(containsStudyLeak)) {
    const reSanitized = { ...result };
    for (const key of ["lightSummary", "mediumSummary", "proSummary", "simpleExplanation", "conceptMap", "studyNotesPro"] as const) {
      if (reSanitized[key]) reSanitized[key] = sanitizeStudyOsOutput(String(reSanitized[key]), language).text;
    }
    return reSanitized;
  }

  return result;
}

export function buildStudyOsFallback(text: string, sourceName: string, goal: StudyGoal = "exam"): StudyOsSessionResult {
  return enrichStudySessionLocally(text, sourceName, goal);
}

/** Bridge legacy StudySessionResult normalizer */
export function ensureStudyOsFields(
  result: StudySessionResult,
  rawText: string,
  goal: StudyGoal = "exam",
): StudyOsSessionResult {
  const extended = result as StudyOsSessionResult;
  if (extended.materialAnalysis && extended.studyPlan && extended.conceptMap) return extended;
  const enriched = enrichStudySessionLocally(rawText, result.sourceName || "materiale", goal);
  return { ...enriched, ...result, materialAnalysis: extended.materialAnalysis || enriched.materialAnalysis, studyPlan: extended.studyPlan || enriched.studyPlan, conceptMap: extended.conceptMap || enriched.conceptMap, explanationPack: extended.explanationPack || enriched.explanationPack };
}
