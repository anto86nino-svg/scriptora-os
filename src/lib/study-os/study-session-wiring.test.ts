import { describe, expect, it } from "vitest";
import { recordQuizAttempt } from "@/lib/study-os/study-memory";
import {
  buildSessionKernelPlan,
  isPrimaryModeSection,
  studyModeToSection,
} from "@/lib/study-os/study-session-wiring";

const SAMPLE_TEXT = `
Il codice civile disciplina le obbligazioni nascenti da contratto.
L'obbligazione è un vincolo giuridico che impone a un soggetto di dare, fare o non fare.
Il contratto si perfeziona con consenso, oggetto, causa e forma quando richiesta.
La responsabilità contrattuale presuppone inadempimento e danno risarcibile.
`.trim();

describe("study session wiring", () => {
  it("maps exam_prep objective to quiz or exam section", () => {
    const plan = buildSessionKernelPlan({
      text: SAMPLE_TEXT,
      sourceName: "diritto.pdf",
      studySubject: "law",
      studyGoal: "exam_prep",
      difficultyLevel: 5,
      intent: {
        studyMaterialType: "pdf_document",
        studySubject: "law",
        studyGoal: "exam_prep",
        difficultyLevel: 5,
      },
    });

    expect(plan).not.toBeNull();
    expect(plan!.quizDifficulty).toBe("esame");
    expect(plan!.recommendedModes).toContain("exam_sim");
    expect(["quiz", "exam", "flashcards", "summary"]).toContain(studyModeToSection(plan!.primaryMode));
  });

  it("adapts primary mode toward review when memory has weak topics", async () => {
    const sessionId = `wiring-${Date.now()}`;
    await recordQuizAttempt(sessionId, "Diritto", {
      questionIndex: 0,
      question: "Cos'è l'obbligazione?",
      correct: false,
      selectedIndex: 1,
      correctIndex: 0,
      topic: "obbligazioni",
    });
    const memory = await recordQuizAttempt(sessionId, "Diritto", {
      questionIndex: 1,
      question: "Definizione obbligazione",
      correct: false,
      selectedIndex: 2,
      correctIndex: 0,
      topic: "obbligazioni",
    });

    const plan = buildSessionKernelPlan({
      text: SAMPLE_TEXT,
      sourceName: "diritto.pdf",
      studySubject: "law",
      studyGoal: "complete_summary",
      difficultyLevel: 3,
      intent: { studySubject: "law", studyGoal: "complete_summary", difficultyLevel: 3 },
      memory,
    });

    expect(plan!.primaryMode).toBe("review");
    expect(isPrimaryModeSection("flashcards", plan)).toBe(true);
    expect(memory.weakTopics).toContain("obbligazioni");
  });

  it("returns null plan for short material", () => {
    const plan = buildSessionKernelPlan({
      text: "troppo breve",
      sourceName: "x.txt",
      studySubject: "auto",
      studyGoal: "quiz",
      difficultyLevel: 2,
      intent: {},
    });
    expect(plan).toBeNull();
  });
});
