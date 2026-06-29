import type { StudyCertificateInput } from "@/lib/study-certificate";
import type { EnhancedQuizItem } from "@/lib/study-os/study-quiz-engine";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import type { StudyQuizAttempt } from "@/lib/study-os/study-memory";

export const EXAM_PASS_THRESHOLD = 60;
export const EXAM_CERTIFICATE_THRESHOLD = 60;

/** Format seconds as MM:SS for exam countdown UI. */
export function formatExamCountdown(secondsRemaining: number): string {
  const safe = Math.max(0, Math.floor(secondsRemaining));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** True when elapsed time meets or exceeds the configured limit. */
export function shouldAutoSubmitExam(elapsedSec: number, limitSec: number | null): boolean {
  if (limitSec === null || limitSec <= 0) return false;
  return elapsedSec >= limitSec;
}

/** Resolve exam state when timer expires — keeps answers, marks timeout. */
export function resolveExamTimedOut(
  answers: Record<number, number>,
  totalQuestions: number,
): { answers: Record<number, number>; timedOut: boolean; unanswered: number } {
  const unanswered = Math.max(0, totalQuestions - Object.keys(answers).length);
  return { answers, timedOut: true, unanswered };
}

export interface ExamSimAnswer {
  questionIndex: number;
  question: string;
  selectedIndex: number;
  correctIndex: number;
  correct: boolean;
  topic?: string;
  explanation?: string;
}

export interface ExamSimError {
  question: string;
  topic: string;
  explanation: string;
  suggestion: string;
}

export interface ExamSimReport {
  score: number;
  correct: number;
  total: number;
  grade10: number;
  grade30: number;
  judgement: string;
  errors: ExamSimError[];
  lacune: string[];
  suggestions: string[];
  passed: boolean;
  certificateEligible: boolean;
  mode: "exam_sim";
}

export interface BuildExamSimInput {
  quiz: EnhancedQuizItem[];
  answers: Record<number, number>;
  kernelPlan?: StudyKernelPlan | null;
  priorAttempts?: StudyQuizAttempt[];
}

function scoreToGrade10(score: number): number {
  return Math.round((score / 100) * 10 * 10) / 10;
}

function scoreToGrade30(score: number): number {
  return Math.round((score / 100) * 30);
}

function judgementFromScore(score: number): string {
  if (score >= 90) return "Ottimo — preparazione eccellente";
  if (score >= 75) return "Buono — pronto per la verifica";
  if (score >= 60) return "Sufficiente — rinforza le lacune";
  if (score >= 45) return "Insufficiente — serve più ripasso";
  return "Critico — rischio bocciatura elevato";
}

/** Build realistic exam simulation report with Italian grading and lacune. */
export function buildExamSimReport(input: BuildExamSimInput): ExamSimReport {
  const { quiz, answers, kernelPlan, priorAttempts = [] } = input;
  const total = quiz.length;
  const errors: ExamSimError[] = [];
  const topicMisses = new Map<string, number>();

  let correct = 0;
  for (let i = 0; i < quiz.length; i++) {
    const item = quiz[i];
    const selected = answers[i];
    if (selected === undefined) continue;
    const isCorrect = selected === item.answer;
    if (isCorrect) {
      correct += 1;
      continue;
    }
    const topic = item.sourceReference || item.testedSkill || "generale";
    topicMisses.set(topic, (topicMisses.get(topic) ?? 0) + 1);
    errors.push({
      question: item.question,
      topic,
      explanation: item.explanation || "Rivedi la spiegazione nel materiale.",
      suggestion: item.commonMistake
        ? `Evita: ${item.commonMistake}`
        : `Ripassa ${topic} con flashcard e riassunto.`,
    });
  }

  const answered = Object.keys(answers).length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const lacune = Array.from(topicMisses.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic)
    .slice(0, 6);

  const priorWeak = new Set(
    priorAttempts.filter((a) => !a.correct).map((a) => a.topic || "generale"),
  );
  for (const topic of priorWeak) {
    if (!lacune.includes(topic)) lacune.push(topic);
  }

  const suggestions: string[] = [];
  if (lacune.length) {
    suggestions.push(`Ripassa prioritariamente: ${lacune.slice(0, 3).join(", ")}.`);
  }
  if (kernelPlan?.recommendedModes.includes("flashcard")) {
    suggestions.push("Usa le flashcard SM-2 sulle definizioni sbagliate.");
  }
  if (score < EXAM_PASS_THRESHOLD) {
    suggestions.push("Rifai la simulazione dopo un ripasso mirato (15–20 min).");
  } else {
    suggestions.push("Ottimo: prova una simulazione a difficoltà esame senza aiuti.");
  }
  if (answered < total) {
    suggestions.push(`Hai risposto a ${answered}/${total} domande — completa tutte in esame reale.`);
  }

  const passed = score >= EXAM_PASS_THRESHOLD;

  return {
    score,
    correct,
    total,
    grade10: scoreToGrade10(score),
    grade30: scoreToGrade30(score),
    judgement: judgementFromScore(score),
    errors,
    lacune,
    suggestions,
    passed,
    certificateEligible: passed && score >= EXAM_CERTIFICATE_THRESHOLD,
    mode: "exam_sim",
  };
}

/** Select exam-appropriate question subset when kernel recommends exam_sim. */
export function selectExamSimQuestions(
  quiz: EnhancedQuizItem[],
  kernelPlan?: StudyKernelPlan | null,
  maxQuestions = 12,
): EnhancedQuizItem[] {
  const examTier = quiz.filter((q) => q.tier === "esame" || q.tier === "difficile");
  const pool = examTier.length >= 4 ? examTier : quiz;
  const preferredTypes = kernelPlan?.quizTypes ?? ["multiple_choice", "true_false", "practical_case"];

  const prioritized = [
    ...pool.filter((q) => preferredTypes.includes(q.kernelType)),
    ...pool.filter((q) => !preferredTypes.includes(q.kernelType)),
  ];

  const seen = new Set<string>();
  const unique: EnhancedQuizItem[] = [];
  for (const item of prioritized) {
    const key = item.question.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
    if (unique.length >= maxQuestions) break;
  }
  return unique;
}

export function toCertificateInput(
  report: ExamSimReport,
  studentName: string,
  subject: string,
  sourceProjectId?: string,
  badges: string[] = [],
): StudyCertificateInput {
  const level =
    report.score >= 90 ? "Advanced" : report.score >= 75 ? "Proficient" : report.score >= 55 ? "Developing" : "Beginner";

  return {
    studentName,
    subject,
    date: new Date().toLocaleDateString("it-IT"),
    score: report.score,
    level,
    grade10: report.grade10,
    grade30: report.grade30,
    judgement: report.judgement,
    sourceProjectId,
    badges,
  };
}
