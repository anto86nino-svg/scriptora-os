import type { BookConfig, BookProject, Genre, Language } from "@/types/book";

export type ProjectHandoffSource =
  | "title-domination"
  | "kdp-launch"
  | "keyword-gold"
  | "bestseller-radar"
  | "market-radar"
  | "market-os"
  | "cover-studio"
  | "publishing-cockpit"
  | "book-forge"
  | "preset-forge"
  | "one-flow"
  | "guided-interview"
  | "auto-bestseller"
  | "book-idea-tools"
  | "dashboard";

export type DraftBookProjectSeed = {
  id: string;
  sourceTool: ProjectHandoffSource;
  projectId?: string;
  title?: string;
  subtitle?: string;
  authorName?: string;
  language?: Language | string;
  marketplace?: string;
  bookType?: string;
  genre?: Genre | string;
  category?: string;
  subcategory?: string;
  niche?: string;
  targetReader?: string;
  promise?: string;
  tone?: string;
  chapterCount?: number;
  bookLength?: BookConfig["bookLength"];
  keywords?: string[];
  backendKeywords?: string[];
  kdpCategories?: string[];
  bisacCategories?: string[];
  comparableBooks?: string[];
  commercialAngle?: string;
  coverSaved?: boolean;
  updatedAt: string;
};

const ACTIVE_SEED_KEY = "scriptora:active-book-project-seed";
const SEED_PREFIX = "scriptora:book-project-seed:";

function now(): string {
  return new Date().toISOString();
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function unique(values: Array<string | undefined | null>, max = values.length): string[] {
  return Array.from(new Set(values.map(clean).filter(Boolean))).slice(0, max);
}

function seedKey(projectId: string): string {
  return `${SEED_PREFIX}${projectId}`;
}

function readSeed(key: string): DraftBookProjectSeed | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftBookProjectSeed;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function writeSeed(key: string, seed: DraftBookProjectSeed): void {
  try {
    localStorage.setItem(key, JSON.stringify(seed));
  } catch {
    /* quota: non-blocking */
  }
}

function preferText(current?: string, incoming?: string): string | undefined {
  return clean(current) || clean(incoming) || undefined;
}

function preferNumber(current?: number, incoming?: number): number | undefined {
  if (Number.isFinite(current) && Number(current) > 0) return current;
  if (Number.isFinite(incoming) && Number(incoming) > 0) return incoming;
  return undefined;
}

export function buildProjectHandoffSeed(
  sourceTool: ProjectHandoffSource,
  input: Omit<Partial<DraftBookProjectSeed>, "id" | "sourceTool" | "updatedAt">,
): DraftBookProjectSeed {
  const projectId = clean(input.projectId) || undefined;
  const stable = projectId || clean(input.title) || clean(input.niche) || sourceTool;
  return {
    id: `book-seed-${sourceTool}-${stable.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    sourceTool,
    ...input,
    projectId,
    keywords: unique(input.keywords || []),
    backendKeywords: unique(input.backendKeywords || input.keywords || [], 7),
    kdpCategories: unique(input.kdpCategories || []),
    bisacCategories: unique(input.bisacCategories || []),
    comparableBooks: unique(input.comparableBooks || [], 8),
    updatedAt: now(),
  };
}

export function mergeProjectHandoffSeeds(
  current: DraftBookProjectSeed | null | undefined,
  incoming: DraftBookProjectSeed,
): DraftBookProjectSeed {
  if (!current) return incoming;
  return {
    ...current,
    ...incoming,
    id: current.id,
    projectId: incoming.projectId || current.projectId,
    title: preferText(current.title, incoming.title),
    subtitle: preferText(current.subtitle, incoming.subtitle),
    authorName: preferText(current.authorName, incoming.authorName),
    language: preferText(current.language as string, incoming.language as string),
    marketplace: preferText(current.marketplace, incoming.marketplace),
    bookType: preferText(current.bookType, incoming.bookType),
    genre: preferText(current.genre as string, incoming.genre as string),
    category: preferText(current.category, incoming.category),
    subcategory: preferText(current.subcategory, incoming.subcategory),
    niche: preferText(current.niche, incoming.niche),
    targetReader: preferText(current.targetReader, incoming.targetReader),
    promise: preferText(current.promise, incoming.promise),
    tone: preferText(current.tone, incoming.tone),
    chapterCount: preferNumber(current.chapterCount, incoming.chapterCount),
    bookLength: current.bookLength || incoming.bookLength,
    keywords: unique([...(current.keywords || []), ...(incoming.keywords || [])]),
    backendKeywords: unique([...(current.backendKeywords || []), ...(incoming.backendKeywords || [])], 7),
    kdpCategories: unique([...(current.kdpCategories || []), ...(incoming.kdpCategories || [])]),
    bisacCategories: unique([...(current.bisacCategories || []), ...(incoming.bisacCategories || [])]),
    comparableBooks: unique([...(current.comparableBooks || []), ...(incoming.comparableBooks || [])], 8),
    commercialAngle: preferText(current.commercialAngle, incoming.commercialAngle),
    coverSaved: Boolean(current.coverSaved || incoming.coverSaved),
    sourceTool: incoming.sourceTool,
    updatedAt: now(),
  };
}

export function saveProjectHandoffSeed(seed: DraftBookProjectSeed): DraftBookProjectSeed {
  const active = loadProjectHandoffSeed(seed.projectId);
  const merged = mergeProjectHandoffSeeds(active, seed);
  writeSeed(ACTIVE_SEED_KEY, merged);
  if (merged.projectId) writeSeed(seedKey(merged.projectId), merged);
  return merged;
}

export function loadProjectHandoffSeed(projectId?: string | null): DraftBookProjectSeed | null {
  if (projectId) return readSeed(seedKey(projectId)) || readSeed(ACTIVE_SEED_KEY);
  return readSeed(ACTIVE_SEED_KEY);
}

export function applyProjectHandoffSeed(project: BookProject, seed: DraftBookProjectSeed): BookProject {
  const currentMeta = project.config.publishingMetadata || {};
  const metadata = {
    ...currentMeta,
    marketplace: preferText(currentMeta.marketplace, seed.marketplace),
    targetReader: preferText(currentMeta.targetReader, seed.targetReader),
    commercialPromise: preferText(currentMeta.commercialPromise, seed.promise),
    commercialAngle: preferText(currentMeta.commercialAngle, seed.commercialAngle),
    keywords: unique([...(currentMeta.keywords || []), ...(seed.keywords || [])]),
    backendKeywords: unique([...(currentMeta.backendKeywords || []), ...(seed.backendKeywords || seed.keywords || [])], 7),
    kdpCategories: unique([...(currentMeta.kdpCategories || []), ...(seed.kdpCategories || [])]),
    bisacCategories: unique([...(currentMeta.bisacCategories || []), ...(seed.bisacCategories || [])]),
    comparableBooks: unique([...(currentMeta.comparableBooks || []), ...(seed.comparableBooks || [])], 8),
    sourceTools: unique([...(currentMeta.sourceTools || []), seed.sourceTool]),
    updatedAt: now(),
  };

  return {
    ...project,
    config: {
      ...project.config,
      title: preferText(project.config.title, seed.title) || project.config.title,
      subtitle: preferText(project.config.subtitle, seed.subtitle || seed.promise) || project.config.subtitle,
      authorName: preferText(project.config.authorName, seed.authorName) || project.config.authorName,
      language: (preferText(project.config.language, seed.language as string) || project.config.language) as Language,
      amazonMarketplace: preferText(project.config.amazonMarketplace, seed.marketplace) || project.config.amazonMarketplace,
      bookTypeId: preferText(project.config.bookTypeId, seed.bookType) || project.config.bookTypeId,
      genre: (preferText(project.config.genre, seed.genre as string) || project.config.genre) as Genre,
      category: preferText(project.config.category, seed.category) || project.config.category,
      subcategory: preferText(project.config.subcategory, seed.subcategory || seed.niche) || project.config.subcategory,
      targetReader: preferText(project.config.targetReader, seed.targetReader) || project.config.targetReader,
      tone: preferText(project.config.tone, seed.tone) || project.config.tone,
      bookLength: project.config.bookLength || seed.bookLength || project.config.bookLength,
      numberOfChapters: preferNumber(project.config.numberOfChapters, seed.chapterCount) || project.config.numberOfChapters,
      publishingMetadata: metadata,
    },
    updatedAt: now(),
  };
}
