import { describe, expect, it } from "vitest";
import { buildQuizPerformanceReport } from "@/lib/study-ux";
import type { QuizQuestion } from "@/lib/study-session";

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
  });
});
