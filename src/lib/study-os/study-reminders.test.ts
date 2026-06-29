import { describe, expect, it } from "vitest";
import {
  computeStudyReminders,
  countDueReminders,
  getNextSm2ReviewDue,
  getReminderBadgeCount,
} from "@/lib/study-os/study-reminders";
import type { StudyMemorySnapshot } from "@/lib/study-os/study-memory";

describe("Study Reminders", () => {
  const now = Date.now();

  it("schedules reminders from SM-2 due flashcards", () => {
    const sessions: StudyMemorySnapshot[] = [
      {
        sessionId: "s1",
        subjectLabel: "Biologia",
        topicsStudied: [],
        weakTopics: [],
        strongTopics: [],
        quizAttempts: [],
        recentQuizAccuracy: 1,
        totalQuizAttempts: 0,
        flashcardDeck: [
          {
            id: "c1",
            front: "A",
            back: "B",
            type: "definition",
            easeFactor: 2.5,
            intervalDays: 1,
            repetitions: 1,
            nextReviewAt: now - 60_000,
          },
          {
            id: "c2",
            front: "C",
            back: "D",
            type: "definition",
            easeFactor: 2.5,
            intervalDays: 3,
            repetitions: 2,
            nextReviewAt: now + 86_400_000,
          },
        ],
        lastStudiedAt: new Date().toISOString(),
      },
    ];

    const reminders = computeStudyReminders(sessions, null, now);
    expect(reminders.length).toBeGreaterThan(0);
    expect(reminders[0].type).toBe("flashcard");
    expect(reminders[0].label).toContain("flashcard");
    expect(countDueReminders(reminders, now)).toBe(1);
    expect(getReminderBadgeCount(reminders, now)).toBe(1);
  });

  it("returns next SM-2 review due timestamp", () => {
    const deck = [
      {
        id: "c1",
        front: "A",
        back: "B",
        type: "definition" as const,
        easeFactor: 2.5,
        intervalDays: 1,
        repetitions: 1,
        nextReviewAt: now - 1000,
      },
    ];
    expect(getNextSm2ReviewDue(deck, now)).toBe(now - 1000);
  });
});
