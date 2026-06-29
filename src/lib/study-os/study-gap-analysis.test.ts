import { describe, expect, it } from "vitest";
import { analyzeStudyGaps, gapRiskLabel } from "@/lib/study-os/study-gap-analysis";
import type { StudyQuizAttempt } from "@/lib/study-os/study-memory";

function mockAttempts(topics: Array<{ topic: string; correct: boolean }>): StudyQuizAttempt[] {
  return topics.map((t, i) => ({
    sessionId: "s1",
    questionIndex: i,
    question: `Q${i}`,
    correct: t.correct,
    selectedIndex: t.correct ? 0 : 1,
    correctIndex: 0,
    topic: t.topic,
    attemptedAt: new Date().toISOString(),
  }));
}

describe("Study Gap Analysis", () => {
  it("identifies weak and strong topics from quiz attempts", () => {
    const attempts = mockAttempts([
      { topic: "Fotosintesi", correct: false },
      { topic: "Fotosintesi", correct: false },
      { topic: "Mitocondrio", correct: true },
      { topic: "Mitocondrio", correct: true },
      { topic: "Mitocondrio", correct: true },
    ]);

    const gaps = analyzeStudyGaps({ quizAttempts: attempts });
    expect(gaps.weakTopics).toContain("Fotosintesi");
    expect(gaps.probabilitaSuccesso).toBeGreaterThan(0);
    expect(gaps.actions.length).toBeGreaterThan(0);
  });

  it("raises risk when accuracy is low", () => {
    const attempts = mockAttempts(
      Array.from({ length: 8 }, () => ({ topic: "Diritto", correct: false })),
    );
    const gaps = analyzeStudyGaps({ quizAttempts: attempts, examScore: 35 });
    expect(["alto", "critico"]).toContain(gaps.rischioBocciatura);
    expect(gapRiskLabel(gaps.rischioBocciatura)).toBeTruthy();
  });

  it("reports low risk with high exam score", () => {
    const attempts = mockAttempts(
      Array.from({ length: 6 }, (_, i) => ({ topic: `T${i}`, correct: true })),
    );
    const gaps = analyzeStudyGaps({ quizAttempts: attempts, examScore: 88 });
    expect(gaps.rischioBocciatura).toBe("basso");
    expect(gaps.probabilitaSuccesso).toBeGreaterThan(70);
  });
});
