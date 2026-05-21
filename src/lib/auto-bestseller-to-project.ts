import { AutoBestsellerResult, AutoBestsellerInput } from "@/services/autoBestsellerService";
import { BookProject, BookConfig, Chapter, BookBlueprint, Genre, Language } from "@/types/book";
import { createProjectId } from "@/lib/storage";
import type { LiveBook } from "@/hooks/useAutoBestseller";
import { normalizeProjectChapterTitles } from "@/lib/chapter-titles";

const ALLOWED_GENRES: Genre[] = [
  "self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy", "business", "memoir",
];
const ALLOWED_LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];


function charactersFromText(text?: string): any[] {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\n{2,}|^\s*[-•]\s*/gm)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((block) => {
      const firstLine = block.split("\n")[0]?.trim() || "";
      const name = firstLine.replace(/^Nome[:\-]\s*/i, "").split(/[,.—-]/)[0]?.trim() || firstLine;
      return {
        name,
        role: "",
        personality: block,
        strictRules: "Never rename this character. Preserve role, personality, relationships and continuity."
      };
    });
}


function normalizeGenre(g?: string): Genre {
  if (!g) return "self-help";
  const slug = g.toLowerCase().replace(/\s+/g, "-");
  return (ALLOWED_GENRES.find((x) => x === slug) ?? "self-help") as Genre;
}
function normalizeLanguage(l?: string): Language {
  if (!l) return "English";
  const cap = l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
  return (ALLOWED_LANGUAGES.find((x) => x === cap) ?? "English") as Language;
}

export function autoBestsellerToProject(
  result: AutoBestsellerResult,
  input?: Partial<AutoBestsellerInput>,
): BookProject {
  const now = new Date().toISOString();
  const genre = normalizeGenre(input?.genre);
  const language = normalizeLanguage(input?.language);
  const authorName = (input?.authorName || "").trim();
  const characters = charactersFromText(input?.charactersText || (result as any)?.characterBible);

const config: BookConfig = {
    title: result.title || "Untitled Bestseller",
    subtitle: result.subtitle || "",
    authorName,
    author: authorName,
    writerName: authorName,
    tone: input?.tone || "Engaging, authoritative, accessible",
    authorStyle: input?.tone || "",
    language,
    genre,
    category: "Self Help",
    subcategory: input?.subcategory || "",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: result.chapters?.length || input?.numberOfChapters || 8,
    subchaptersEnabled: false,
    characters,
  };

  const blueprint: BookBlueprint | null = result.blueprint
    ? {
        overview: result.blueprint.overview || "",
        themes: result.blueprint.themes || [],
        emotionalArc: result.blueprint.emotionalArc || "",
        chapterOutlines:
          result.blueprint.chapterOutlines?.map((c: any) => ({
            title: c.title || "",
            summary: c.summary || "",
            subchapters: c.subchapters || [],
          })) ||
          result.chapters.map((c) => ({ title: c.title, summary: "" })),
      }
    : null;

  const chapters: Chapter[] = result.chapters.map((c) => ({
    title: c.title || "Untitled Chapter",
    content: c.content || "",
    subchapters: [],
    status: "completed",
    qualityRating: typeof c.finalScore === "number" ? c.finalScore : undefined,
  }));

  return normalizeProjectChapterTitles({
    id: createProjectId(),
    config,
    blueprint,
    frontMatter: null,
    chapters,
    backMatter: null,
    phase: "complete",
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Convert in-progress live state to a partial BookProject (auto-save during generation).
 * Reuses existing projectId if provided so we update the same row.
 */
export function liveBookToPartialProject(
  liveBook: LiveBook,
  input?: Partial<AutoBestsellerInput>,
  existingId?: string,
): BookProject {
  const now = new Date().toISOString();
  const genre = normalizeGenre(input?.genre);
  const language = normalizeLanguage(input?.language);
  const authorName = (input?.authorName || "").trim();
  const characters = charactersFromText(input?.charactersText || (liveBook as any)?.characterBible);

const config: BookConfig = {
    title: liveBook.title || input?.prefilledTitle || "Generating…",
    subtitle: liveBook.subtitle || input?.prefilledSubtitle || "",
    authorName,
    author: authorName,
    writerName: authorName,
    tone: input?.tone || "Engaging, authoritative, accessible",
    authorStyle: input?.tone || "",
    language,
    genre,
    category: "Self Help",
    subcategory: input?.subcategory || "",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: input?.numberOfChapters || liveBook.outlines?.length || liveBook.chapters.length || 8,
    subchaptersEnabled: false,
    characters,
  };

  const blueprint: BookBlueprint | null = liveBook.outlines
    ? {
        overview: "",
        themes: [],
        emotionalArc: "",
        chapterOutlines: liveBook.outlines.map((o) => ({
          title: o.title,
          summary: o.summary || "",
          subchapters: [],
        })),
      }
    : null;

  const chapters: Chapter[] = liveBook.chapters
    .filter((c) => c.phase === "done" && c.content)
    .map((c) => ({
      title: c.title || "Untitled Chapter",
      content: c.content || "",
      subchapters: [],
      status: "completed" as const,
      qualityRating: typeof c.score === "number" ? c.score : undefined,
    }));

  return normalizeProjectChapterTitles({
    id: existingId || createProjectId(),
    config,
    blueprint,
    frontMatter: null,
    chapters,
    backMatter: null,
    phase: chapters.length > 0 ? "chapters" : "blueprint",
    createdAt: now,
    updatedAt: now,
  });
}
