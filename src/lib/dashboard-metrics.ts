import type { BookProject } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";

function countWords(text?: string): number {
  if (!text) return 0;
  const parts = text.split(/\s+/);
  let n = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) n++;
  }
  return n;
}

function wordCountForProject(project: BookProject): number {
  const chapters = project.chapters || [];
  let sum = 0;
  for (let i = 0; i < chapters.length; i++) {
    sum += countWords(chapters[i].content);
  }
  return sum;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export interface DashboardMetrics {
  completedCount: number;
  draftCount: number;
  totalChapters: number;
  totalWords: number;
  wordsToday: number;
  writingStreak: number;
  aiQualityScore: number | null;
  lastProjectProgress: number;
  lastProjectDoneChapters: number;
  lastProjectTargetChapters: number;
}

export function computeDashboardMetrics(
  projects: BookProject[],
  lastProject: BookProject | null | undefined,
): DashboardMetrics {
  let completedCount = 0;
  let draftCount = 0;
  let totalChapters = 0;
  let totalWords = 0;
  const todayKey = dayKey(new Date());
  let wordsToday = 0;
  const updateDays = new Set<string>();
  const aiQualityValues: number[] = [];

  for (let p = 0; p < projects.length; p++) {
    const project = projects[p];
    const complete = isProjectComplete(project);
    if (complete) completedCount++;
    else draftCount++;

    const chapters = project.chapters || [];
    totalChapters += chapters.length;

    const projectWords = wordCountForProject(project);
    totalWords += projectWords;

    const updated = new Date(project.updatedAt);
    if (!Number.isNaN(updated.getTime())) {
      const key = dayKey(updated);
      updateDays.add(key);
      if (key === todayKey) wordsToday += projectWords;
    }

    for (let c = 0; c < chapters.length; c++) {
      const chapter = chapters[c] as { aiRating?: { score?: number }; qualityRating?: number };
      if (typeof chapter?.aiRating?.score === "number") {
        aiQualityValues.push(Math.round(chapter.aiRating.score * 20));
      } else if (typeof chapter?.qualityRating === "number") {
        aiQualityValues.push(Math.round(chapter.qualityRating * 20));
      }
    }
  }

  let writingStreak = 0;
  for (const cursor = new Date(); updateDays.has(dayKey(cursor)); cursor.setDate(cursor.getDate() - 1)) {
    writingStreak += 1;
  }

  const aiQualityScore = aiQualityValues.length
    ? Math.round(aiQualityValues.reduce((sum, value) => sum + value, 0) / aiQualityValues.length)
    : null;

  let lastProjectDoneChapters = 0;
  let lastProjectTargetChapters = 0;
  let lastProjectProgress = 0;

  if (lastProject) {
    const chapters = lastProject.chapters || [];
    for (let i = 0; i < chapters.length; i++) {
      if ((chapters[i].content || "").trim().length > 50) lastProjectDoneChapters++;
    }
    lastProjectTargetChapters = lastProject.config?.numberOfChapters || chapters.length || 0;
    lastProjectProgress =
      lastProject.phase === "complete"
        ? 100
        : lastProjectTargetChapters > 0
          ? Math.min(100, Math.round((lastProjectDoneChapters / lastProjectTargetChapters) * 100))
          : 0;
  }

  return {
    completedCount,
    draftCount,
    totalChapters,
    totalWords,
    wordsToday,
    writingStreak,
    aiQualityScore,
    lastProjectProgress,
    lastProjectDoneChapters,
    lastProjectTargetChapters,
  };
}
