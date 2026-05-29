import type { BookIntelligenceSnapshot } from "@/lib/book-intelligence/types";
import type { BestsellerChapterSnapshot } from "@/lib/bestseller-intelligence/types";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import type { ChapterScenePurposeSnapshot, ReaderEmotionSnapshot } from "@/lib/narrative-intelligence-v2/types";

export type Language = "English" | "Italian" | "Spanish" | "French" | "German";
export type ChapterLength = "short" | "medium" | "long";
export type BookLength = "short" | "medium" | "long" | "custom";
export type Genre =
  | "self-help"
  | "romance"
  | "dark-romance"
  | "thriller"
  | "fantasy"
  | "mystery"
  | "crime"
  | "literary-fiction"
  | "sci-fi"
  | "philosophy"
  | "business"
  | "memoir"
  | "productivity"
  | "psychology"
  | "education"
  | "health"
  | "health-medicine"
  | "spirituality"
  // Genre Engine — practical / non-fiction extension
  | "cookbook"
  | "technical-manual"
  | "software-guide"
  | "ai-tools-guide"
  | "gardening"
  | "beekeeping"
  | "diet-nutrition"
  | "fitness"
  // Estensioni: creativi + intrattenimento
  | "horror"
  | "historical"
  | "biography"
  | "children"
  | "fairy-tale"
  | "poetry"
  | "jokes"
  | "manual";
export type GenerationPhase = 
  | "idle" 
  | "blueprint" 
  | "front-matter" 
  | "chapters" 
  | "back-matter" 
  | "complete";

export type GenerationStatus = "idle" | "generating" | "completed" | "error";

export interface AIQualityRating {
  score: number; // 1-5
  explanation: string;
  missing: string;
  improvements: string;
}

export interface SubChapter {
  title: string;
  content: string;
  aiRating?: AIQualityRating;
}

export interface Chapter {
  title: string;
  content: string;
  subchapters: SubChapter[];
  status?: GenerationStatus;
  qualityRating?: number;
  aiRating?: AIQualityRating;
  lengthOverride?: ChapterLength;
  /** Live bestseller intelligence snapshot — updated after generation */
  bestsellerIntel?: BestsellerChapterSnapshot;
  /** Scene purpose map — Sprint V2 narrative intelligence */
  scenePurposeIntel?: ChapterScenePurposeSnapshot;
  /** Simulated reader emotional state — Sprint V2 */
  readerEmotionState?: ReaderEmotionSnapshot;
}

export interface FrontMatter {
  titlePage: string;
  copyright: string;
  dedication: string;
  aboutAuthor: string;
  howToUse: string;
  letterToReader: string;
}

export interface BackMatter {
  conclusion: string;
  authorNote: string;
  callToAction: string;
  reviewRequest: string;
  otherBooks: string;
  /** Author Brain V3 — follow links block (optional, back matter only) */
  followAuthor?: string;
}

export interface BookSubchapterOutline {
  title: string;
  summary: string;
  purpose?: string;
  emotionalFunction?: string;
  narrativeProgression?: string;
  conflictProgression?: string;
  tensionProgression?: string;
  romanceProgression?: string;
  psychologicalProgression?: string;
  canonNotes?: string[];
}

export interface BookChapterOutline {
  title: string;
  summary: string;
  subchapters?: BookSubchapterOutline[];
  purpose?: string;
  emotionalFunction?: string;
  narrativeProgression?: string;
  characterEvolutionCheckpoint?: string;
  conflictProgression?: string;
  tensionProgression?: string;
  romanceProgression?: string;
  psychologicalProgression?: string;
  canonNotes?: string[];
}

export interface BlueprintIntegrityCharacterMemory {
  canonicalName: string;
  role?: string;
  age?: string;
  physicalPresence?: string;
  emotionalWounds?: string;
  coreDesire?: string;
  coreFear?: string;
  internalContradiction?: string;
  personalityProfile?: string;
  speechPattern?: string;
  vocabularyStyle?: string;
  emotionalOpennessLevel?: string;
  trustLevel?: string;
  loveLanguage?: string;
  angerStyle?: string;
  lieStyle?: string;
  traumaMarkers?: string;
  bodyLanguage?: string;
  habitsAndRecurringGestures?: string;
  relationshipMap?: string;
  characterArc?: string;
  forbiddenBehaviors?: string[];
  neverSay?: string[];
  secretNeed?: string;
}

export interface BlueprintIntegrity {
  bookCoreDNA: Record<string, string | string[]>;
  worldLoreFoundation: Record<string, string | string[]>;
  characterMemoryEngine: BlueprintIntegrityCharacterMemory[];
  structuralStoryArchitecture: Record<string, string | string[]>;
  relationshipTensionEngine: Record<string, string | string[]>;
  canonProtectionLayer: {
    immutableCanonRules: string[];
    forbiddenMutations: string[];
    priorityOrder: string[];
  };
  narrativeImmersionRules: {
    prioritize: string[];
    avoid: string[];
    sceneLaws: string[];
  };
}

export interface BookBlueprint {
  overview: string;
  chapterOutlines: BookChapterOutline[];
  themes: string[];
  emotionalArc: string;
  integrity?: BlueprintIntegrity;
}

export const CATEGORIES: Record<string, string[]> = {
  "Self Help": ["Mindset", "Relationships", "Productivity", "Wellness", "Spirituality"],
  "Fiction": ["Dark Romance", "Romance", "Thriller", "Fantasy", "Sci-Fi", "Horror", "Historical", "Literary"],
  "Non-Fiction": ["Business", "Philosophy", "Memoir", "Biography", "Science", "Spirituality"],
  "Education": ["Textbook", "How-To", "Reference", "Study Guide"],
  "Bambini": ["0-3 anni", "3-6 anni", "6-9 anni", "9-12 anni", "Young Adult"],
  "Favole": ["Classiche", "Moderne", "Animali", "Magia", "Morali"],
  "Poesia": ["Verso libero", "Haiku", "Sonetti", "Lirica moderna", "Spoken word"],
  "Barzellette": ["Quotidiane", "Lavoro", "Coppia", "Bambini", "Assurde", "Giochi di parole"],
  "Manuali": ["Tecnico", "Hobby", "Professionale", "Software", "Bricolage", "Cucina"],
  "Cucina": ["Italiana", "Internazionale", "Vegetariana", "Dolci", "Dieta"],
};

export const BOOK_LENGTH_CONFIG: Record<BookLength, { label: string; totalWords: number; description: string }> = {
  short: { label: "Short Book", totalWords: 10000, description: "~10,000 words — Concise, high-density" },
  medium: { label: "Medium Book", totalWords: 50000, description: "~50,000 words — Balanced development" },
  long: { label: "Long Book", totalWords: 100000, description: "~100,000+ words — Deep, immersive narrative" },
  custom: { label: "Custom", totalWords: 30000, description: "Choose your exact word count" },
};

export const DEFAULT_SUBCHAPTERS_PER_CHAPTER = 3;

export function getBookTotalWords(config: { bookLength: BookLength; customTotalWords?: number }): number {
  if (config.bookLength === "custom" && config.customTotalWords && config.customTotalWords > 0) {
    return config.customTotalWords;
  }
  return BOOK_LENGTH_CONFIG[config.bookLength].totalWords;
}

export function getSubchaptersPerChapter(config: { subchaptersEnabled?: boolean; subchaptersPerChapter?: number }): number {
  if (!config.subchaptersEnabled) return 0;
  const raw = Number(config.subchaptersPerChapter || DEFAULT_SUBCHAPTERS_PER_CHAPTER);
  return Math.max(1, Math.min(8, Number.isFinite(raw) ? Math.round(raw) : DEFAULT_SUBCHAPTERS_PER_CHAPTER));
}


export interface BookCharacter {
  name: string;
  surname?: string;
  age?: string;
  role?: string;
  physicalDescription?: string;
  personality?: string;
  wound?: string;
  externalDesire?: string;
  internalNeed?: string;
  secret?: string;
  relationships?: string;
  strictRules?: string;
}

export interface AuthorIdentityLock {
  version: 2;
  identityId: string;
  penName: string;
  fingerprint: string;
  lockedAt: string;
}

/** Author Brain V2 — platform links for a published book */
export interface AuthorPublishedBookLinks {
  amazon?: string;
  kobo?: string;
  goodreads?: string;
  appleBooks?: string;
  website?: string;
}

/** Author Brain V2 — catalogue entry */
export interface AuthorPublishedBook {
  id: string;
  title: string;
  genre: string;
  description?: string;
  links?: AuthorPublishedBookLinks;
}

/** Author Brain V2 — author platform / social presence */
export interface AuthorPlatform {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  website?: string;
  newsletter?: string;
  amazonAuthorPage?: string;
  goodreadsProfile?: string;
}

export interface AuthorIdentity {
  id: string;
  /** Internal profile label shown in Scriptora. */
  name: string;
  /** Legal/real person or company name, kept configurable and private unless used for copyright. */
  realName?: string;
  /** Public author name printed in the book, cover and exports. */
  penName: string;
  /** Copyright holder. Defaults to realName, then penName. */
  copyrightName?: string;
  archetype: string;
  /** Public author biography used in front matter. */
  biography: string;
  /** Author Brain V1 — short raw self-description for AI bio expansion. */
  authorBrainSeed?: string;
  /** Author Brain V2 — published catalogue (data only, no auto-injection yet). */
  publishedBooks?: AuthorPublishedBook[];
  /** Author Brain V2 — platform / social links (data only). */
  authorPlatform?: AuthorPlatform;
  /** Author Brain V4 — how readers should perceive the author (chip ids). */
  authorPresence?: string[];
  /** Author Brain V4 — desired reader emotional outcomes (chip ids). */
  readerEmotionalGoals?: string[];
  /** Author Brain V4 — optional brand message for readers. */
  authorMessage?: string;
  /** Optional personal note used in back matter. */
  authorNote?: string;
  voice: string;
  signatureMoves: string;
  forbiddenMoves: string;
  recurringThemes: string;
  language?: Language;
  createdAt?: string;
  updatedAt?: string;
}

export interface BookConfig {
  title: string;
  subtitle: string;
  titleLanguage?: Language;
  tone: string;
  /**
   * Real publishing author / pen name.
   * Examples: Antonino Campanella, Livia Emerson, Lua Galli.
   * This is NOT the writing-style preset.
   */
  author?: string;
  authorName?: string;
  writerName?: string;
  authorIdentityId?: string;
  authorIdentity?: AuthorIdentity;
  /** Locked at project creation — prevents author voice drift across sessions */
  authorIdentityLock?: AuthorIdentityLock;
  /** Multi-layer book intelligence snapshot — locked at project creation */
  bookIntelligence?: BookIntelligenceSnapshot;
  authorStyle: string;
  language: Language;
  genre: Genre;
  category: string;
  subcategory: string;
  chapterLength: ChapterLength;
  bookLength: BookLength;
  customTotalWords?: number;
  numberOfChapters: number;
  subchaptersEnabled: boolean;
  subchaptersPerChapter?: number;
  characters?: BookCharacter[];
  shadowTitleOptions?: {
    title: string;
    subtitle: string;
    angle?: string;
    keywords?: string[];
    confidence?: number;
  }[];
  editorialMapId?: string;
  kdpSeriesName?: string;
  kdpRoadmapPosition?: number;
}

/**
 * Genre Lock — locked editorial blueprint stored on the project
 * at creation time. Ensures all subsequent generations (chapters,
 * front/back matter, rewrites) use the SAME structure/rules and
 * never drift. Stored in projects.data (JSON).
 */
export interface GenreLock {
  genre: string;
  subcategory?: string;
  structure: string[];
  rules: string[];
  chapterStyle: string;
  tone: string;
  frontMatterTemplate: string[];
  backMatterTemplate: string[];
  hasSubchapters: boolean;
  lockedAt: string;
}

export interface BookProject {
  id: string;
  config: BookConfig;
  blueprint: BookBlueprint | null;
  frontMatter: FrontMatter | null;
  chapters: Chapter[];
  backMatter: BackMatter | null;
  phase: GenerationPhase;
  frontMatterStatus?: GenerationStatus;
  backMatterStatus?: GenerationStatus;
  /** Locked Genre Engine blueprint — set once on creation, never mutated by AI */
  genreLock?: GenreLock;
  /** Rolling narrative memory — updated after each written chapter */
  longBookMemory?: LongBookMemorySnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export type SectionId = 
  | "blueprint"
  | "front-matter"
  | `chapter-${number}`
  | `chapter-${number}-sub-${number}`
  | "back-matter";
