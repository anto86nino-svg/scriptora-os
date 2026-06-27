import type {
  DifficultWord,
  Flashcard,
  OpenStudyQuestion,
  QuizQuestion,
  StudyAdaptiveCoachSnapshot,
  StudyDifficulty,
  StudyKnowledgeArea,
  StudySessionResult,
} from "@/lib/study-session";

export const STUDY_UX_STORAGE_KEY = "scriptora-study-ux-v1";

export type QuizDifficulty = "easy" | "medium" | "hard";
export type FlashcardConfidence = "unknown" | "almost" | "known";
export type UserPerformanceLevel = "struggling" | "balanced" | "advanced";

export interface StudyUxState {
  activeSection:
    | "materials"
    | "summary"
    | "questions"
    | "vocabulary"
    | "flashcards"
    | "quiz"
    | "maps"
    | "exam"
    | "progress"
    | "certificates"
    | "coach";
  quizAnswers: Record<number, number>;
  currentQuizIndex: number;
  quizOrder: number[];
  quizMode: "practice" | "exam";
  examStartedAt: number | null;
  examTimeLimitSec: number | null;
  openAnswers: Record<number, string>;
  openEvaluations: Record<number, unknown>;
  currentOralIndex: number;
  oralFollowUpStep: Record<number, number>;
  flashcardFlipped: Record<number, boolean>;
  flashcardConfidence: Record<number, FlashcardConfidence>;
  currentFlashcardIndex: number;
  vocabularyEasier: Record<string, boolean>;
}

export const DEFAULT_STUDY_UX: StudyUxState = {
  activeSection: "summary",
  quizAnswers: {},
  currentQuizIndex: 0,
  quizOrder: [],
  quizMode: "practice",
  examStartedAt: null,
  examTimeLimitSec: null,
  openAnswers: {},
  openEvaluations: {},
  currentOralIndex: 0,
  oralFollowUpStep: {},
  flashcardFlipped: {},
  flashcardConfidence: {},
  currentFlashcardIndex: 0,
  vocabularyEasier: {},
};

export function loadStudyUxState(): Partial<StudyUxState> {
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDY_UX_STORAGE_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveStudyUxState(state: Partial<StudyUxState>) {
  try {
    const prev = loadStudyUxState();
    localStorage.setItem(STUDY_UX_STORAGE_KEY, JSON.stringify({ ...prev, ...state, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function clearStudyUxQuizState() {
  const prev = loadStudyUxState();
  saveStudyUxState({
    ...prev,
    quizAnswers: {},
    currentQuizIndex: 0,
    quizOrder: [],
    examStartedAt: null,
  });
}

/** Strip markdown artifacts — no raw ** or bullets leaking */
export function sanitizeStudyText(text: string): string {
  return String(text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Clean a single line for display — no orphan bullets or markdown */
export function cleanStudyLine(line: string): string {
  let clean = sanitizeStudyText(line.trim());
  clean = clean.replace(/^[\s•·\-–—*]+/, "");
  clean = clean.replace(/[\s•·\-–—*]+$/, "");
  clean = clean.replace(/^\d+[\.)]\s*/, "");
  clean = clean.replace(/\*+/g, "").trim();
  if (clean.length < 3) return "";
  if (/^[•·\-–—*\s]+$/.test(clean)) return "";
  if (/^(concetti da sapere|cosa ricordare|trappole|domanda|collegament|confusion|interrogazione|scheda studio)/i.test(clean) && clean.length < 40) {
    return "";
  }
  return clean;
}

export function cleanStudyLines(text: string): string[] {
  return sanitizeStudyText(text)
    .split("\n")
    .map(cleanStudyLine)
    .filter(Boolean);
}

export function computeUserPerformanceLevel(input: {
  quiz: QuizQuestion[];
  quizAnswers: Record<number, number>;
  openEvaluations: Record<number, { score?: number }>;
  flashcardConfidence: Record<number, FlashcardConfidence>;
}): UserPerformanceLevel {
  const scores: number[] = [];

  const answered = Object.keys(input.quizAnswers).length;
  if (answered > 0 && input.quiz.length) {
    const correct = input.quiz.filter((q, i) => input.quizAnswers[i] === q.answer).length;
    scores.push((correct / answered) * 100);
  }

  const oralScores = Object.values(input.openEvaluations)
    .map((e) => Number(e?.score))
    .filter((s) => Number.isFinite(s));
  if (oralScores.length) scores.push(oralScores.reduce((a, b) => a + b, 0) / oralScores.length);

  const conf = Object.values(input.flashcardConfidence);
  if (conf.length) {
    const known = conf.filter((c) => c === "known").length;
    const almost = conf.filter((c) => c === "almost").length;
    scores.push(((known + almost * 0.5) / conf.length) * 100);
  }

  if (!scores.length) return "balanced";
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg < 45) return "struggling";
  if (avg >= 72) return "advanced";
  return "balanced";
}

export function inferQuizDifficulty(q: QuizQuestion, performance?: UserPerformanceLevel): QuizDifficulty {
  let base: QuizDifficulty = "medium";
  if (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") {
    base = q.difficulty;
  } else {
    const text = `${q.question} ${q.explanation}`.toLowerCase();
    const hardSignals = /(interpreta|spiega perché|confronta|collega|implicazione|conseguenz|oral|argomenta|analizza|in che modo|perché)/i;
    const easySignals = /(definizione|significa|quale termine|cos'è|cosa è|identifica|che cosa)/i;
    if (hardSignals.test(text)) base = "hard";
    else if (easySignals.test(text)) base = "easy";
  }
  if (performance === "struggling" && base === "hard") return "medium";
  if (performance === "struggling" && base === "medium") return "easy";
  if (performance === "advanced" && base === "easy") return "medium";
  if (performance === "advanced" && base === "medium") return "hard";
  return base;
}

export function shuffleIndices(length: number, seed?: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  let s = seed ?? Date.now();
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickAdaptiveNextIndex(
  quiz: QuizQuestion[],
  order: number[],
  answers: Record<number, number>,
  currentIndex: number,
  performance?: UserPerformanceLevel
): number {
  const unanswered = order.filter((i) => answers[i] === undefined);
  if (unanswered.length === 0) return currentIndex;

  const recent = order
    .filter((i) => answers[i] !== undefined)
    .slice(-3)
    .map((i) => answers[i] === quiz[i]?.answer);
  const correctStreak = recent.filter(Boolean).length;
  const wrongStreak = recent.filter((v) => v === false).length;

  let target: QuizDifficulty = "medium";
  if (performance === "struggling" || wrongStreak >= 2) target = "easy";
  else if (performance === "advanced" || correctStreak >= 2) target = "hard";

  const candidates = unanswered.map((i) => ({
    index: i,
    diff: inferQuizDifficulty(quiz[i], performance),
    dist: Math.abs(order.indexOf(i) - order.indexOf(currentIndex)),
  }));

  const tierMatch = candidates.filter((c) => c.diff === target);
  const pool = tierMatch.length ? tierMatch : candidates;
  pool.sort((a, b) => a.dist - b.dist);
  return pool[0]?.index ?? unanswered[0];
}

export interface QuizPedagogicalFeedback {
  isCorrect: boolean;
  headline: string;
  why: string;
  remember: string;
  memoryTrick: string;
  commonConfusion: string;
  showHint: boolean;
}

export function buildQuizFeedback(
  q: QuizQuestion,
  selected: number,
  performance?: UserPerformanceLevel
): QuizPedagogicalFeedback {
  const isCorrect = selected === q.answer;
  const correctOption = q.options[q.answer] || "la risposta corretta";
  const wrongOption = q.options[selected] || "la tua scelta";

  const memoryTrick =
    q.memoryTrick?.trim() ||
    buildMemoryTrick(q.question, correctOption);

  const remember = `Collega il concetto a qualcosa che già conosci — ripetilo a voce alta.`;

  const commonConfusion =
    q.commonMistake?.trim() ||
    (isCorrect
      ? "Non confondere il concetto centrale con dettagli secondari del testo."
      : `"${wrongOption.slice(0, 70)}" sembra plausibile ma non è il punto chiave.`);

  const headline = isCorrect
    ? (performance === "advanced" ? "✅ Eccellente" : "✅ Corretto")
    : (performance === "struggling" ? "⚠ Riprova" : "❌ Quasi");

  if (isCorrect) {
    return {
      isCorrect: true,
      headline,
      why: sanitizeStudyText(q.explanation || `Esatto: ${correctOption}`),
      remember,
      memoryTrick,
      commonConfusion,
      showHint: performance === "struggling",
    };
  }

  return {
    isCorrect: false,
    headline,
    why: sanitizeStudyText(
      `"${wrongOption.slice(0, 90)}" non è la risposta migliore. ${q.explanation || `La risposta corretta è: ${correctOption}`}`
    ),
    remember,
    memoryTrick,
    commonConfusion,
    showHint: true,
  };
}

function buildMemoryTrick(question: string, answer: string): string {
  const q = question.toLowerCase();
  if (/causa|effetto|conseguenz/i.test(q)) {
    return "CAUSA → EFFETTO: prima il perché, poi cosa succede dopo.";
  }
  if (/confronta|differenz/i.test(q)) {
    return "Confronta con una tabella mentale: cosa hanno in comune vs cosa li distingue.";
  }
  const acronym = answer.split(/\s+/).slice(0, 3).map((w) => w[0]?.toUpperCase()).filter(Boolean).join("");
  if (acronym.length >= 2) {
    return `Mnemonico: ${acronym} = le parole chiave della risposta giusta.`;
  }
  return "🧠 Crea un'immagine mentale: collega la risposta a un esempio concreto della tua vita.";
}

export interface QuizPerformanceReport {
  score: number;
  grade10: number;
  grade30: number;
  judgement: string;
  confidence: "High" | "Medium" | "Low";
  strongAreas: string[];
  weakAreas: string[];
  errors: string[];
  strengths: string[];
  likelyOralQuestions: string[];
  suggestedNextStep: string;
  estimatedOral: "Low" | "Medium" | "High";
  reviewMinutes: number;
  passProbability: number;
  areasToReview: string[];
}

export function buildQuizPerformanceReport(
  quiz: QuizQuestion[],
  answers: Record<number, number>,
  keyConcepts: string[],
  openQuestions: OpenStudyQuestion[] = []
): QuizPerformanceReport {
  const total = quiz.length;
  const correctIndices = quiz.map((q, i) => (answers[i] === q.answer ? i : -1)).filter((i) => i >= 0);
  const wrongIndices = quiz.map((q, i) => (answers[i] !== undefined && answers[i] !== q.answer ? i : -1)).filter((i) => i >= 0);

  const score = total ? Math.round((correctIndices.length / total) * 100) : 0;
  const grade10 = Math.round((score / 10) * 10) / 10;
  const grade30 = Math.round((score / 100) * 30);
  const judgement =
    score >= 90 ? "Eccellente"
      : score >= 75 ? "Buono"
        : score >= 60 ? "Sufficiente"
          : score >= 45 ? "Fragile"
            : "Da recuperare";
  const confidence: QuizPerformanceReport["confidence"] = score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";

  const strongAreas = correctIndices.slice(0, 4).map((i) => sanitizeStudyText(quiz[i].question).slice(0, 80));
  const weakAreas = wrongIndices.slice(0, 4).map((i) => sanitizeStudyText(quiz[i].question).slice(0, 80));
  const errors = wrongIndices.slice(0, 6).map((i) => {
    const q = quiz[i];
    const selected = answers[i];
    return `${sanitizeStudyText(q.question).slice(0, 90)} — risposta data: ${q.options[selected] || "non valida"}; corretta: ${q.options[q.answer] || "non disponibile"}`;
  });
  const strengths = strongAreas.length ? strongAreas : keyConcepts.slice(0, 3).map(sanitizeStudyText);

  const likelyOralQuestions = [
    ...openQuestions.slice(0, 2).map((q) => sanitizeStudyText(q.question)),
    ...wrongIndices.slice(0, 2).map((i) => `Spiega: ${sanitizeStudyText(quiz[i].question).slice(0, 60)}`),
  ].filter(Boolean).slice(0, 4);

  const suggestedNextStep =
    score < 50
      ? "Ripassa vocabolario e flashcard sulle aree deboli"
      : score < 75
        ? "Allenati con il tutor orale sulle domande probabili"
        : "Simula una verifica reale per consolidare";

  const estimatedOral: QuizPerformanceReport["estimatedOral"] =
    score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";
  const reviewMinutes = Math.max(8, wrongIndices.length * 8 + (score < 60 ? 18 : score < 75 ? 10 : 5));
  const passProbability = Math.max(5, Math.min(98, Math.round(score * 0.82 + (correctIndices.length / Math.max(1, total)) * 12 + (wrongIndices.length ? -4 : 6))));
  const areasToReview = [
    ...weakAreas,
    ...wrongIndices.slice(0, 3).map((i) => quiz[i]?.testedSkill || quiz[i]?.learningLevel || ""),
  ].filter(Boolean).slice(0, 6);

  return {
    score,
    grade10,
    grade30,
    judgement,
    confidence,
    strongAreas,
    weakAreas,
    errors,
    strengths,
    likelyOralQuestions,
    suggestedNextStep,
    estimatedOral,
    reviewMinutes,
    passProbability,
    areasToReview,
  };
}

export interface StudyCoachMetrics {
  studyDifficulty: number;
  estimatedMinutes: number;
  difficultyPrediction: "Easy" | "Medium" | "Hard";
  difficultConcepts: string[];
  topicType: string;
  focusOn: string[];
  avoid: string[];
  coachMessage: string;
}

export function computeStudyCoachMetrics(
  result: StudySessionResult,
  performance?: UserPerformanceLevel
): StudyCoachMetrics {
  const words = result.words || 0;
  const conceptCount = result.keyConcepts?.length || 0;
  const quizCount = result.quiz?.length || 0;
  const vocabCount = result.difficultWords?.length || 0;
  const oralCount = result.openQuestions?.length || 0;

  const difficultyMap: Record<StudyDifficulty, number> = { soft: 3, medium: 5, pro: 8 };
  const base = difficultyMap[result.difficulty] ?? 5;
  const studyDifficulty = Math.min(10, Math.max(1, Math.round(base + conceptCount * 0.3 + vocabCount * 0.2)));
  const estimatedMinutes = Math.max(8, Math.round(words / 180 + quizCount * 1.5 + conceptCount * 2));

  const difficultyPrediction: StudyCoachMetrics["difficultyPrediction"] =
    studyDifficulty <= 4 ? "Easy" : studyDifficulty <= 7 ? "Medium" : "Hard";

  const difficultConcepts = (result.keyConcepts || []).slice(0, 5).map(sanitizeStudyText);

  const isConceptHeavy = conceptCount >= 6 || oralCount >= 4;
  const isVocabHeavy = vocabCount >= 6;
  const topicType = isConceptHeavy
    ? "argomento concettuale — serve capire i collegamenti"
    : isVocabHeavy
      ? "materiale con molti termini — serve memorizzazione attiva"
      : "materiale misto — bilancia comprensione e ripasso";

  const focusOn: string[] = [];
  const avoid: string[] = [];

  if (performance === "struggling") {
    focusOn.push("Riassunto leggero", "Vocabolario semplificato", "Flashcard base");
    avoid.push("Quiz difficili", "Memorizzazione senza capire");
  } else if (performance === "advanced") {
    focusOn.push("Interrogazione orale", "Quiz stile esame", "Collegamenti causa-effetto");
    avoid.push("Ripasso superficiale", "Solo definizioni");
  } else {
    focusOn.push("Quiz interattivo", "Spiegazione orale", "Cause-effetto");
    if (oralCount >= 4) focusOn.push("Tutor orale");
    if (vocabCount >= 5) focusOn.push("Vocabolario");
    avoid.push("Memorizzazione meccanica senza esempi");
  }

  const coachMessage = performance === "struggling"
    ? "Stai costruendo le basi — vai piano, usa le spiegazioni semplici e ripeti con le flashcard."
    : performance === "advanced"
      ? "Ottimo ritmo! Punta all'interrogazione orale e alle domande difficili per consolidare."
      : "Questo argomento richiede equilibrio tra comprensione e memorizzazione attiva.";

  return {
    studyDifficulty,
    estimatedMinutes,
    difficultyPrediction,
    difficultConcepts,
    topicType,
    focusOn,
    avoid,
    coachMessage,
  };
}

function clampMastery(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function containsConcept(text: string, concept: string): boolean {
  const cleanConcept = concept.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  if (!cleanConcept) return false;
  const parts = cleanConcept.split(/\s+/).filter((part) => part.length >= 4).slice(0, 4);
  const lower = text.toLowerCase();
  return parts.length ? parts.some((part) => lower.includes(part)) : lower.includes(cleanConcept);
}

export function buildAdaptiveKnowledgeMap(input: {
  result: StudySessionResult;
  quizAnswers?: Record<number, number>;
  openEvaluations?: Record<number, { score?: number }>;
  flashcardConfidence?: Record<number, FlashcardConfidence>;
}): StudyKnowledgeArea[] {
  const result = input.result;
  const baseAreas: StudyKnowledgeArea[] = (result.knowledgeMap?.length ? result.knowledgeMap : (result.keyConcepts || []).slice(0, 10).map((concept) => ({
    concept,
    mastery: 50,
    status: "medium" as const,
    reason: "Da verificare con le attività della sessione.",
    nextAction: `Ripassa "${concept}" e verifica con una domanda.`,
  }))).slice(0, 10);

  const quiz = result.quiz || [];
  const answers = input.quizAnswers || {};
  const flashcards = result.flashcards || [];
  const confidence = input.flashcardConfidence || {};
  const oralEvaluations = input.openEvaluations || {};
  const oralQuestions = result.openQuestions || [];

  return baseAreas.map((area, areaIndex) => {
    const concept = sanitizeStudyText(area.concept);
    const matchingQuiz = quiz
      .map((question, index) => ({ question, index }))
      .filter(({ question }) => containsConcept(`${question.question} ${question.explanation} ${question.testedSkill || ""}`, concept));
    const answeredQuiz = matchingQuiz.filter(({ index }) => answers[index] !== undefined);
    const correctQuiz = answeredQuiz.filter(({ question, index }) => answers[index] === question.answer).length;
    const wrongQuiz = answeredQuiz.length - correctQuiz;
    const quizDelta = answeredQuiz.length
      ? Math.round((correctQuiz / answeredQuiz.length) * 32 - wrongQuiz * 10)
      : 0;

    const matchingCards = flashcards
      .map((card, index) => ({ card, index }))
      .filter(({ card, index }) => containsConcept(`${card.front} ${card.back}`, concept) || index === areaIndex);
    const cardDelta = matchingCards.reduce((sum, { index }) => {
      const value = confidence[index];
      if (value === "known") return sum + 8;
      if (value === "almost") return sum + 3;
      if (value === "unknown") return sum - 8;
      return sum;
    }, 0);

    const matchingOral = oralQuestions
      .map((question, index) => ({ question, index, evaluation: oralEvaluations[index] }))
      .filter(({ question, index }) => containsConcept(question.question, concept) || index === areaIndex)
      .map(({ evaluation }) => Number(evaluation?.score))
      .filter((score) => Number.isFinite(score));
    const oralDelta = matchingOral.length
      ? Math.round((matchingOral.reduce((sum, score) => sum + score, 0) / matchingOral.length - 60) * 0.35)
      : 0;

    const mastery = clampMastery((area.mastery || 50) + quizDelta + cardDelta + oralDelta);
    const status: StudyKnowledgeArea["status"] = mastery >= 76 ? "strong" : mastery >= 55 ? "medium" : "weak";
    const reason = answeredQuiz.length || matchingCards.length || matchingOral.length
      ? [
          answeredQuiz.length ? `quiz ${correctQuiz}/${answeredQuiz.length}` : "",
          matchingCards.length ? "flashcard valutate" : "",
          matchingOral.length ? `orale medio ${Math.round(matchingOral.reduce((sum, score) => sum + score, 0) / matchingOral.length)}/100` : "",
        ].filter(Boolean).join(" · ")
      : area.reason;
    const nextAction = status === "strong"
      ? `Mantieni "${concept}" con una domanda da esame o un collegamento.`
      : status === "medium"
        ? `Consolida "${concept}" con una flashcard e un esempio orale.`
        : `Riparti da "${concept}": definizione semplice, errore comune, poi quiz facile.`;

    return {
      concept,
      mastery,
      status,
      reason,
      nextAction,
    };
  });
}

export function buildAdaptiveCoachSnapshot(input: {
  result: StudySessionResult;
  quizAnswers?: Record<number, number>;
  openEvaluations?: Record<number, { score?: number }>;
  flashcardConfidence?: Record<number, FlashcardConfidence>;
}): StudyAdaptiveCoachSnapshot {
  const knowledgeMap = buildAdaptiveKnowledgeMap(input);
  const avg = knowledgeMap.length
    ? Math.round(knowledgeMap.reduce((sum, area) => sum + area.mastery, 0) / knowledgeMap.length)
    : 45;
  const gaps = knowledgeMap.filter((area) => area.status === "weak").map((area) => area.concept).slice(0, 5);
  const strengths = knowledgeMap.filter((area) => area.status === "strong").map((area) => area.concept).slice(0, 5);
  const answered = Object.keys(input.quizAnswers || {}).length;
  const quizTotal = input.result.quiz?.length || 0;
  const quizCompletionBonus = quizTotal ? Math.round((answered / quizTotal) * 8) : 0;
  const estimatedPassProbability = clampMastery(avg + quizCompletionBonus + (strengths.length >= 3 ? 5 : 0) - (gaps.length >= 3 ? 8 : 0));
  const weakest = gaps[0] || knowledgeMap.sort((a, b) => a.mastery - b.mastery)[0]?.concept;

  return {
    currentLevel: estimatedPassProbability >= 78 ? "exam_ready" : estimatedPassProbability >= 55 ? "in_progress" : "base",
    nextAction: weakest
      ? `Prossimo passo: rinforza "${weakest}" e poi ripeti una domanda orale.`
      : "Prossimo passo: fai una simulazione esame completa.",
    gaps,
    strengths: strengths.length ? strengths : knowledgeMap.filter((area) => area.status === "medium").map((area) => area.concept).slice(0, 4),
    estimatedPassProbability,
    knowledgeMap,
  };
}

export interface StudyCoachPlan {
  title: string;
  days: Array<{ day: string; focus: string; tasks: string[]; minutes: number }>;
}

export function buildStudyCoachPlans(input: {
  result: StudySessionResult;
  quizAnswers?: Record<number, number>;
  openEvaluations?: Record<number, { score?: number }>;
  flashcardConfidence?: Record<number, FlashcardConfidence>;
}): StudyCoachPlan[] {
  const result = input.result;
  const performance = computeUserPerformanceLevel({
    quiz: result.quiz || [],
    quizAnswers: input.quizAnswers || {},
    openEvaluations: input.openEvaluations || {},
    flashcardConfidence: input.flashcardConfidence || {},
  });
  const metrics = computeStudyCoachMetrics(result, performance);
  const weakConcepts = (result.keyConcepts || []).slice(0, 5);
  const classification = result.classification;
  const baseMinutes = Math.max(20, Math.min(80, Math.round(metrics.estimatedMinutes / 3)));
  const strategy = classification?.strategy?.length ? classification.strategy : ["riassunto", "quiz", "ripasso orale"];

  return [
    {
      title: "Piano 3 giorni",
      days: [
        {
          day: "Giorno 1",
          focus: "Comprensione",
          tasks: [
            "Leggi il riassunto completo e sottolinea i concetti non chiari.",
            `Lavora su: ${weakConcepts.slice(0, 2).join(", ") || result.detectedSubject}.`,
            `Metodo: ${strategy[0] || "riassunto progressivo"}.`,
          ],
          minutes: baseMinutes,
        },
        {
          day: "Giorno 2",
          focus: "Memoria attiva",
          tasks: [
            "Completa flashcard e vero/falso senza guardare il testo.",
            "Riscrivi a parole tue 5 definizioni o passaggi chiave.",
            `Metodo: ${strategy[1] || "domande attive"}.`,
          ],
          minutes: baseMinutes,
        },
        {
          day: "Giorno 3",
          focus: "Verifica",
          tasks: [
            "Fai la simulazione esame.",
            "Correggi gli errori e ripeti a voce le domande orali probabili.",
            "Scarica attestato solo se la verifica supera il 60%.",
          ],
          minutes: baseMinutes,
        },
      ],
    },
    {
      title: "Piano 7 giorni",
      days: Array.from({ length: 7 }, (_, index) => ({
        day: `Giorno ${index + 1}`,
        focus: index < 2 ? "Base" : index < 5 ? "Consolidamento" : "Simulazione",
        tasks: index < 2
          ? ["Riassunto breve + ultra semplice.", "Lista dei concetti chiave.", `Focus materia: ${classification?.label || result.detectedSubject}.`]
          : index < 5
            ? ["Quiz adattivo.", "Flashcard cloze/definizione.", "Un esercizio guidato o applicativo."]
            : ["Esame completo.", "Ripasso errori.", "Interrogazione orale da 3 minuti."],
        minutes: Math.max(18, Math.round(metrics.estimatedMinutes / 7) + (index > 4 ? 12 : 0)),
      })),
    },
    {
      title: "Piano esame",
      days: [
        {
          day: "Blocco 1",
          focus: "Mappa",
          tasks: ["Apri la mappa concettuale.", "Spiega ogni nodo senza leggere.", "Collega almeno 3 relazioni causa-effetto o gerarchiche."],
          minutes: 25,
        },
        {
          day: "Blocco 2",
          focus: "Domande",
          tasks: ["Completa quiz + vero/falso.", "Raccogli gli errori.", "Trasforma ogni errore in una flashcard."],
          minutes: 35,
        },
        {
          day: "Blocco 3",
          focus: "Orale",
          tasks: ["Rispondi alle domande aperte.", "Chiedi valutazione.", "Ripeti solo punti deboli e termini tecnici."],
          minutes: 30,
        },
      ],
    },
  ];
}

/** @deprecated use computeStudyCoachMetrics */
export function computeStudyWowMetrics(result: StudySessionResult) {
  const m = computeStudyCoachMetrics(result);
  return {
    studyDifficulty: m.studyDifficulty,
    estimatedMinutes: m.estimatedMinutes,
    difficultyPrediction: m.difficultyPrediction,
    difficultConcepts: m.difficultConcepts,
    suggestedStrategy: m.focusOn[0]?.includes("orale") ? "Oral focus" as const : m.focusOn[0]?.includes("Flashcard") ? "Memory" as const : "Understanding" as const,
  };
}

export function compressLightSummary(text: string, maxWords = 175): string {
  const clean = sanitizeStudyText(text);
  if (!clean) return clean;

  const lines = cleanStudyLines(clean);
  if (lines.length >= 3) {
    const bulletText = lines.slice(0, 8).map((l) => `• ${l}`).join("\n");
    const words = bulletText.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return bulletText;
    return lines.slice(0, 6).map((l) => `• ${l}`).join("\n") + "…";
  }

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(" ") + "…";
}

export type StudyNotesVariant = "bullets" | "chain" | "warning" | "question" | "concepts";

export interface StudyNotesSection {
  icon: string;
  title: string;
  lines: string[];
  variant: StudyNotesVariant;
  chain?: string[];
}

const SECTION_DEFS: { icon: string; title: string; variant: StudyNotesVariant; patterns: RegExp[] }[] = [
  { icon: "🧠", title: "Cosa devi sapere", variant: "concepts", patterns: [/concetti da sapere/i, /cosa devi sapere/i, /what you must know/i, /^1\./i] },
  { icon: "🎯", title: "Top 5 da memorizzare", variant: "bullets", patterns: [/cosa ricordare/i, /memorizzare/i, /top 5/i, /^2\./i] },
  { icon: "⚠", title: "Trappole d'esame", variant: "warning", patterns: [/trappol/i, /errori comuni/i, /exam trap/i, /attenzione/i] },
  { icon: "🔥", title: "Domanda probabile del professore", variant: "question", patterns: [/domanda probabile/i, /alta probabilit/i, /high probability/i, /probabilmente/i] },
  { icon: "🔗", title: "Causa → Effetto", variant: "chain", patterns: [/collegament/i, /causa/i, /effetto/i, /cause/i, /^3\./i] },
  { icon: "❌", title: "Errori comuni", variant: "warning", patterns: [/confusion/i, /distingu/i, /errore/i] },
  { icon: "🎓", title: "Guida interrogazione orale", variant: "bullets", patterns: [/interrogazione/i, /orale/i, /oral/i, /^4\./i] },
];

function extractChain(lines: string[]): string[] {
  const chain: string[] = [];
  for (const line of lines) {
    const parts = line.split(/\s*(?:→|->|↓|➜|—>)\s*/).map(cleanStudyLine).filter(Boolean);
    if (parts.length > 1) chain.push(...parts);
    else if (line.length > 4) chain.push(line);
  }
  return chain.slice(0, 6);
}

export function parseStudyNotesPro(text: string): StudyNotesSection[] {
  const clean = sanitizeStudyText(text);
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const sections: StudyNotesSection[] = [];
  const used = new Set<number>();

  for (const def of SECTION_DEFS) {
    const matched: string[] = [];
    paragraphs.forEach((p, idx) => {
      if (used.has(idx)) return;
      if (def.patterns.some((rx) => rx.test(p))) {
        used.add(idx);
        matched.push(...cleanStudyLines(p));
      }
    });
    if (matched.length) {
      const section: StudyNotesSection = {
        icon: def.icon,
        title: def.title,
        lines: def.variant === "chain" ? [] : matched.slice(0, 6),
        variant: def.variant,
      };
      if (def.variant === "chain") section.chain = extractChain(matched);
      else if (def.variant === "question") section.lines = [matched[0] || matched.join(" ")].slice(0, 1);
      sections.push(section);
    }
  }

  if (sections.length < 2) {
    const allLines = cleanStudyLines(clean);
    if (allLines.length) {
      return [
        { icon: "🧠", title: "Cosa devi sapere", lines: allLines.slice(0, 4), variant: "concepts" },
        { icon: "🎯", title: "Da memorizzare", lines: allLines.slice(4, 8), variant: "bullets" },
        { icon: "🎓", title: "Per l'interrogazione", lines: allLines.slice(8, 12), variant: "bullets" },
      ].filter((s) => s.lines.length > 0);
    }
  }

  return sections.filter((s) => s.lines.length > 0 || (s.chain && s.chain.length > 0));
}

export function simplifyVocabularyText(item: DifficultWord, performance?: UserPerformanceLevel): string {
  let simple = sanitizeStudyText(item.simple?.trim() || "");
  if (performance === "struggling" || performance === "balanced") {
    const first = simple.split(/[.!?]/).find((s) => s.trim().length > 8)?.trim();
    if (first) simple = `${first}.`;
  }
  if (simple.length > 120 && performance === "struggling") {
    simple = simple.slice(0, 117) + "…";
  }
  if (simple && simple.length < 220) return simple;
  const firstSentence = simple.split(/[.!?]/)[0]?.trim();
  return firstSentence ? `${firstSentence}.` : `È un'idea importante nel testo — spiegala con parole tue.`;
}

export function buildVocabularyAnalogy(word: string, simple: string): string {
  const w = word.toLowerCase();
  const analogies: Record<string, string> = {
    bioaccumulazione: "Come una palla di neve che rotola in discesa e raccoglie sempre più neve.",
    polarizzazione: "Come un magnete che spinge le persone verso due estremi opposti.",
    algoritmo: "Come una ricetta che segue passi precisi — ma se gli ingredienti sono sbagliati, il risultato sarà sbagliato.",
    bias: "Come occhiali colorati: tutto quello che vedi passa attraverso quel filtro.",
    sostenibilità: "Come un conto in banca: se spendi più di quanto guadagni, prima o poi finisci i soldi.",
  };
  for (const [key, analogy] of Object.entries(analogies)) {
    if (w.includes(key)) return analogy;
  }
  if (/accumul/i.test(w)) return "Immagina qualcosa che si accumula piano piano, come gocce in un secchio.";
  if (/regolament|legge|norm/i.test(w)) return "Come le regole di un gioco: servono a far funzionare tutto in modo equo.";
  if (/mercato|econom/i.test(w)) return "Come un grande mercato dove compratori e venditori si incontrano.";
  const snippet = simple.split(/[.!?]/)[0]?.trim();
  return snippet
    ? `Pensa a "${word}" come: ${snippet.charAt(0).toLowerCase()}${snippet.slice(1)}`
    : `Immagina "${word}" come un'idea che collega due cose che già conosci.`;
}

export interface OralFollowUpTurn {
  prompt: string;
  depth: "clarify" | "connect" | "challenge";
}

export function buildOralFollowUps(
  question: string,
  answer: string,
  evaluation: { missing?: string[]; score?: number; strengths?: string[] }
): OralFollowUpTurn[] {
  const turns: OralFollowUpTurn[] = [];
  const missing = evaluation.missing || [];
  const score = evaluation.score ?? 50;

  if (missing[0]) {
    turns.push({
      prompt: `Buona base, ma spiega meglio: ${missing[0].charAt(0).toLowerCase()}${missing[0].slice(1)}`,
      depth: "clarify",
    });
  } else if (score < 60) {
    turns.push({
      prompt: "Hai toccato il tema, ma manca il PERCHÉ. Spiega la causa principale con un esempio concreto.",
      depth: "clarify",
    });
  } else {
    turns.push({
      prompt: "Ottimo! Ora approfondisci: quali conseguenze pratiche ha questo concetto nel mondo reale?",
      depth: "connect",
    });
  }

  const topic = sanitizeStudyText(question.replace(/^(spiega|descrivi|qual è|come)\s+/i, "").replace(/\?$/, ""));
  if (score >= 55 && topic) {
    turns.push({
      prompt: `Puoi collegare "${topic.slice(0, 50)}" a un altro concetto del capitolo? Come si influenzano?`,
      depth: "connect",
    });
  }

  if (score >= 70) {
    turns.push({
      prompt: "Domanda da professore severo: e se ti chiedessi di confutare questa tesi con un controesempio?",
      depth: "challenge",
    });
  }

  return turns.slice(0, 3);
}

/** @deprecated single follow-up — use buildOralFollowUps */
export function buildOralFollowUp(
  question: string,
  evaluation: { missing?: string[]; score?: number; advice?: string }
): string {
  return buildOralFollowUps(question, "", evaluation)[0]?.prompt || "Prova a rispondere con più struttura.";
}

export interface FlashcardBuckets {
  reviewNow: { index: number; front: string }[];
  almostMastered: { index: number; front: string }[];
  mastered: { index: number; front: string }[];
}

export function getFlashcardBuckets(
  cards: Flashcard[],
  confidence: Record<number, FlashcardConfidence>
): FlashcardBuckets {
  const reviewNow: FlashcardBuckets["reviewNow"] = [];
  const almostMastered: FlashcardBuckets["almostMastered"] = [];
  const mastered: FlashcardBuckets["mastered"] = [];

  cards.forEach((card, i) => {
    const c = confidence[i];
    const front = card.front.length > 55 ? `${card.front.slice(0, 52)}…` : card.front;
    if (c === "known") mastered.push({ index: i, front });
    else if (c === "almost") almostMastered.push({ index: i, front });
    else if (c === "unknown") reviewNow.push({ index: i, front });
  });

  return { reviewNow, almostMastered, mastered };
}

export function prioritizeFlashcardOrder(
  length: number,
  confidence: Record<number, FlashcardConfidence>
): number[] {
  const unknown: number[] = [];
  const almost: number[] = [];
  const known: number[] = [];
  const unset: number[] = [];

  for (let i = 0; i < length; i++) {
    const c = confidence[i];
    if (c === "unknown") unknown.push(i);
    else if (c === "almost") almost.push(i);
    else if (c === "known") known.push(i);
    else unset.push(i);
  }

  return [...unknown, ...unset, ...almost, ...known];
}

export function getFlashcardsToReview(
  cards: Flashcard[],
  confidence: Record<number, FlashcardConfidence>
): string[] {
  return getFlashcardBuckets(cards, confidence).reviewNow.slice(0, 6).map((x) => x.front);
}

export function inferFlashcardType(card: Flashcard, index: number): string {
  const text = `${card.front} ${card.back}`.toLowerCase();
  if (card.type) {
    const map: Record<string, string> = {
      definition: "Definizione",
      "cause-effect": "Causa-effetto",
      comparison: "Confronto",
      "true-false": "Vero/Falso",
      application: "Applicazione",
      oral: "Sfida orale",
    };
    return map[card.type] || card.type;
  }
  if (/vero|falso|true|false/i.test(text)) return "Vero/Falso";
  if (/perché|causa|effetto|conseguenz/i.test(text)) return "Causa-effetto";
  if (/confronta|differenz|simile/i.test(text)) return "Confronto";
  if (/esempio|applica|caso/i.test(text)) return "Applicazione";
  if (/spiega|interrogazione|orale/i.test(text)) return "Sfida orale";
  const types = ["Definizione", "Causa-effetto", "Confronto", "Vero/Falso", "Applicazione", "Sfida orale"];
  return types[index % types.length];
}
