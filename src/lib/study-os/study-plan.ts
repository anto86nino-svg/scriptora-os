import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import type { StudyMemorySnapshot } from "@/lib/study-os/study-memory";

export interface StudyPlanInput {
  materia: string;
  examDate: Date;
  minutesPerDay: number;
  kernelPlan?: StudyKernelPlan | null;
  memory?: StudyMemorySnapshot | null;
  startDate?: Date;
}

export interface StudyPlanSession {
  id: string;
  date: string;
  dayLabel: string;
  title: string;
  mode: "explain" | "quiz" | "flashcard" | "review" | "exam_sim" | "interrogation";
  minutes: number;
  priority: "alta" | "media" | "bassa";
  topics: string[];
  isReview: boolean;
}

export interface StudyPlanResult {
  materia: string;
  examDate: string;
  daysRemaining: number;
  totalSessions: number;
  totalMinutes: number;
  sessions: StudyPlanSession[];
  reviewSchedule: string[];
}

const MODE_MINUTES: Record<StudyPlanSession["mode"], number> = {
  explain: 25,
  quiz: 20,
  flashcard: 15,
  review: 20,
  exam_sim: 30,
  interrogation: 25,
};

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Generate a simple study calendar with priorities and spaced reviews. */
export function buildStudyPlan(input: StudyPlanInput): StudyPlanResult {
  const start = input.startDate ?? new Date();
  start.setHours(0, 0, 0, 0);
  const exam = new Date(input.examDate);
  exam.setHours(0, 0, 0, 0);

  const daysRemaining = Math.max(1, Math.ceil((exam.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  const weakTopics = input.memory?.weakTopics ?? [];
  const recommended = input.kernelPlan?.recommendedModes ?? ["explain", "quiz", "flashcard", "review"];

  const cycle: StudyPlanSession["mode"][] = [];
  for (const mode of recommended) {
    if (mode === "explain") cycle.push("explain");
    if (mode === "quiz" || mode === "interrogation") cycle.push(mode === "interrogation" ? "interrogation" : "quiz");
    if (mode === "flashcard" || mode === "review") cycle.push(mode === "review" ? "review" : "flashcard");
    if (mode === "exam_sim") cycle.push("exam_sim");
  }
  if (!cycle.length) cycle.push("explain", "quiz", "flashcard");

  const sessions: StudyPlanSession[] = [];
  const reviewSchedule: string[] = [];
  let sessionIdx = 0;

  for (let d = 0; d < daysRemaining; d++) {
    const dayDate = addDays(start, d);
    const isLastWeek = d >= daysRemaining - 7;
    const isReviewDay = d > 0 && d % 3 === 0;
    const modesToday: StudyPlanSession["mode"][] = [];

    if (isLastWeek && d === daysRemaining - 1) {
      modesToday.push("exam_sim");
    } else if (isReviewDay) {
      modesToday.push("review", "flashcard");
      reviewSchedule.push(`${formatDayLabel(dayDate)}: ripasso ${weakTopics.slice(0, 2).join(", ") || "generale"}`);
    } else {
      modesToday.push(cycle[d % cycle.length]);
      if (input.minutesPerDay >= 45) modesToday.push(cycle[(d + 1) % cycle.length]);
    }

    let minutesLeft = input.minutesPerDay;
    for (const mode of modesToday) {
      if (minutesLeft < 10) break;
      const minutes = Math.min(MODE_MINUTES[mode], minutesLeft);
      minutesLeft -= minutes;
      const topics =
        weakTopics.length && (mode === "review" || mode === "flashcard")
          ? weakTopics.slice(0, 3)
          : [input.materia];

      sessions.push({
        id: `session-${sessionIdx++}`,
        date: isoDate(dayDate),
        dayLabel: formatDayLabel(dayDate),
        title: sessionTitle(mode, input.materia, isLastWeek),
        mode,
        minutes,
        priority: weakTopics.length && mode === "review" ? "alta" : isLastWeek ? "alta" : "media",
        topics,
        isReview: mode === "review" || isReviewDay,
      });
    }
  }

  const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

  return {
    materia: input.materia,
    examDate: isoDate(exam),
    daysRemaining,
    totalSessions: sessions.length,
    totalMinutes,
    sessions,
    reviewSchedule,
  };
}

function sessionTitle(mode: StudyPlanSession["mode"], materia: string, examWeek: boolean): string {
  const labels: Record<StudyPlanSession["mode"], string> = {
    explain: `Riassunto · ${materia}`,
    quiz: `Quiz · ${materia}`,
    flashcard: `Flashcard · ${materia}`,
    review: `Ripasso mirato · ${materia}`,
    exam_sim: examWeek ? `Simulazione esame · ${materia}` : `Verifica · ${materia}`,
    interrogation: `Interrogazione · ${materia}`,
  };
  return labels[mode];
}

export function getStudyPlanModeLabel(mode: StudyPlanSession["mode"]): string {
  const labels: Record<StudyPlanSession["mode"], string> = {
    explain: "Riassunto",
    quiz: "Quiz",
    flashcard: "Flashcard",
    review: "Ripasso",
    exam_sim: "Simulazione esame",
    interrogation: "Interrogazione",
  };
  return labels[mode];
}
