import { describe, expect, it } from "vitest";
import { buildStudyIntelligencePlan } from "@/lib/study-os/study-intelligence-kernel";
import { buildStudyPlan, getStudyPlanModeLabel } from "@/lib/study-os/study-plan";

describe("Study Plan", () => {
  const plan = buildStudyIntelligencePlan({
    text: "Storia del Rinascimento umanesimo prospettiva classicismo ".repeat(12),
    subject: "history",
    objective: "exam_prep",
    level: 4,
  });

  it("generates sessions until exam date", () => {
    const start = new Date("2026-06-01");
    const exam = new Date("2026-06-14");
    const result = buildStudyPlan({
      materia: "Storia",
      examDate: exam,
      minutesPerDay: 45,
      kernelPlan: plan,
      startDate: start,
    });

    expect(result.daysRemaining).toBe(13);
    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.totalMinutes).toBeGreaterThan(0);
    expect(result.sessions[0].dayLabel.length).toBeGreaterThan(3);
  });

  it("schedules reviews every few days", () => {
    const start = new Date("2026-06-01");
    const exam = new Date("2026-06-21");
    const result = buildStudyPlan({
      materia: "Biologia",
      examDate: exam,
      minutesPerDay: 60,
      kernelPlan: plan,
      memory: {
        sessionId: "x",
        subjectLabel: "Biologia",
        topicsStudied: [],
        weakTopics: ["Cellula", "DNA"],
        strongTopics: [],
        quizAttempts: [],
        recentQuizAccuracy: 0.5,
        totalQuizAttempts: 0,
        lastStudiedAt: new Date().toISOString(),
      },
      startDate: start,
    });

    expect(result.reviewSchedule.length).toBeGreaterThan(0);
    const reviewSessions = result.sessions.filter((s) => s.isReview);
    expect(reviewSessions.length).toBeGreaterThan(0);
    expect(getStudyPlanModeLabel("exam_sim")).toBe("Simulazione esame");
  });
});
