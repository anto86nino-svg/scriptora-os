import type { BookConfig, BookProject } from "@/types/book";
import {
  isTemplateChapterTitle,
  resolveIntelligentChapterTitle,
  type ChapterTitleEngineContext,
} from "@/lib/chapter-title-engine-v2";

export type ChapterTitleContext = ChapterTitleEngineContext;

export { isTemplateChapterTitle };

const GENERIC_TITLE_RE =
  /^(?:chapter|capitolo|chapitre|kapitel|capitulo|capitulo|cap\.?|ch\.?)\s*\d+$/i;
const PLACEHOLDER_TITLE_RE =
  /^(?:untitled|senza titolo|to be generated|da generare|chapter title|titolo capitolo|titolo del capitolo)$/i;
const CHAPTER_PREFIX_RE =
  /^(?:chapter|capitolo|chapitre|kapitel|capitulo|capitulo|cap\.?|ch\.?)\s*\d+\s*(?:[:.\-–—·]\s*)?/i;

function cleanTitle(value: unknown): string {
  return String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLoose(value: string): string {
  return cleanTitle(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function stripChapterTitlePrefix(value: unknown): string {
  return cleanTitle(value)
    .replace(CHAPTER_PREFIX_RE, "")
    .replace(/^\d+\s*(?:[.)\-:–—·]\s*)?/, "")
    .trim();
}

export function isGenericChapterTitle(value: unknown, language?: string): boolean {
  const cleaned = cleanTitle(value);
  if (!cleaned) return true;
  const loose = normalizeLoose(cleaned);
  return (
    /^\d+$/.test(loose) ||
    GENERIC_TITLE_RE.test(loose) ||
    PLACEHOLDER_TITLE_RE.test(loose) ||
    isTemplateChapterTitle(cleaned, language)
  );
}

export function resolveChapterTitle(
  rawTitle: unknown,
  index: number,
  context: ChapterTitleContext = {},
): string {
  return resolveIntelligentChapterTitle(rawTitle, index, context);
}

export function chapterLabelWord(language?: string): string {
  switch (language) {
    case "English":
      return "Chapter";
    case "Spanish":
      return "Capitulo";
    case "French":
      return "Chapitre";
    case "German":
      return "Kapitel";
    default:
      return "Capitolo";
  }
}

export function formatChapterDisplayTitle(
  index: number,
  rawTitle: unknown,
  context: ChapterTitleContext = {},
): string {
  const language = context.language || context.config?.language;
  const title = resolveChapterTitle(rawTitle, index, context);
  return `${chapterLabelWord(language)} ${index + 1}: ${title}`;
}

export function normalizeProjectChapterTitles(project: BookProject): BookProject {
  const totalChapters = project.config?.numberOfChapters || project.blueprint?.chapterOutlines?.length || project.chapters?.length || 0;
  const resolvedTitles: string[] = [];
  const blueprint = project.blueprint
    ? {
        ...project.blueprint,
        chapterOutlines: project.blueprint.chapterOutlines.map((outline, index) => {
          const title = resolveChapterTitle(outline?.title, index, {
            config: project.config,
            summary: outline?.summary,
            totalChapters,
            blueprint: project.blueprint,
            previousTitles: resolvedTitles,
          });
          resolvedTitles.push(title);
          return { ...outline, title };
        }),
      }
    : project.blueprint;

  const chapters = (project.chapters || []).map((chapter, index) => {
    const outline = blueprint?.chapterOutlines?.[index];
    return {
      ...chapter,
      title: resolveChapterTitle(chapter?.title || outline?.title, index, {
        config: project.config,
        summary: outline?.summary,
        totalChapters,
        blueprint: project.blueprint,
        previousTitles: resolvedTitles.slice(0, index),
      }),
    };
  });

  return { ...project, blueprint, chapters };
}
