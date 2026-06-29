import { describe, expect, it } from "vitest";
import { analyzeStudyMaterial } from "@/lib/study-session";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import { buildStudyQuizPack } from "@/lib/study-os/study-quiz-engine";
import {
  buildExamSimReport,
  EXAM_PASS_THRESHOLD,
  formatExamCountdown,
  resolveExamTimedOut,
  selectExamSimQuestions,
  shouldAutoSubmitExam,
  toCertificateInput,
} from "@/lib/study-os/study-exam-simulation";

describe("Study Exam Simulation", () => {
  const result = analyzeStudyMaterial(
    "Il codice civile regola obbligazioni, contratti e responsabilità. ".repeat(10),
    "diritto.pdf",
    { studySubject: "law", studyGoal: "exam_prep" },
  );
  const plan = buildStudyIntelligencePlan({
    text: result.lightSummary,
    subject: "law",
    objective: "exam_prep",
    level: 5,
  });
  const pack = buildStudyQuizPack(result, plan);

  it("selects exam-tier questions when kernel recommends exam_sim", () => {
    const selected = selectExamSimQuestions(pack.items, plan, 8);
    expect(selected.length).toBeGreaterThan(0);
    expect(selected.length).toBeLessThanOrEqual(8);
  });

  it("scores exam with Italian grades and lacune", () => {
    const quiz = pack.items.slice(0, 6);
    const answers: Record<number, number> = {};
    quiz.forEach((q, i) => {
      answers[i] = i < 4 ? q.answer : (q.answer + 1) % Math.max(1, q.options.length);
    });

    const report = buildExamSimReport({ quiz, answers, kernelPlan: plan });
    expect(report.score).toBeGreaterThan(0);
    expect(report.grade10).toBeGreaterThan(0);
    expect(report.grade30).toBeGreaterThan(0);
    expect(report.judgement.length).toBeGreaterThan(5);
    expect(report.lacune.length).toBeGreaterThan(0);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });

  it("marks certificate eligible when above threshold", () => {
    const quiz = pack.items.slice(0, 4);
    const answers: Record<number, number> = {};
    quiz.forEach((q, i) => {
      answers[i] = q.answer;
    });
    const report = buildExamSimReport({ quiz, answers, kernelPlan: plan });
    expect(report.score).toBe(100);
    expect(report.certificateEligible).toBe(true);
    expect(report.passed).toBe(true);

    const cert = toCertificateInput(report, "Mario Rossi", "Diritto", "proj-1");
    expect(cert.studentName).toBe("Mario Rossi");
    expect(cert.grade10).toBe(10);
  });

  it("formats countdown and triggers auto-submit at limit", () => {
    expect(formatExamCountdown(125)).toBe("2:05");
    expect(formatExamCountdown(0)).toBe("0:00");
    expect(shouldAutoSubmitExam(299, 300)).toBe(false);
    expect(shouldAutoSubmitExam(300, 300)).toBe(true);
    expect(shouldAutoSubmitExam(301, 300)).toBe(true);
    expect(shouldAutoSubmitExam(10, null)).toBe(false);
  });

  it("resolves timed-out exam with partial answers", () => {
    const result = resolveExamTimedOut({ 0: 1, 1: 2 }, 5);
    expect(result.timedOut).toBe(true);
    expect(result.unanswered).toBe(3);
    expect(result.answers[0]).toBe(1);
  });

  it("fails below pass threshold", () => {
    const quiz = pack.items.slice(0, 4);
    const answers: Record<number, number> = {};
    quiz.forEach((q, i) => {
      answers[i] = (q.answer + 1) % Math.max(1, q.options.length);
    });
    const report = buildExamSimReport({ quiz, answers, kernelPlan: plan });
    expect(report.score).toBeLessThan(EXAM_PASS_THRESHOLD);
    expect(report.certificateEligible).toBe(false);
  });
});
