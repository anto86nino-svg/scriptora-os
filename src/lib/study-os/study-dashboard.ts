import { listStudyMemorySessions, type StudyMemorySnapshot } from "@/lib/study-os/study-memory";
import { computeStudyReminders, countDueReminders } from "@/lib/study-os/study-reminders";

export interface StudyDashboardStats {
  hoursStudied: number;
  quizzesCompleted: number;
  flashcardsMemorized: number;
  sessionsCount: number;
  subjects: string[];
  avgQuizAccuracy: number;
  weakTopicsCount: number;
  /** Recent per-session quiz accuracy (0–100), oldest first */
  accuracyTrend: number[];
  /** Share of flashcards with at least one successful review */
  flashcardRetention: number;
  reviewsDue: number;
}

const MINUTES_PER_SESSION_ESTIMATE = 25;

function countMemorizedFlashcards(snapshot: StudyMemorySnapshot): number {
  const deck = snapshot.flashcardDeck ?? [];
  return deck.filter((c) => c.repetitions >= 2 && (c.easeFactor ?? 2.5) >= 2.3).length;
}

function computeFlashcardRetention(sessions: StudyMemorySnapshot[]): number {
  const allCards = sessions.flatMap((s) => s.flashcardDeck ?? []);
  if (!allCards.length) return 100;
  const retained = allCards.filter((c) => c.repetitions >= 1 && (c.easeFactor ?? 2.5) >= 2.0).length;
  return Math.round((retained / allCards.length) * 100);
}

/** Aggregate dashboard metrics from IndexedDB study memory. */
export async function loadStudyDashboardStats(): Promise<StudyDashboardStats> {
  const sessions = await listStudyMemorySessions();
  return aggregateDashboardStats(sessions);
}

export function aggregateDashboardStats(sessions: StudyMemorySnapshot[]): StudyDashboardStats {
  const subjects = Array.from(new Set(sessions.map((s) => s.subjectLabel).filter(Boolean)));
  const quizzesCompleted = sessions.reduce((sum, s) => sum + s.totalQuizAttempts, 0);
  const flashcardsMemorized = sessions.reduce((sum, s) => sum + countMemorizedFlashcards(s), 0);
  const weakTopicsCount = sessions.reduce((sum, s) => sum + s.weakTopics.length, 0);

  const accuracies = sessions.filter((s) => s.totalQuizAttempts > 0).map((s) => s.recentQuizAccuracy);
  const avgQuizAccuracy =
    accuracies.length > 0 ? Math.round((accuracies.reduce((a, b) => a + b, 0) / accuracies.length) * 100) : 100;

  const activeSessions = sessions.filter((s) => s.totalQuizAttempts > 0 || (s.flashcardDeck?.length ?? 0) > 0);
  const hoursStudied = Math.round(((activeSessions.length * MINUTES_PER_SESSION_ESTIMATE) / 60) * 10) / 10;

  const accuracyTrend = sessions
    .filter((s) => s.totalQuizAttempts > 0)
    .slice(-8)
    .map((s) => Math.round(s.recentQuizAccuracy * 100));

  const flashcardRetention = computeFlashcardRetention(sessions);
  const reviewsDue = countDueReminders(computeStudyReminders(sessions));

  return {
    hoursStudied,
    quizzesCompleted,
    flashcardsMemorized,
    sessionsCount: sessions.length,
    subjects,
    avgQuizAccuracy,
    weakTopicsCount,
    accuracyTrend,
    flashcardRetention,
    reviewsDue,
  };
}
