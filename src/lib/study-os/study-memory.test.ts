import { describe, expect, it } from "vitest";
import {
  getStudyMemoryAdaptation,
  recordQuizAttempt,
} from "@/lib/study-os/study-memory";

describe("Study Memory", () => {
  const sessionId = `test-session-${Date.now()}`;

  it("tracks weak topics from incorrect attempts", async () => {
    await recordQuizAttempt(sessionId, "Diritto", {
      questionIndex: 0,
      question: "Cosa regola il codice civile?",
      correct: false,
      selectedIndex: 1,
      correctIndex: 0,
      topic: "obbligazioni",
    });
    await recordQuizAttempt(sessionId, "Diritto", {
      questionIndex: 1,
      question: "Definisci obbligazione",
      correct: false,
      selectedIndex: 2,
      correctIndex: 0,
      topic: "obbligazioni",
    });

    const snapshot = await recordQuizAttempt(sessionId, "Diritto", {
      questionIndex: 2,
      question: "Cos'è il contratto?",
      correct: true,
      selectedIndex: 0,
      correctIndex: 0,
      topic: "contratti",
    });

    expect(snapshot.weakTopics).toContain("obbligazioni");
    expect(snapshot.topicsStudied).toContain("contratti");
    expect(snapshot.recentQuizAccuracy).toBeLessThan(1);
  });

  it("exposes adaptation hints for kernel", async () => {
    const snapshot = await recordQuizAttempt(`adapt-${Date.now()}`, "Fisica", {
      questionIndex: 0,
      question: "Formula forza?",
      correct: false,
      selectedIndex: 2,
      correctIndex: 0,
      topic: "dinamica",
    });
    const adaptation = getStudyMemoryAdaptation(snapshot);
    expect(adaptation.recentQuizAccuracy).toBeLessThanOrEqual(1);
    expect(getStudyMemoryAdaptation(null).weakTopics).toEqual([]);
  });
});
