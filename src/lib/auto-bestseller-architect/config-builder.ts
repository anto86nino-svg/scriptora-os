import type { AutoBestsellerInput } from "@/services/autoBestsellerService";
import type { BookConfig, BookLength, Genre, Language } from "@/types/book";
import { BOOK_LENGTH_CONFIG, DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { ensureBookTitleMetadata } from "@/lib/title-shadow";
import {
  applyAuthorIdentityToConfig,
  enforceAuthorIdentityLock,
  getSelectedAuthorIdentity,
  resolveAuthorIdentity,
} from "@/lib/author-identity";
import { applyBookIntelligenceToConfig, detectBookIntelligence } from "@/lib/book-intelligence";
import type { IdeaIntelligenceResult, MarketPositioningResult, TitleConcept } from "./types";

const ALLOWED_GENRES = [
  "self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy", "business", "memoir",
  "literary-fiction", "mystery", "crime", "horror", "sci-fi", "productivity", "psychology",
  "spirituality", "manual", "gardening", "cookbook", "education", "health-medicine", "fitness",
];
const ALLOWED_LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];

function normalizeGenre(value: string, idea?: string, subcategory?: string): Genre {
  if (idea?.trim()) {
    const intel = detectBookIntelligence({ idea, genre: value, subcategory });
    if (intel.confidence >= 0.55) return intel.resolvedGenre;
  }
  const slug = String(value || "self-help").toLowerCase().trim().replace(/\s+/g, "-");
  return (ALLOWED_GENRES.includes(slug) ? slug : "self-help") as Genre;
}

function normalizeLanguage(value?: string): Language {
  const raw = String(value || "English").trim();
  const cap = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  return ALLOWED_LANGUAGES.includes(cap as Language) ? (cap as Language) : "English";
}

function normalizeBookLength(value?: string, totalWordTarget?: number): BookLength {
  if (value === "short" || value === "medium" || value === "long" || value === "custom") return value;
  return totalWordTarget ? "custom" : "medium";
}

function charactersFromText(text?: string) {
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
        strictRules: "Never rename this character. Preserve role, personality, relationships and continuity.",
      };
    });
}

export function buildArchitectBookConfig(
  input: AutoBestsellerInput,
  idea: IdeaIntelligenceResult,
  market: MarketPositioningResult,
  selectedTitle: TitleConcept,
): BookConfig {
  const authorIdentity =
    resolveAuthorIdentity(input.authorIdentity, input.authorIdentityId) || getSelectedAuthorIdentity();
  const authorName = String(authorIdentity?.penName || input.authorName || "").trim();
  const bookLength = normalizeBookLength(input.bookLength, input.totalWordTarget);
  const customTotalWords =
    bookLength === "custom"
      ? Math.max(1000, Number(input.customTotalWords || input.totalWordTarget || 30000))
      : undefined;

  const genre = normalizeGenre(idea.genre, input.idea, idea.subgenre);
  const language = normalizeLanguage(input.language);

  const base = applyBookIntelligenceToConfig(
    enforceAuthorIdentityLock(
      applyAuthorIdentityToConfig(
        {
          title: selectedTitle.title.slice(0, 120),
          subtitle: selectedTitle.subtitle.slice(0, 180),
          authorName,
          author: authorName,
          writerName: authorName,
          titleLanguage: normalizeLanguage(input.titleLanguage || input.language),
          tone: input.tone || idea.report.tone || "warm, insightful, commercially informed",
          authorStyle: input.tone || "",
          language,
          genre,
          category: idea.report.layers.primaryGenre || input.genre || "Fiction",
          subcategory: idea.subgenre || input.subcategory || "",
          chapterLength: "medium",
          bookLength,
          customTotalWords,
          numberOfChapters: Math.max(3, Math.min(50, Number(input.numberOfChapters) || 8)),
          subchaptersEnabled: Boolean(input.subchaptersEnabled),
          subchaptersPerChapter: Math.max(
            1,
            Math.min(8, Number(input.subchaptersPerChapter) || DEFAULT_SUBCHAPTERS_PER_CHAPTER),
          ),
          characters: charactersFromText(input.charactersText),
        } as BookConfig,
        authorIdentity,
      ) as BookConfig,
    ),
  );

  return ensureBookTitleMetadata(base, {
    idea: input.idea,
    readerPromise: market.emotionalPromise,
    genre: idea.genre,
    subcategory: idea.subgenre,
    targetAudience: market.audienceProfile,
    language,
    titleLanguage: input.titleLanguage,
  });
}

export function estimateTargetWords(input: AutoBestsellerInput): number {
  const bookLength = normalizeBookLength(input.bookLength, input.totalWordTarget);
  if (bookLength === "custom") {
    return Math.max(1000, Number(input.customTotalWords || input.totalWordTarget || 30000));
  }
  return BOOK_LENGTH_CONFIG[bookLength].totalWords;
}
