import type { AuthorPlatform, AuthorPublishedBook, AuthorPublishedBookLinks } from "@/types/book";
import { normalizeAuthorPresence, normalizeReaderEmotionalGoals } from "./voice-memory";

function trim(value?: string): string {
  return String(value || "").trim();
}

function hasLinkValues(links?: AuthorPublishedBookLinks): boolean {
  if (!links) return false;
  return Object.values(links).some((v) => trim(v).length > 0);
}

export function createBlankPublishedBook(): AuthorPublishedBook {
  return {
    id: `book-${crypto.randomUUID()}`,
    title: "",
    genre: "",
    description: "",
    links: {},
  };
}

export function normalizeAuthorPublishedBookLinks(raw?: AuthorPublishedBookLinks | null): AuthorPublishedBookLinks {
  return {
    amazon: trim(raw?.amazon),
    kobo: trim(raw?.kobo),
    goodreads: trim(raw?.goodreads),
    appleBooks: trim(raw?.appleBooks),
    website: trim(raw?.website),
  };
}

export function normalizePublishedBook(raw: Partial<AuthorPublishedBook> | null | undefined): AuthorPublishedBook | null {
  if (!raw) return null;
  const title = trim(raw.title);
  const genre = trim(raw.genre);
  const description = trim(raw.description);
  const links = normalizeAuthorPublishedBookLinks(raw.links);
  if (!title && !genre && !description && !hasLinkValues(links)) return null;

  return {
    id: trim(raw.id) || `book-${crypto.randomUUID()}`,
    title,
    genre,
    description,
    links,
  };
}

export function normalizePublishedBooks(raw?: AuthorPublishedBook[] | null): AuthorPublishedBook[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((book) => normalizePublishedBook(book))
    .filter((book): book is AuthorPublishedBook => Boolean(book))
    .slice(0, 24);
}

export function normalizeAuthorPlatform(raw?: AuthorPlatform | null): AuthorPlatform {
  return {
    instagram: trim(raw?.instagram),
    tiktok: trim(raw?.tiktok),
    facebook: trim(raw?.facebook),
    website: trim(raw?.website),
    newsletter: trim(raw?.newsletter),
    amazonAuthorPage: trim(raw?.amazonAuthorPage),
    goodreadsProfile: trim(raw?.goodreadsProfile),
  };
}

export function hasAuthorPlatformValues(platform?: AuthorPlatform | null): boolean {
  return Object.values(normalizeAuthorPlatform(platform)).some((v) => v.length > 0);
}

/** Brand + ecosystem memory snapshot — foundation for future tone/positioning (V4: no generation wiring) */
export function authorEcosystemMemorySnapshot(input: {
  publishedBooks?: AuthorPublishedBook[];
  authorPlatform?: AuthorPlatform;
  authorPresence?: string[];
  readerEmotionalGoals?: string[];
  authorMessage?: string;
}) {
  return {
    publishedBooks: normalizePublishedBooks(input.publishedBooks),
    authorPlatform: normalizeAuthorPlatform(input.authorPlatform),
    authorPresence: normalizeAuthorPresence(input.authorPresence),
    readerEmotionalGoals: normalizeReaderEmotionalGoals(input.readerEmotionalGoals),
    authorMessage: trim(input.authorMessage),
  };
}
