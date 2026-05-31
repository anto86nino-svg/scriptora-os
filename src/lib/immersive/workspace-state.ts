import type { BookProject } from "@/types/book";
import { getBookTotalWords } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";
import {
  resolveCurrentChapterLabel,
  resolveProjectWordCount,
} from "@/lib/immersive/writer-presence";
import { resolveGenreTheme } from "@/lib/immersive/workspace-os-intelligence";

export type WorkspaceState = "empty" | "drafting" | "refining" | "publishing" | "complete";

export type NarrativeWorkspaceSnapshot = {
  state: WorkspaceState;
  title: string | null;
  genre: string | null;
  authorPenName: string | null;
  wordCount: number;
  targetWords: number;
  progressPercent: number;
  currentChapter: string | null;
  lastSessionIso: string | null;
  editorialScore: number | null;
  characterCount: number;
  chapterTotal: number;
  chaptersFilled: number;
  hasBlueprint: boolean;
  phase: string | null;
  genreTheme: string;
  chapterFilledFlags: boolean[];
  activeChapterIndex: number;
};

function chapterProgressPercent(project: BookProject): number {
  const chapters = project.chapters ?? [];
  const total = chapters.length || project.config?.numberOfChapters || 0;
  if (total <= 0) return 0;
  const withContent = chapters.filter((c) => (c.content?.trim().length ?? 0) > 120).length;
  return Math.min(100, Math.round((withContent / total) * 100));
}

function allChaptersDrafted(project: BookProject): boolean {
  const target = project.config?.numberOfChapters || project.chapters?.length || 0;
  if (target <= 0) return false;
  const done = (project.chapters || []).filter((c) => (c.content || "").trim().length > 50).length;
  return done >= target;
}

export function resolveEditorialScore(project: BookProject | null | undefined): number | null {
  if (!project) return null;
  const values = (project.chapters || [])
    .map((chapter) => {
      const c = chapter as { aiRating?: { score?: number }; qualityRating?: number };
      if (typeof c.aiRating?.score === "number") return Math.round(c.aiRating.score * 20);
      if (typeof c.qualityRating === "number") return Math.round(c.qualityRating * 20);
      return null;
    })
    .filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

/** Pick the book the narrative workspace should center on. */
export function resolveFocusProject(
  projects: BookProject[],
  activeWritingProject: BookProject | null,
): BookProject | null {
  if (activeWritingProject) return activeWritingProject;
  if (!projects.length) return null;
  const sorted = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const incomplete = sorted.find((p) => !isProjectComplete(p));
  return incomplete ?? sorted[0] ?? null;
}

export function resolveWorkspaceState(
  projectsCount: number,
  project: BookProject | null | undefined,
): WorkspaceState {
  if (projectsCount === 0 || !project) return "empty";
  if (isProjectComplete(project)) return "complete";

  const pct = chapterProgressPercent(project);
  if (allChaptersDrafted(project) || pct >= 85) return "publishing";
  if (pct >= 75) return "refining";
  return "drafting";
}

export function buildNarrativeWorkspaceSnapshot(
  projectsCount: number,
  project: BookProject | null | undefined,
  authorPenName?: string | null,
): NarrativeWorkspaceSnapshot {
  const emptySnapshot = {
    state: "empty" as const,
    title: null,
    genre: null,
    authorPenName: null,
    wordCount: 0,
    targetWords: 0,
    progressPercent: 0,
    currentChapter: null,
    lastSessionIso: null,
    editorialScore: null,
    characterCount: 0,
    chapterTotal: 0,
    chaptersFilled: 0,
    hasBlueprint: false,
    phase: null,
    genreTheme: "default",
    chapterFilledFlags: [] as boolean[],
    activeChapterIndex: 0,
  };

  const state = resolveWorkspaceState(projectsCount, project);
  if (state === "empty" || !project) {
    return emptySnapshot;
  }

  const chapters = project.chapters ?? [];
  const chapterTotal = chapters.length || project.config?.numberOfChapters || 0;
  const chapterFilledFlags = Array.from({ length: chapterTotal }, (_, i) =>
    (chapters[i]?.content?.trim().length ?? 0) > 120,
  );
  const chaptersFilled = chapterFilledFlags.filter(Boolean).length;
  const activeChapterIndex = chapterFilledFlags.findIndex((f) => !f);
  const idx = activeChapterIndex >= 0 ? activeChapterIndex : Math.max(0, chapterTotal - 1);

  const targetWords = getBookTotalWords(project.config);
  const progressPercent =
    project.phase === "complete" || isProjectComplete(project)
      ? 100
      : chapterProgressPercent(project);

  const configAuthor =
    project.config.authorIdentity?.penName ||
    project.config.authorName ||
    project.config.author ||
    null;

  return {
    state,
    title: project.config.title?.trim() || null,
    genre: project.config.genre || project.config.subcategory || null,
    authorPenName: authorPenName?.trim() || configAuthor?.trim() || null,
    wordCount: resolveProjectWordCount(project),
    targetWords,
    progressPercent,
    currentChapter: resolveCurrentChapterLabel(project),
    lastSessionIso: project.updatedAt || null,
    editorialScore: resolveEditorialScore(project),
    characterCount: project.config.characters?.length ?? 0,
    chapterTotal,
    chaptersFilled,
    hasBlueprint: !!project.blueprint?.overview?.trim(),
    phase: project.phase ?? null,
    genreTheme: resolveGenreTheme(project.config.genre || project.config.subcategory),
    chapterFilledFlags,
    activeChapterIndex: idx,
  };
}
