import type { AuthorIdentity, AuthorPlatform, AuthorPublishedBook, AuthorPublishedBookLinks, BookConfig, BackMatter, FrontMatter, Language } from "@/types/book";
import { normalizeAuthorIdentity } from "@/lib/author-identity";
import { hasAuthorPlatformValues, normalizeAuthorPlatform, normalizePublishedBooks } from "./ecosystem";
import {
  applyAboutAuthorCadence,
  buildPassiveFollowHeading,
  buildPassiveOtherBooksHeading,
  resolvePassiveAuthorTone,
  stripAuthorBrainCliches,
} from "./passive-intelligence";
import { validateAuthorBrainExportBlock } from "./hardening";

export type AuthorBrainInjectionMode = "soft" | "regenerate";

function trim(value?: string): string {
  return String(value || "").trim();
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Exclude current manuscript from catalogue list */
export function isSameBookTitle(catalogueTitle: string, currentTitle?: string): boolean {
  const a = normalizeTitleKey(catalogueTitle);
  const b = normalizeTitleKey(currentTitle || "");
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function filterCatalogueBooks(books: AuthorPublishedBook[], currentBookTitle?: string): AuthorPublishedBook[] {
  return normalizePublishedBooks(books).filter((book) => book.title && !isSameBookTitle(book.title, currentBookTitle));
}

function localizedCopy(
  language: Language | string | undefined,
  key: "otherBooks" | "follow",
  penName: string,
  tone: ReturnType<typeof resolvePassiveAuthorTone>,
): string {
  if (key === "otherBooks") return buildPassiveOtherBooksHeading(penName, language, tone);
  return buildPassiveFollowHeading(penName, language, tone);
}

/** About the Author — biography only, no hallucination; passive cadence when voice memory exists */
export function buildAboutAuthorInjection(identity: AuthorIdentity | null): string {
  const normalized = normalizeAuthorIdentity(identity);
  if (!normalized?.biography) return "";

  const penName = normalized.penName.trim();
  const bio = normalized.biography.trim();
  const tone = resolvePassiveAuthorTone(normalized);
  if (!penName) return stripBioOnly(bio);

  const bioLower = bio.toLowerCase();
  const penLower = penName.toLowerCase();
  if (bioLower.startsWith(penLower) || bioLower.startsWith(`${penLower}.`) || bioLower.startsWith(`${penLower} —`)) {
    return validateAuthorBrainExportBlock(stripBioOnly(bio), penName);
  }

  return validateAuthorBrainExportBlock(applyAboutAuthorCadence(bio, penName, tone), penName);
}

function stripBioOnly(bio: string): string {
  return stripAuthorBrainCliches(bio)
    .replace(/\s+\band\b\s+\band\b/gi, " and ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
}

function formatBookLinks(links?: AuthorPublishedBookLinks): string[] {
  const normalized = links || {};
  const ordered: Array<[string, string | undefined]> = [
    ["Amazon", normalized.amazon],
    ["Kobo", normalized.kobo],
    ["Goodreads", normalized.goodreads],
    ["Apple Books", normalized.appleBooks],
    ["Website", normalized.website],
  ];
  return ordered.filter(([, url]) => trim(url)).map(([label, url]) => `${label}: ${trim(url)}`);
}

/** Other Books — elegant bullets, no link dump */
export function buildOtherBooksInjection(input: {
  identity: AuthorIdentity | null;
  currentBookTitle?: string;
  language?: Language | string;
  tone?: ReturnType<typeof resolvePassiveAuthorTone>;
}): string {
  const normalized = normalizeAuthorIdentity(input.identity);
  if (!normalized) return "";

  const books = filterCatalogueBooks(normalized.publishedBooks || [], input.currentBookTitle);
  if (!books.length) return "";

  const penName = normalized.penName.trim() || normalized.name.trim() || "Author";
  const tone = input.tone ?? resolvePassiveAuthorTone(normalized);
  const lines: string[] = [localizedCopy(input.language, "otherBooks", penName, tone), ""];

  for (const book of books) {
    const titleLine = book.genre ? `${book.title} (${book.genre})` : book.title;
    lines.push(`• ${titleLine}`);
    if (book.description) lines.push(`  ${book.description}`);
    const linkLines = formatBookLinks(book.links);
    for (const link of linkLines) lines.push(`  ${link}`);
    lines.push("");
  }

  return validateAuthorBrainExportBlock(lines.join("\n").trim(), penName);
}

const PLATFORM_LABELS: Array<{ key: keyof AuthorPlatform; label: string }> = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "website", label: "Website" },
  { key: "newsletter", label: "Newsletter" },
  { key: "amazonAuthorPage", label: "Amazon Author Page" },
  { key: "goodreadsProfile", label: "Goodreads" },
];

/** Follow the Author — only when links exist, minimal premium block */
export function buildFollowAuthorInjection(input: {
  identity: AuthorIdentity | null;
  language?: Language | string;
  tone?: ReturnType<typeof resolvePassiveAuthorTone>;
}): string {
  const normalized = normalizeAuthorIdentity(input.identity);
  if (!normalized) return "";

  const platform = normalizeAuthorPlatform(normalized.authorPlatform);
  if (!hasAuthorPlatformValues(platform)) return "";

  const penName = normalized.penName.trim() || normalized.name.trim() || "Author";
  const tone = input.tone ?? resolvePassiveAuthorTone(normalized);
  const lines: string[] = [localizedCopy(input.language, "follow", penName, tone), ""];

  for (const { key, label } of PLATFORM_LABELS) {
    const url = trim(platform[key]);
    if (url) lines.push(`${label}: ${url}`);
  }

  return validateAuthorBrainExportBlock(lines.join("\n").trim(), penName);
}

export function buildAuthorBrainInjectionSnapshot(config: BookConfig): {
  aboutAuthor: string;
  otherBooks: string;
  followAuthor: string;
} {
  const identity = normalizeAuthorIdentity(config.authorIdentity);
  const language = config.language;
  const currentBookTitle = config.title;
  const tone = resolvePassiveAuthorTone(identity);

  return {
    aboutAuthor: buildAboutAuthorInjection(identity),
    otherBooks: buildOtherBooksInjection({ identity, currentBookTitle, language, tone }),
    followAuthor: buildFollowAuthorInjection({ identity, language, tone }),
  };
}

function mergeField(current: string, injected: string, mode: AuthorBrainInjectionMode): string {
  if (!injected) return current;
  if (mode === "regenerate") return injected;
  return current.trim() ? current : injected;
}

export function applyAuthorBrainToFrontMatter(
  raw: Partial<FrontMatter> | null | undefined,
  config: BookConfig,
  mode: AuthorBrainInjectionMode = "soft",
): Partial<FrontMatter> {
  const source = raw || {};
  const snapshot = buildAuthorBrainInjectionSnapshot(config);
  return {
    ...source,
    aboutAuthor: mergeField(trim(source.aboutAuthor), snapshot.aboutAuthor, mode),
  };
}

export function applyAuthorBrainToBackMatter(
  raw: Partial<BackMatter> | null | undefined,
  config: BookConfig,
  mode: AuthorBrainInjectionMode = "soft",
): Partial<BackMatter> {
  const source = raw || {};
  const snapshot = buildAuthorBrainInjectionSnapshot(config);
  return {
    ...source,
    otherBooks: mergeField(trim(source.otherBooks), snapshot.otherBooks, mode),
    followAuthor: mergeField(trim(source.followAuthor), snapshot.followAuthor, mode),
  };
}

export function authorBrainProfileHasInjectionData(config: BookConfig): boolean {
  const snapshot = buildAuthorBrainInjectionSnapshot(config);
  return Boolean(snapshot.aboutAuthor || snapshot.otherBooks || snapshot.followAuthor);
}

export function authorBrainInjectedFieldKeys(config: BookConfig): {
  front: Array<keyof FrontMatter>;
  back: Array<keyof BackMatter>;
} {
  const snapshot = buildAuthorBrainInjectionSnapshot(config);
  return {
    front: snapshot.aboutAuthor ? (["aboutAuthor"] as const) : [],
    back: [
      ...(snapshot.otherBooks ? (["otherBooks"] as const) : []),
      ...(snapshot.followAuthor ? (["followAuthor"] as const) : []),
    ],
  };
}
