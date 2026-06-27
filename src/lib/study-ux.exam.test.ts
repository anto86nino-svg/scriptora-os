import { describe, expect, it } from "vitest";
import { buildAdaptiveCoachSnapshot, buildQuizPerformanceReport } from "@/lib/study-ux";
import type { QuizQuestion, StudySessionResult } from "@/lib/study-session";

const quiz: QuizQuestion[] = [
  { question: "Che cosa indica la causa?", options: ["Origine", "Effetto"], answer: 0, explanation: "La causa e' l'origine." },
  { question: "Che cosa indica la conseguenza?", options: ["Origine", "Risultato"], answer: 1, explanation: "La conseguenza e' il risultato." },
  { question: "Come si collega un concetto?", options: ["Isolando", "Con esempi"], answer: 1, explanation: "Serve un esempio." },
  { question: "Quale risposta e' piu completa?", options: ["Definizione", "Definizione, collegamento, esempio"], answer: 1, explanation: "Serve struttura." },
];

describe("Study OS exam report", () => {
  it("returns percentage, tenths, thirtieths, judgement, errors and review minutes", () => {
    const report = buildQuizPerformanceReport(quiz, { 0: 0, 1: 0, 2: 1, 3: 1 }, ["causa", "conseguenza"]);

    expect(report.score).toBe(75);
    expect(report.grade10).toBe(7.5);
    expect(report.grade30).toBe(23);
    expect(report.judgement).toBe("Buono");
    expect(report.errors[0]).toContain("risposta data");
    expect(report.reviewMinutes).toBeGreaterThan(0);
    expect(report.passProbability).toBeGreaterThan(0);
    expect(report.areasToReview.length).toBeGreaterThan(0);
  });

  it("updates the knowledge map from quiz answers, oral scores and flashcards", () => {
    const result = {
      title: "Cause ed effetti",
      sourceName: "test.txt",
      words: 120,
      contentType: "study_notes",
      subjectLabel: "Storia",
      studyMode: "Studio guidato",
      detectedSubject: "Storia",
      difficulty: "medium",
      lightSummary: "Cause ed effetti.",
      mediumSummary: "Cause ed effetti.",
      proSummary: "Cause ed effetti.",
      studyNotesPro: "Cause ed effetti.",
      openQuestions: [{ question: "Spiega la causa principale?", answerGuide: "Definisci e collega." }],
      difficultWords: [],
      flashcards: [{ front: "Che cosa indica la causa?", back: "Origine del fenomeno." }],
      quiz,
      keyConcepts: ["causa", "conseguenza"],
      knowledgeMap: [
        { concept: "causa", mastery: 45, status: "weak", reason: "Da verificare", nextAction: "Ripassa causa" },
        { concept: "conseguenza", mastery: 45, status: "weak", reason: "Da verificare", nextAction: "Ripassa conseguenza" },
      ],
    } satisfies StudySessionResult;

    const coach = buildAdaptiveCoachSnapshot({
      result,
      quizAnswers: { 0: 0, 1: 1 },
      openEvaluations: { 0: { score: 82 } },
      flashcardConfidence: { 0: "known" },
    });

    expect(coach.knowledgeMap[0].mastery).toBeGreaterThan(45);
    expect(coach.estimatedPassProbability).toBeGreaterThan(45);
    expect(coach.nextAction).toContain("Prossimo passo");
  });
});
