import type { Genre, Language, BookCharacter } from "@/types/book";
import { resolveLevel1FromBookTypeId } from "@/lib/book-config-engine";
import type { Level1BookType } from "@/lib/book-config-engine";
import {
  buildForgeEndingLine,
  resolveForgeCommercialHook,
  resolveForgeCommercialPromise,
  type ForgeInterviewSeed,
} from "@/lib/guided-interview/forge-blueprint-handoff";

export function emptyCharacter(): BookCharacter {
  return {
    name: "",
    role: "",
    wound: "",
    secret: "",
    externalDesire: "",
    personality: "",
  };
}

export function cleanStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export type ExplicitWordTarget = {
  wordsPerChapter: number;
  totalWords: number;
};

/**
 * Turns the editable "words per chapter" field into the actual custom book
 * target used by the generation engine. Italian thousands separators and
 * ranges are supported; ranges use their midpoint.
 */
export function parseWordsPerChapterTarget(
  raw: string,
  chapters: number,
): ExplicitWordTarget | null {
  const normalized = cleanStr(raw)
    .replace(/(?<=\d)[.,](?=\d{3}\b)/g, "")
    .replace(/[–—]/g, "-");
  const values = normalized
    .match(/\d+(?:[.,]\d+)?/g)
    ?.map((value) => Number(value.replace(",", ".")))
    .filter((value) => Number.isFinite(value)) ?? [];

  if (!values.length || !Number.isFinite(chapters) || chapters < 1) return null;

  const wordsPerChapter = Math.round(
    values.length > 1 ? (values[0] + values[1]) / 2 : values[0],
  );
  if (wordsPerChapter < 400 || wordsPerChapter > 12_000) return null;

  return {
    wordsPerChapter,
    totalWords: wordsPerChapter * Math.round(chapters),
  };
}

export function parseHandoffLanguage(raw: unknown): Language | null {
  const value = cleanStr(raw).toLowerCase();
  if (!value) return null;
  if (/ingles|english/.test(value)) return "English";
  if (/spagn|spanish|español/.test(value)) return "Spanish";
  if (/franc|french/.test(value)) return "French";
  if (/tedesc|german|deutsch/.test(value)) return "German";
  if (/ital|italian/.test(value)) return "Italian";
  return null;
}

export function normalizeHandoffGenre(raw: unknown): Genre | null {
  const value = cleanStr(raw).toLowerCase();
  if (!value) return null;
  if (/dark.?romance/.test(value)) return "dark-romance";
  if (/romance/.test(value)) return "romance";
  if (/thriller|crime|suspense/.test(value)) return "thriller";
  if (/fantasy/.test(value)) return "fantasy";
  if (/horror/.test(value)) return "horror";
  if (/self.?help|crescita|mindset/.test(value)) return "self-help";
  if (/business|marketing|leadership/.test(value)) return "business";
  if (/poetry|poesia/.test(value)) return "poetry";
  if (/manual|manuale|guide|guida/.test(value)) return "manual";
  return null;
}

export function mapForgeGenreToInterviewGenre(
  forgePresetId?: string | null,
  bookTypeId?: string,
) {
  const source = forgePresetId
    ? forgePresetId.toLowerCase()
    : (bookTypeId || "general").toLowerCase();

  const map: Record<string, string> = {
    poetry: "poetry",
    romance: "romance",
    "dark-romance": "dark-romance",
    thriller: "thriller",
    horror: "thriller",
    fantasy: "fantasy",
    "self-help": "self-help",
    business: "business",
    manual: "manual",
    story: "literary-fiction",
    storia: "literary-fiction",
    historical: "literary-fiction",
    history: "literary-fiction",
    "historical-fiction": "literary-fiction",
    novel: "literary-fiction",
    fiction: "literary-fiction",
    handbook: "manual",
  };

  return map[source] || "general";
}

export function applyInterviewGenreToWizard(
  selectedGenre: string | undefined,
  setters: {
    setBookTypeId: (v: string) => void;
    setGenre: (v: Genre) => void;
    setLevel1BookType: (v: Level1BookType) => void;
  },
) {
  const map: Record<string, { bookTypeId: string; genre: Genre }> = {
    romance: { bookTypeId: "romance", genre: "romance" },
    "dark-romance": { bookTypeId: "dark-romance", genre: "dark-romance" },
    thriller: { bookTypeId: "thriller", genre: "thriller" },
    fantasy: { bookTypeId: "fantasy", genre: "fantasy" },
    "self-help": { bookTypeId: "self-help", genre: "self-help" },
    business: { bookTypeId: "business", genre: "business" },
    manual: { bookTypeId: "manual", genre: "manual" },
    poetry: { bookTypeId: "poetry", genre: "poetry" },
    "literary-fiction": { bookTypeId: "literary", genre: "literary-fiction" },
  };

  const hit =
    map[selectedGenre || ""] ??
    { bookTypeId: "literary", genre: "literary-fiction" as Genre };

  setters.setBookTypeId(hit.bookTypeId);
  setters.setGenre(hit.genre);
  setters.setLevel1BookType(resolveLevel1FromBookTypeId(hit.bookTypeId));
}

export function formatForgeTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type ForgeWizardPrefill = {
  idea: string;
  authorName: string;
  targetReader: string;
  narrativePromise: string;
  coreConflict: string;
  setting: string;
  tone: string;
  openingHook: string;
  commercialGoal: string;
  structureType: string;
  wordsPerChapter: string;
  chapters: number | null;
  bookLength: "short" | "medium" | "long" | null;
  subchapters: { enabled: boolean; count: number } | null;
  protagonist: string;
  antagonist: string;
  secondaryCast: string;
  canonRules: string;
  forbiddenContent: string;
  mainTwists: string;
  endingType: string;
};

function parseChapterCount(raw: unknown): number | null {
  const value = cleanStr(raw);
  if (!value || /ottimizza|decidi|scegli tu/i.test(value)) return null;
  const match = value.match(/\b(\d{1,2})\b/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? Math.min(32, Math.max(6, parsed)) : null;
}

function parseBookLength(raw: unknown): ForgeWizardPrefill["bookLength"] {
  const value = cleanStr(raw).toLowerCase();
  if (!value) return null;
  if (/breve|short|snello|rapido/.test(value)) return "short";
  if (/lungo|long|completo|epico|profondo/.test(value)) return "long";
  if (/medio|medium|standard/.test(value)) return "medium";
  return null;
}

function parseSubchapters(raw: unknown): ForgeWizardPrefill["subchapters"] {
  const value = cleanStr(raw).toLowerCase();
  if (!value) return null;
  if (/\bno\b|senza|flusso continuo|solo capitoli/.test(value)) {
    return { enabled: false, count: 0 };
  }
  const explicit = value.match(/\b([1-5])\b/);
  if (/s[iì]|sottocapitoli|sottosezioni|dove serve|strutturat/.test(value)) {
    return { enabled: true, count: explicit ? Number(explicit[1]) : 3 };
  }
  return null;
}

function canonFacts(seed: ForgeInterviewSeed): string[] {
  if (!seed.canon) return [];
  return [
    ...seed.canon.world.facts,
    ...seed.canon.characters.facts,
    ...seed.canon.relationships.facts,
    ...seed.canon.story.facts,
    ...seed.canon.ending.facts,
    ...seed.canon.book.facts,
  ].map(cleanStr).filter(Boolean);
}

/**
 * Maps the confirmed guided interview into the editable wizard fields.
 * The author's raw premise remains separate from canon/metadata so it is never
 * replaced by a synthetic technical brief during the handoff.
 */
export function deriveForgeWizardPrefill(seed: ForgeInterviewSeed): ForgeWizardPrefill {
  const ex = seed.extracted ?? {};
  const protagonist = seed.characters?.find((character) => character.role === "protagonist");
  const antagonist = seed.characters?.find((character) => character.role === "antagonist");
  const secondary = seed.characters
    ?.filter((character) => character.role === "supporting" || character.role === "love_interest")
    .map((character) => cleanStr(character.name))
    .filter(Boolean) ?? [];
  const rules = canonFacts(seed);
  const narrativeDecisions = seed.narrativeDecisions
    ?.map((decision) => cleanStr(decision.answer))
    .filter(Boolean) ?? [];
  const bookLength = parseBookLength(ex.bookLength);

  return {
    idea: cleanStr(ex.rawIdea) || cleanStr(ex.editorialSynopsis) || cleanStr(ex.readerTransformation),
    authorName: cleanStr(ex.authorName),
    targetReader: cleanStr(ex.targetReader),
    narrativePromise:
      cleanStr(ex.promise) || resolveForgeCommercialPromise(seed) || cleanStr(ex.readerTransformation),
    coreConflict:
      cleanStr(ex.centralConflict) || cleanStr(seed.canon?.story.facts[0]),
    setting: cleanStr(ex.setting),
    tone: cleanStr(ex.emotionalTone) || cleanStr(ex.tone),
    openingHook: cleanStr(ex.openingHook) || resolveForgeCommercialHook(seed),
    commercialGoal: cleanStr(ex.commercialGoal) || cleanStr(ex.promise),
    structureType: cleanStr(ex.structurePreference),
    wordsPerChapter: cleanStr(ex.chapterLength) || (bookLength === "short" ? "1200-1800" : bookLength === "long" ? "2200-3000" : "1800-2400"),
    chapters: parseChapterCount(ex.chapterCount),
    bookLength,
    subchapters: parseSubchapters(ex.subchaptersPreference),
    protagonist: cleanStr(protagonist?.name),
    antagonist: cleanStr(antagonist?.name) || cleanStr(ex.antagonist),
    secondaryCast: secondary.join(", "),
    canonRules: rules.join("\n"),
    forbiddenContent: (seed.dnaLock?.forbiddenPatterns ?? []).map(cleanStr).filter(Boolean).join("\n"),
    mainTwists: narrativeDecisions.join("\n"),
    endingType: buildForgeEndingLine(seed),
  };
}
