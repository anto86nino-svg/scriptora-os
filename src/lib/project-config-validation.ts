import { CATEGORIES, type BookConfig, type BookProject, type Genre, type Language } from "@/types/book";
import { resolveGenreKey } from "@/lib/genre-intelligence";

export type ProjectConfigIssueId =
  | "missing_title"
  | "missing_language"
  | "invalid_language"
  | "missing_genre"
  | "unrecognized_genre"
  | "missing_category"
  | "invalid_category"
  | "missing_subcategory"
  | "invalid_subcategory"
  | "invalid_chapters";

export interface ProjectConfigIssue {
  id: ProjectConfigIssueId;
  detail?: string;
}

export interface ConfigBlockedPayload {
  issues: ProjectConfigIssue[];
  config?: BookConfig;
}

const VALID_LANGUAGES: Language[] = ["English", "Italian", "Spanish", "French", "German", "Portuguese"];

const VALID_GENRES: Genre[] = [
  "self-help", "romance", "dark-romance", "thriller", "fantasy", "mystery", "crime",
  "literary-fiction", "sci-fi", "philosophy", "business", "memoir", "productivity",
  "psychology", "education", "health", "health-medicine", "spirituality",
  "cookbook", "technical-manual", "software-guide", "ai-tools-guide", "gardening",
  "beekeeping", "diet-nutrition", "fitness", "horror", "historical", "biography",
  "children", "fairy-tale", "poetry", "jokes", "manual",
];

function isValidLanguage(value: unknown): value is Language {
  return typeof value === "string" && VALID_LANGUAGES.includes(value as Language);
}

function isValidGenre(value: unknown): value is Genre {
  return typeof value === "string" && VALID_GENRES.includes(value as Genre);
}

function isGenreUnrecognized(genre: string, subcategory?: string): boolean {
  const normalized = genre.toLowerCase().trim();
  if (!normalized || normalized === "manual") return false;
  if (!isValidGenre(genre)) return true;

  const resolved = resolveGenreKey(genre, subcategory);
  if (resolved !== "manual") return false;

  const sub = (subcategory || "").toLowerCase().trim();
  const hints = [
    "horror", "sci", "fantascienza", "storic", "historical", "favol", "fairy",
    "bambin", "children", "kids", "poesia", "poetry", "barzell", "joke", "humor",
    "biograf", "biography", "garden", "orto", "giardin", "bee", "apic", "cook",
    "ricett", "productiv", "psych", "fitness", "tech", "spirit", "medita",
    "dark", "romance", "thrill", "fantasy", "philos", "business", "memoir", "self",
    "crescita", "ansia", "manual", "manuale",
  ];
  return !hints.some((hint) => normalized.includes(hint) || sub.includes(hint));
}

/** Repairs legacy/incomplete category & chapter fields without masking bad genre/language. */
export function repairBookConfigBasics(config: BookConfig): BookConfig {
  const categoryRaw = String(config.category || "").trim();
  const category = categoryRaw in CATEGORIES ? categoryRaw : "Self Help";
  const allowedSubs = CATEGORIES[category] || CATEGORIES["Self Help"];
  let subcategory = String(config.subcategory || "").trim();
  if (!subcategory || !allowedSubs.includes(subcategory)) {
    subcategory = allowedSubs[0] || "Mindset";
  }

  const chapters = Number(config.numberOfChapters);
  const numberOfChapters =
    Number.isFinite(chapters) && chapters >= 1 && chapters <= 120
      ? Math.round(chapters)
      : 10;

  return {
    ...config,
    category,
    subcategory,
    bookLength: config.bookLength || "medium",
    numberOfChapters,
  };
}

export function validateBookConfig(config: BookConfig | null | undefined): ProjectConfigIssue[] {
  if (!config) return [{ id: "missing_title" }];

  const issues: ProjectConfigIssue[] = [];
  const title = String(config.title || "").trim();
  if (!title) issues.push({ id: "missing_title" });

  const language = config.language;
  if (!language) {
    issues.push({ id: "missing_language" });
  } else if (!isValidLanguage(language)) {
    issues.push({ id: "invalid_language", detail: String(language) });
  }

  const genre = String(config.genre || "").trim();
  if (!genre) {
    issues.push({ id: "missing_genre" });
  } else if (!isValidGenre(genre)) {
    issues.push({ id: "unrecognized_genre", detail: genre });
  } else if (isGenreUnrecognized(genre, config.subcategory)) {
    issues.push({ id: "unrecognized_genre", detail: genre });
  }

  const category = String(config.category || "").trim();
  if (!category) {
    issues.push({ id: "missing_category" });
  } else if (!(category in CATEGORIES)) {
    issues.push({ id: "invalid_category", detail: category });
  }

  const subcategory = String(config.subcategory || "").trim();
  if (!subcategory) {
    issues.push({ id: "missing_subcategory" });
  } else if (category in CATEGORIES) {
    const allowed = CATEGORIES[category] || [];
    if (!allowed.includes(subcategory)) {
      issues.push({ id: "invalid_subcategory", detail: subcategory });
    }
  }

  const chapters = Number(config.numberOfChapters);
  if (!Number.isFinite(chapters) || chapters < 1 || chapters > 120) {
    issues.push({ id: "invalid_chapters", detail: String(config.numberOfChapters ?? "") });
  }

  return issues;
}

export function validateProjectForGeneration(project: BookProject | null | undefined): ProjectConfigIssue[] {
  if (!project) return [{ id: "missing_title" }];
  return validateBookConfig(repairBookConfigBasics(project.config));
}

export function configsDiffer(a: BookConfig, b: BookConfig): boolean {
  return (
    a.category !== b.category ||
    a.subcategory !== b.subcategory ||
    a.numberOfChapters !== b.numberOfChapters ||
    a.bookLength !== b.bookLength
  );
}
