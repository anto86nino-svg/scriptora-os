import type { BookConfig, BookProject, Genre, Language } from "@/types/book";
import { resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import { DEFAULT_STYLE_PROFILE, type WritingStyleProfile } from "@/lib/book-creation-os/objectives";
import type { BookMatterOptions } from "@/types/book";

const VALID_LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German"];

export const DEFAULT_MATTER_OPTIONS: BookMatterOptions = {
  frontMatterEnabled: true,
  backMatterEnabled: true,
  acknowledgmentsEnabled: true,
  ctaEnabled: true,
  bibliographyEnabled: false,
};

export function normalizeLanguage(value: unknown): Language {
  const raw = String(value || "").trim();
  if (VALID_LANGUAGES.includes(raw as Language)) return raw as Language;
  if (/ital/i.test(raw)) return "Italian";
  if (/english|inglese/i.test(raw)) return "English";
  if (/spanish|spagnol/i.test(raw)) return "Spanish";
  if (/french|frances/i.test(raw)) return "French";
  if (/german|tedesc/i.test(raw)) return "German";
  return "Italian";
}

export function normalizeGenre(value: unknown, contextText = ""): Genre {
  const raw = String(value || "").trim().toLowerCase();
  const allowed: Genre[] = [
    "self-help", "romance", "dark-romance", "thriller", "fantasy", "philosophy", "business", "memoir",
    "cookbook", "technical-manual", "software-guide", "ai-tools-guide", "gardening", "beekeeping",
    "health-medicine", "diet-nutrition", "fitness", "productivity", "education", "horror", "sci-fi",
    "historical", "biography", "spirituality", "children", "fairy-tale", "poetry", "jokes", "manual",
  ];
  if (allowed.includes(raw as Genre)) return raw as Genre;

  const hay = contextText.toLowerCase();
  if (/horror|dark horror|gotico|folk horror/i.test(hay)) return "horror";
  if (/dark.?romance/i.test(hay)) return "dark-romance";
  if (/thriller|noir|mistero|crime/i.test(hay)) return "thriller";
  if (/fantasy|magia|epic/i.test(hay)) return "fantasy";
  if (/romance/i.test(hay)) return "romance";
  if (/self.?help|mindset|produttiv|abitudin|crescita personal/i.test(hay)) return "self-help";
  if (/business|marketing|leadership/i.test(hay)) return "business";
  if (/education|scuol|universit|didatt/i.test(hay)) return "education";

  return "philosophy";
}

export function normalizeMatterOptions(value?: Partial<BookMatterOptions> | null): BookMatterOptions {
  return { ...DEFAULT_MATTER_OPTIONS, ...(value || {}) };
}

export function normalizeStyleProfile(value?: Partial<WritingStyleProfile> | null): WritingStyleProfile {
  return { ...DEFAULT_STYLE_PROFILE, ...(value || {}) };
}

/** Safe defaults — never crash generation for missing config. */
export function normalizeBookConfig(input: Partial<BookConfig> | BookConfig): BookConfig {
  const genre = normalizeGenre(input.genre, `${input.title || ""} ${input.idea || ""} ${input.subgenre || ""}`);
  const language = normalizeLanguage(input.language);
  const bookTypeDef = resolveBookTypeDefinition(
    genre,
    String(input.subcategory || "").trim(),
    String(input.subgenre || input.subcategory || "").trim(),
    input.bookTypeId,
  );
  const numberOfChapters = Math.max(1, Math.min(40, Number(input.numberOfChapters) || 12));
  const subchaptersEnabled = input.subchaptersEnabled ?? bookTypeDef.defaultSubchapters;
  const matterOptions = normalizeMatterOptions(input.matterOptions);

  return {
    bookTypeId: input.bookTypeId || bookTypeDef.id,
    title: String(input.title || "").trim() || "Romanzo senza titolo",
    subtitle: String(input.subtitle || "").trim(),
    titleLanguage: input.titleLanguage ? normalizeLanguage(input.titleLanguage) : language,
    tone: String(input.tone || "editoriale, chiaro, coinvolgente").trim(),
    author: input.author,
    authorName: input.authorName,
    writerName: input.writerName,
    authorIdentityId: input.authorIdentityId,
    authorIdentity: input.authorIdentity,
    authorStyle: String(input.authorStyle || "Bestseller Commerciale").trim(),
    language,
    genre,
    category: String(input.category || "Fiction").trim() || "Fiction",
    subcategory: String(input.subcategory || "General").trim() || "General",
    subgenre: String(input.subgenre || input.subcategory || "").trim(),
    chapterLength: input.chapterLength || "medium",
    bookLength: input.bookLength || "medium",
    customTotalWords: input.customTotalWords,
    numberOfChapters,
    subchaptersEnabled,
    subchaptersPerChapter: subchaptersEnabled
      ? Math.max(1, Math.min(6, Number(input.subchaptersPerChapter) || DEFAULT_SUBCHAPTERS_PER_CHAPTER))
      : 0,
    characters: Array.isArray(input.characters) ? input.characters : [],
    shadowTitleOptions: input.shadowTitleOptions,
    editorialMapId: input.editorialMapId,
    kdpSeriesName: input.kdpSeriesName,
    kdpRoadmapPosition: input.kdpRoadmapPosition,
    idea: String(input.idea || "").trim(),
    amazonMarketplace: String(input.amazonMarketplace || "amazon.it").trim() || "amazon.it",
    targetReader: String(input.targetReader || "").trim(),
    referenceAuthors: String(input.referenceAuthors || "").trim(),
    styleProfile: normalizeStyleProfile(input.styleProfile),
    characterBibleText: String(input.characterBibleText || "").trim(),
    matterOptions,
    configStatus: input.configStatus || "draft",
  };
}

export function normalizeBookProject(project: BookProject): BookProject {
  return {
    ...project,
    config: normalizeBookConfig(project.config),
    blueprintApproved: project.blueprintApproved ?? Boolean(project.blueprint && project.phase !== "blueprint"),
    configStatus: project.configStatus || (project.blueprintApproved ? "approved" : "draft"),
  };
}
