import { describe, expect, it } from "vitest";
import { aggregateDashboardStats } from "@/lib/study-os/study-dashboard";

describe("Study Dashboard", () => {
  it("aggregates stats from memory snapshots", () => {
    const stats = aggregateDashboardStats([
      {
        sessionId: "a",
        subjectLabel: "Biologia",
        topicsStudied: ["Cellula"],
        weakTopics: ["DNA"],
        strongTopics: ["Mitocondrio"],
        quizAttempts: [
          {
            sessionId: "a",
            questionIndex: 0,
            question: "Q",
            correct: true,
            selectedIndex: 0,
            correctIndex: 0,
            attemptedAt: new Date().toISOString(),
          },
        ],
        recentQuizAccuracy: 1,
        totalQuizAttempts: 3,
        flashcardDeck: [
          {
            id: "c1",
            front: "A",
            back: "B",
            type: "definition",
            easeFactor: 2.5,
            intervalDays: 6,
            repetitions: 3,
            nextReviewAt: Date.now(),
          },
        ],
        lastStudiedAt: new Date().toISOString(),
      },
      {
        sessionId: "b",
        subjectLabel: "Storia",
        topicsStudied: [],
        weakTopics: [],
        strongTopics: [],
        quizAttempts: [],
        recentQuizAccuracy: 1,
        totalQuizAttempts: 0,
        lastStudiedAt: new Date().toISOString(),
      },
    ]);

    expect(stats.quizzesCompleted).toBe(3);
    expect(stats.flashcardsMemorized).toBe(1);
    expect(stats.subjects).toContain("Biologia");
    expect(stats.subjects).toContain("Storia");
    expect(stats.hoursStudied).toBeGreaterThan(0);
    expect(stats.accuracyTrend.length).toBeGreaterThan(0);
    expect(stats.flashcardRetention).toBeGreaterThan(0);
  });
});
