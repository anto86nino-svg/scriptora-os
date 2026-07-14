import type { BookConfig, BookProject, Chapter, SubChapter } from "@/types/book";
import { resolveChapterTitle } from "@/lib/chapter-titles";

export type ChapterBlueprintSeedLike = {
  id?: string;
  chapter?: number;
  title?: string;
  summary?: string;
  purpose?: string;
  goal?: string;
  conflict?: string;
  hook?: string;
  expectedSetting?: string;
  subchapters?: SubChapter[];
};

export function safeSubchapters(chapter?: Partial<Chapter> | null): SubChapter[] {
  return Array.isArray(chapter?.subchapters) ? chapter.subchapters : [];
}

export function normalizeChapterForGeneration(
  chapter: Partial<Chapter> | undefined,
  index: number,
  bookConfig?: BookConfig,
  seed?: ChapterBlueprintSeedLike,
): Chapter {
  const subchaptersEnabled = Boolean(bookConfig?.subchaptersEnabled);
  const resolvedTitle =
    String(chapter?.title || seed?.title || "").trim() ||
    resolveChapterTitle("", index, {
      config: bookConfig,
      summary: seed?.summary || seed?.purpose,
      totalChapters: bookConfig?.numberOfChapters,
    });

  const baseSubs = safeSubchapters(chapter);
  const seedSubs = Array.isArray(seed?.subchapters) ? seed.subchapters : [];

  return {
    title: resolvedTitle,
    content: String(chapter?.content ?? ""),
    status: chapter?.status ?? "idle",
    subchapters: subchaptersEnabled
      ? (baseSubs.length ? baseSubs : seedSubs).map((sub) => ({
          title: String(sub?.title ?? "").trim() || "Scena",
          content: String(sub?.content ?? ""),
        }))
      : [],
    lengthOverride: chapter?.lengthOverride,
    rewriteInProgress: chapter?.rewriteInProgress,
    lastGenerationId: chapter?.lastGenerationId,
    rewriteAttemptCount: chapter?.rewriteAttemptCount,
    qualityRating: chapter?.qualityRating,
    aiRating: chapter?.aiRating,
    editorialAnalysis: chapter?.editorialAnalysis,
  };
}

export function normalizeProjectChapters(project: BookProject): BookProject {
  const count = Math.max(
    project.config?.numberOfChapters || 0,
    project.blueprint?.chapterOutlines?.length || 0,
    project.chapters?.length || 0,
  );
  if (count <= 0) {
    return {
      ...project,
      chapters: (project.chapters || []).map((ch, i) =>
        normalizeChapterForGeneration(ch, i, project.config),
      ),
    };
  }

  const chapters: Chapter[] = [];
  for (let i = 0; i < count; i += 1) {
    const existing = project.chapters?.[i];
    const outline = project.blueprint?.chapterOutlines?.[i];
    const seed: ChapterBlueprintSeedLike | undefined = outline
      ? {
          title: outline.title,
          summary: outline.summary,
          subchapters: Array.isArray(outline.subchapters)
            ? outline.subchapters.map((subchapter) => ({
                title: String(subchapter?.title || ""),
                content: "",
              }))
            : [],
        }
      : undefined;
    chapters.push(normalizeChapterForGeneration(existing, i, project.config, seed));
  }

  return { ...project, chapters };
}

export function normalizePreviousChaptersForGeneration(chapters: Chapter[]): Chapter[] {
  return chapters.map((ch, i) => normalizeChapterForGeneration(ch, i));
}
