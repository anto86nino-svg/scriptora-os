import type { Genre, Language, BookCharacter } from "@/types/book";
import { resolveLevel1FromBookTypeId } from "@/lib/book-config-engine";
import type { Level1BookType } from "@/lib/book-config-studio/types";

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
