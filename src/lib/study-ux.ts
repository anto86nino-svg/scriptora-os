import type { DifficultWord, Flashcard, QuizQuestion, StudyDifficulty, StudySessionResult } from "@/lib/study-session";

export const STUDY_UX_STORAGE_KEY = "scriptora-study-ux-v1";

export type QuizDifficulty = "easy" | "medium" | "hard";
export type FlashcardConfidence = "unknown" | "almost" | "known";

export interface StudyUxState {
  activeSection: "summary" | "questions" | "vocabulary" | "flashcards" | "quiz";
  quizAnswers: Record<number, number>;
  currentQuizIndex: number;
  quizOrder: number[];
  quizMode: "practice" | "exam";
  examStartedAt: number | null;
  examTimeLimitSec: number | null;
  openAnswers: Record<number, string>;
  openEvaluations: Record<number, unknown>;
  currentOralIndex: number;
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

/** Classify quiz question difficulty from content heuristics */
export function inferQuizDifficulty(q: QuizQuestion): QuizDifficulty {
  if (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") {
    return q.difficulty;
  }
  const text = `${q.question} ${q.explanation}`.toLowerCase();
  const hardSignals = /(interpreta|spiega perché|confronta|collega|implicazione|conseguenz|oral|argomenta|analizza|in che modo)/i;
  const easySignals = /(definizione|significa|quale termine|cos'è|cosa è|identifica)/i;
  if (hardSignals.test(text)) return "hard";
  if (easySignals.test(text)) return "easy";
  return "medium";
}

/** Shuffle array with Fisher-Yates */
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

/** Pick next question index based on adaptive performance */
export function pickAdaptiveNextIndex(
  quiz: QuizQuestion[],
  order: number[],
  answers: Record<number, number>,
  currentIndex: number
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
  if (correctStreak >= 2) target = "hard";
  if (wrongStreak >= 2) target = "easy";

  const candidates = unanswered.map((i) => ({
    index: i,
    diff: inferQuizDifficulty(quiz[i]),
    dist: Math.abs(order.indexOf(i) - order.indexOf(currentIndex)),
  }));

  const tierMatch = candidates.filter((c) => c.diff === target);
  const pool = tierMatch.length ? tierMatch : candidates.filter((c) => c.diff === "medium");
  const finalPool = pool.length ? pool : candidates;
  finalPool.sort((a, b) => a.dist - b.dist);
  return finalPool[0]?.index ?? unanswered[0];
}

export interface QuizPedagogicalFeedback {
  isCorrect: boolean;
  headline: string;
  why: string;
  remember: string;
  commonConfusion: string;
}

export function buildQuizFeedback(q: QuizQuestion, selected: number): QuizPedagogicalFeedback {
  const isCorrect = selected === q.answer;
  const correctOption = q.options[q.answer] || "la risposta corretta";
  const wrongOption = q.options[selected] || "la tua scelta";

  const remember =
    q.memoryTrick?.trim() ||
    `Collega "${correctOption.slice(0, 60)}" al concetto centrale del materiale — ripetilo a voce alta una volta.`;

  const commonConfusion =
    q.commonMistake?.trim() ||
    (isCorrect
      ? `Non confondere il concetto con dettagli secondari: la risposta giusta è quella che spiega il ruolo nel tema.`
      : `"${wrongOption.slice(0, 80)}" sembra plausibile ma non cattura il punto centrale.`);

  if (isCorrect) {
    return {
      isCorrect: true,
      headline: "✅ Corretto",
      why: q.explanation || `Esatto: ${correctOption}`,
      remember,
      commonConfusion,
    };
  }

  return {
    isCorrect: false,
    headline: "❌ Quasi",
    why: `"${wrongOption.slice(0, 100)}" non è la risposta migliore. ${q.explanation || `La risposta corretta è: ${correctOption}`}`,
    remember,
    commonConfusion,
  };
}

export interface QuizPerformanceReport {
  score: number;
  strongAreas: string[];
  needsReview: string[];
  suggestedReview: string[];
  estimatedOral: "Low" | "Medium" | "High";
}

export function buildQuizPerformanceReport(
  quiz: QuizQuestion[],
  answers: Record<number, number>,
  keyConcepts: string[]
): QuizPerformanceReport {
  const total = quiz.length;
  const correctIndices = quiz
    .map((q, i) => (answers[i] === q.answer ? i : -1))
    .filter((i) => i >= 0);
  const wrongIndices = quiz
    .map((q, i) => (answers[i] !== undefined && answers[i] !== q.answer ? i : -1))
    .filter((i) => i >= 0);

  const score = total ? Math.round((correctIndices.length / total) * 100) : 0;

  const strongAreas = correctIndices.slice(0, 4).map((i) => {
    const q = quiz[i];
    const snippet = q.question.length > 70 ? `${q.question.slice(0, 67)}…` : q.question;
    return snippet;
  });

  const needsReview = wrongIndices.slice(0, 4).map((i) => {
    const q = quiz[i];
    const snippet = q.question.length > 70 ? `${q.question.slice(0, 67)}…` : q.question;
    return snippet;
  });

  const suggestedReview = [
    ...keyConcepts.slice(0, 3),
    ...wrongIndices.slice(0, 2).map((i) => quiz[i]?.explanation?.slice(0, 80) || "Ripassa la spiegazione del quiz"),
  ].filter(Boolean).slice(0, 5);

  const estimatedOral: QuizPerformanceReport["estimatedOral"] =
    score >= 75 ? "High" : score >= 50 ? "Medium" : "Low";

  return { score, strongAreas, needsReview, suggestedReview, estimatedOral };
}

export interface StudyWowMetrics {
  studyDifficulty: number;
  estimatedMinutes: number;
  difficultyPrediction: "Easy" | "Medium" | "Hard";
  difficultConcepts: string[];
  suggestedStrategy: "Memory" | "Understanding" | "Oral focus";
}

export function computeStudyWowMetrics(result: StudySessionResult): StudyWowMetrics {
  const words = result.words || 0;
  const conceptCount = result.keyConcepts?.length || 0;
  const quizCount = result.quiz?.length || 0;
  const vocabCount = result.difficultWords?.length || 0;

  const difficultyMap: Record<StudyDifficulty, number> = { soft: 3, medium: 5, pro: 8 };
  const base = difficultyMap[result.difficulty] ?? 5;
  const studyDifficulty = Math.min(10, Math.max(1, Math.round(base + conceptCount * 0.3 + vocabCount * 0.2)));

  const estimatedMinutes = Math.max(8, Math.round(words / 180 + quizCount * 1.5 + conceptCount * 2));

  const difficultyPrediction: StudyWowMetrics["difficultyPrediction"] =
    studyDifficulty <= 4 ? "Easy" : studyDifficulty <= 7 ? "Medium" : "Hard";

  const difficultConcepts = (result.keyConcepts || []).slice(0, 5);

  const oralCount = result.openQuestions?.length || 0;
  const suggestedStrategy: StudyWowMetrics["suggestedStrategy"] =
    oralCount >= 5 ? "Oral focus" : vocabCount >= 8 ? "Memory" : "Understanding";

  return { studyDifficulty, estimatedMinutes, difficultyPrediction, difficultConcepts, suggestedStrategy };
}

/** Compress summary text for LIGHT display (~150-180 words) */
export function compressLightSummary(text: string, maxWords = 175): string {
  const clean = String(text || "").trim();
  if (!clean) return clean;

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return clean;

  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[•\-*]/.test(l) || /^\d+\./.test(l));

  if (bullets.length >= 3) {
    const bulletText = bullets.slice(0, 8).join("\n");
    const bulletWords = bulletText.split(/\s+/).filter(Boolean);
    if (bulletWords.length <= maxWords) return bulletText;
    return bulletWords.slice(0, maxWords).join(" ") + "…";
  }

  return words.slice(0, maxWords).join(" ") + "…";
}

export interface StudyNotesSection {
  icon: string;
  title: string;
  lines: string[];
}

/** Parse Study Notes Pro into scannable sections */
export function parseStudyNotesPro(text: string): StudyNotesSection[] {
  const clean = String(text || "").trim();
  if (!clean) return [];

  const sectionMatchers: { icon: string; title: string; patterns: RegExp[] }[] = [
    { icon: "🧠", title: "Cosa devi sapere", patterns: [/concetti da sapere/i, /cosa devi sapere/i, /what you must know/i] },
    { icon: "🎯", title: "Top 5 da memorizzare", patterns: [/cosa ricordare/i, /memorizzare/i, /top 5/i] },
    { icon: "⚠", title: "Trappole d'esame", patterns: [/trappol/i, /errori comuni/i, /exam trap/i] },
    { icon: "🔥", title: "Domanda ad alta probabilità", patterns: [/domanda/i, /probabilit/i, /high probability/i] },
    { icon: "🔗", title: "Causa → Effetto", patterns: [/collegament/i, /causa/i, /effetto/i, /cause/i] },
    { icon: "❌", title: "Confusioni comuni", patterns: [/confusion/i, /distingu/i] },
    { icon: "🎓", title: "Guida interrogazione orale", patterns: [/interrogazione/i, /orale/i, /oral/i] },
  ];

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const sections: StudyNotesSection[] = [];
  const used = new Set<number>();

  for (const matcher of sectionMatchers) {
    const matched: string[] = [];
    paragraphs.forEach((p, idx) => {
      if (used.has(idx)) return;
      if (matcher.patterns.some((rx) => rx.test(p))) {
        used.add(idx);
        const lines = p
          .split("\n")
          .map((l) => l.replace(/^[•\-*\d.]+\s*/, "").trim())
          .filter((l) => l.length > 2);
        matched.push(...lines);
      }
    });
    if (matched.length) {
      sections.push({ icon: matcher.icon, title: matcher.title, lines: matched.slice(0, 6) });
    }
  }

  if (sections.length < 2) {
    const fallbackLines = clean
      .split("\n")
      .map((l) => l.replace(/^[•\-*\d.]+\s*/, "").trim())
      .filter((l) => l.length > 8)
      .slice(0, 12);
    if (fallbackLines.length) {
      return [
        { icon: "🧠", title: "Cosa devi sapere", lines: fallbackLines.slice(0, 4) },
        { icon: "🎯", title: "Da memorizzare", lines: fallbackLines.slice(4, 8) },
        { icon: "🎓", title: "Per l'interrogazione", lines: fallbackLines.slice(8, 12) },
      ].filter((s) => s.lines.length > 0);
    }
  }

  return sections;
}

export function simplifyVocabularyText(item: DifficultWord): string {
  const simple = item.simple?.trim();
  if (simple && simple.length < 200) return simple;
  const firstSentence = simple?.split(/[.!?]/)[0]?.trim();
  return firstSentence ? `${firstSentence}.` : `Pensa a "${item.word}" come a un'idea chiave del testo — spiegala con parole tue.`;
}

export function buildOralFollowUp(
  question: string,
  evaluation: { missing?: string[]; score?: number; advice?: string }
): string {
  const missing = evaluation.missing?.[0];
  if (missing) {
    return `Buona base, ma approfondisci: ${missing.charAt(0).toLowerCase()}${missing.slice(1)} Puoi collegarlo meglio alla domanda?`;
  }
  if ((evaluation.score ?? 0) < 60) {
    return `Prova a spiegare il concetto centrale con un esempio concreto tratto dal materiale.`;
  }
  const topic = question.replace(/^(spiega|descrivi|qual è|come)\s+/i, "").replace(/\?$/, "").trim();
  return topic
    ? `Ottimo inizio! Ora collega "${topic.slice(0, 60)}" a un altro concetto del capitolo — come influenzano l'uno l'altro?`
    : `Ottimo! Ora prova a rispondere in 60 secondi come se fossi all'interrogazione.`;
}

export function getFlashcardsToReview(
  cards: Flashcard[],
  confidence: Record<number, FlashcardConfidence>
): string[] {
  return cards
    .map((card, i) => ({ card, i, c: confidence[i] }))
    .filter(({ c }) => c === "unknown" || c === "almost")
    .slice(0, 6)
    .map(({ card }) => (card.front.length > 60 ? `${card.front.slice(0, 57)}…` : card.front));
}

export function inferFlashcardType(card: Flashcard, index: number): string {
  const text = `${card.front} ${card.back}`.toLowerCase();
  if (/vero|falso|true|false/i.test(text)) return "Vero/Falso";
  if (/perché|causa|effetto|conseguenz/i.test(text)) return "Causa-effetto";
  if (/confronta|differenz|simile/i.test(text)) return "Confronto";
  if (/esempio|applica|caso/i.test(text)) return "Applicazione";
  if (/spiega|interrogazione|orale/i.test(text)) return "Stile orale";
  const types = ["Definizione", "Causa-effetto", "Confronto", "Vero/Falso", "Applicazione", "Stile orale"];
  return types[index % types.length];
}
