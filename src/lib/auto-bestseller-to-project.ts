import { AutoBestsellerResult, AutoBestsellerInput } from "@/services/autoBestsellerService";
import { BookProject, BookConfig, Chapter, BookBlueprint, Genre, Language, BookLength } from "@/types/book";
import { createProjectId } from "@/lib/storage";
import type { LiveBook } from "@/hooks/useAutoBestseller";
import { normalizeProjectChapterTitles } from "@/lib/chapter-titles";
import { applyAuthorIdentityToConfig, enforceAuthorIdentityLock, getSelectedAuthorIdentity, resolveAuthorIdentity } from "@/lib/author-identity";
import { applyBookIntelligenceToConfig, detectBookIntelligence } from "@/lib/book-intelligence";
import { humanizeChapter } from "@/lib/HumanizerLayer";

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


function normalizeGenre(g?: string, idea?: string, subcategory?: string): Genre {
  if (idea?.trim()) {
    const intel = detectBookIntelligence({ idea, genre: g, subcategory });
    if (intel.confidence >= 0.55) return intel.resolvedGenre;
  }
  if (!g) return "self-help";
  const slug = g.toLowerCase().replace(/\s+/g, "-");
  return (ALLOWED_GENRES.find((x) => x === slug) ?? slug) as Genre;
}
function normalizeLanguage(l?: string): Language {
  if (!l) return "English";
  const cap = l.charAt(0).toUpperCase() + l.slice(1).toLowerCase();
  return (ALLOWED_LANGUAGES.find((x) => x === cap) ?? "English") as Language;
}
function normalizeBookLength(value?: string, totalWordTarget?: number): BookLength {
  if (value === "short" || value === "medium" || value === "long" || value === "custom") return value;
  return totalWordTarget ? "custom" : "medium";
}

function normalizeCustomWords(input?: Partial<AutoBestsellerInput>): number | undefined {
  const bookLength = normalizeBookLength(input?.bookLength, input?.totalWordTarget);
  if (bookLength !== "custom") return undefined;
  return Math.max(1000, Number(input?.customTotalWords || input?.totalWordTarget || 30000));
}

export function autoBestsellerToProject(
  result: AutoBestsellerResult,
  input?: Partial<AutoBestsellerInput>,
): BookProject {
  const now = new Date().toISOString();
  const genre = normalizeGenre(input?.genre, input?.idea || result.title, input?.subcategory);
  const language = normalizeLanguage(input?.language);
  const authorIdentity = resolveAuthorIdentity(input?.authorIdentity, input?.authorIdentityId) || getSelectedAuthorIdentity();
  const authorName = (authorIdentity?.penName || input?.authorName || "").trim();
  const characters = charactersFromText(input?.charactersText || (result as any)?.characterBible);
  const bookLength = normalizeBookLength(input?.bookLength, input?.totalWordTarget);
  const customTotalWords = normalizeCustomWords(input);

const config: BookConfig = applyBookIntelligenceToConfig(
  enforceAuthorIdentityLock(
    applyAuthorIdentityToConfig({
    title: result.title || "Untitled Bestseller",
    subtitle: result.subtitle || "",
    authorName,
    author: authorName,
    writerName: authorName,
    titleLanguage: normalizeLanguage(input?.titleLanguage || input?.language),
    tone: input?.tone || "Engaging, authoritative, accessible",
    authorStyle: input?.tone || "",
    language,
    genre,
    category: "Self Help",
    subcategory: input?.subcategory || "",
    chapterLength: "medium",
    bookLength,
    customTotalWords,
    numberOfChapters: result.chapters?.length || input?.numberOfChapters || 8,
    subchaptersEnabled: Boolean(input?.subchaptersEnabled),
    subchaptersPerChapter: Math.max(1, Math.min(8, Number(input?.subchaptersPerChapter) || 3)),
    characters,
  }, authorIdentity) as BookConfig,
  ),
);

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

  const chapters: Chapter[] = result.chapters.reduce<Chapter[]>((acc, c, index) => {
    const chapter = humanizeChapter({
      title: c.title || "Untitled Chapter",
      content: c.content || "",
      subchapters: [],
      status: "completed",
      qualityRating: typeof c.finalScore === "number" ? c.finalScore : undefined,
    }, {
      config,
      previousChapters: acc,
      chapterIndex: index,
      outlineSummary: blueprint?.chapterOutlines?.[index]?.summary,
    });
    acc.push(chapter);
    return acc;
  }, []);

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
  const genre = normalizeGenre(input?.genre, input?.idea || liveBook.title, input?.subcategory);
  const language = normalizeLanguage(input?.language);
  const authorIdentity = resolveAuthorIdentity(input?.authorIdentity, input?.authorIdentityId) || getSelectedAuthorIdentity();
  const authorName = (authorIdentity?.penName || input?.authorName || "").trim();
  const characters = charactersFromText(input?.charactersText || (liveBook as any)?.characterBible);
  const bookLength = normalizeBookLength(input?.bookLength, input?.totalWordTarget);
  const customTotalWords = normalizeCustomWords(input);

const config: BookConfig = applyBookIntelligenceToConfig(
  enforceAuthorIdentityLock(
    applyAuthorIdentityToConfig({
    title: liveBook.title || input?.prefilledTitle || "Generating…",
    subtitle: liveBook.subtitle || input?.prefilledSubtitle || "",
    authorName,
    author: authorName,
    writerName: authorName,
    titleLanguage: normalizeLanguage(input?.titleLanguage || input?.language),
    tone: input?.tone || "Engaging, authoritative, accessible",
    authorStyle: input?.tone || "",
    language,
    genre,
    category: "Self Help",
    subcategory: input?.subcategory || "",
    chapterLength: "medium",
    bookLength,
    customTotalWords,
    numberOfChapters: input?.numberOfChapters || liveBook.outlines?.length || liveBook.chapters.length || 8,
    subchaptersEnabled: Boolean(input?.subchaptersEnabled),
    subchaptersPerChapter: Math.max(1, Math.min(8, Number(input?.subchaptersPerChapter) || 3)),
    characters,
  }, authorIdentity) as BookConfig,
  ),
);

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
    .reduce<Chapter[]>((acc, c, index) => {
      const chapter = humanizeChapter({
        title: c.title || "Untitled Chapter",
        content: c.content || "",
        subchapters: [],
        status: "completed" as const,
        qualityRating: typeof c.score === "number" ? c.score : undefined,
      }, {
        config,
        previousChapters: acc,
        chapterIndex: index,
        outlineSummary: blueprint?.chapterOutlines?.[index]?.summary,
      });
      acc.push(chapter);
      return acc;
    }, []);

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
