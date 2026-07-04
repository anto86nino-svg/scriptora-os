import type { StudySessionResult } from "@/lib/study-session";
import { countStudyWords } from "@/lib/study-session";
import { evaluateExerciseQuality, evaluateKeywordQuality, evaluateSummaryQuality } from "@/lib/study-os/study-quality-gates";

export interface StudyReadinessBreakdown {
  materialReadiness: number;
  studentPreparation: number;
  studyReadinessScore: number;
}

export interface StudentActivityInput {
  quizAttempts?: number;
  flashcardReviews?: number;
  oralAnswers?: number;
  examCompleted?: boolean;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasValidSummaries(result: StudySessionResult): boolean {
  const parts = [
    result.lightSummary,
    result.mediumSummary,
    result.proSummary,
    result.summaries?.complete,
  ].map((part) => countStudyWords(String(part || "")));
  return parts.some((count) => count >= 40);
}

/** Material readiness: quality of generated study assets (not student progress). */
export function computeMaterialReadiness(result: StudySessionResult): number {
  if (result.sessionMode === "topic" || result.sessionMode === "insufficient") {
    return clamp((result.sourceQuality?.score ?? 40) * 0.6);
  }

  const sourceScore = result.sourceQuality?.score ?? 86;
  const summaryReport = evaluateSummaryQuality(result.mediumSummary || result.summaries?.complete || "", "");
  const keywordReport = evaluateKeywordQuality(result.difficultWords || []);
  const exerciseReport = evaluateExerciseQuality(result.exercises || []);

  let score = sourceScore * 0.28;
  score += summaryReport.score * 0.22;
  score += (result.quiz?.length ? Math.min(100, 55 + result.quiz.length * 4) : 0) * 0.16;
  score += (result.flashcards?.length ? Math.min(100, 50 + result.flashcards.length * 5) : 0) * 0.10;
  score += keywordReport.score * 0.14;
  score += exerciseReport.score * 0.10;

  if (result.sourceQuality?.status === "pass" && hasValidSummaries(result)) {
    score = Math.max(score, 75);
  }
  if (result.sessionMode === "full" && sourceScore >= 90 && hasValidSummaries(result)) {
    score = Math.max(score, 80);
  }

  return clamp(score);
}

/** Student preparation: activity-based progress (quiz, flashcards, oral). */
export function computeStudentPreparation(activity: StudentActivityInput = {}): number {
  const quiz = Math.min(40, (activity.quizAttempts || 0) * 8);
  const flashcards = Math.min(30, (activity.flashcardReviews || 0) * 4);
  const oral = Math.min(20, (activity.oralAnswers || 0) * 5);
  const exam = activity.examCompleted ? 10 : 0;
  return clamp(quiz + flashcards + oral + exam);
}

export function computeStudyReadinessBreakdown(
  result: StudySessionResult,
  activity: StudentActivityInput = {},
): StudyReadinessBreakdown {
  const materialReadiness = computeMaterialReadiness(result);
  const studentPreparation = computeStudentPreparation(activity);

  return {
    materialReadiness,
    studentPreparation,
    studyReadinessScore: materialReadiness,
  };
}
