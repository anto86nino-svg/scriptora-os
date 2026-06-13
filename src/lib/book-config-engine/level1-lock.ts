import type { Level1BookType } from "./types";

export interface Level1Definition {
  id: Level1BookType;
  label: string;
  /** BOOK_TYPE_REGISTRY ids allowed under this level-1 type */
  allowedBookTypeIds: string[];
  /** Subcategory tokens that must be stripped when active */
  blockedSubcategoryTokens: string[];
}

const NARRATIVE_IDS = [
  "romance", "dark-romance", "fantasy", "cozy-fantasy", "thriller", "gothic-thriller",
  "crime", "horror", "mystery", "sci-fi", "dystopian", "ya", "historical", "adventure",
  "literary", "paranormal",
];

const SELF_HELP_IDS = [
  "self-help", "mindset", "coaching", "productivity",
];

const BUSINESS_IDS = ["business", "leadership", "finance"];
const MARKETING_IDS = ["marketing", "business"];
const MANUAL_IDS = ["technical-manual", "software-guide", "ai-tools-guide", "manual"];
const EDUCATION_IDS = ["education", "history-school", "math-school", "science-school"];
const BIOGRAPHY_IDS = ["self-help"]; // memoir routed via subgenre
const POETRY_IDS = ["poetry"];
const SPIRITUALITY_IDS = ["spirituality"];
const PSYCHOLOGY_IDS = ["psychology", "philosophy"];
const CHILDREN_IDS = ["ya", "fairy-tale", "children"];

const SELF_HELP_BLOCKED = [
  "dark romance", "murder mystery", "gothic thriller", "gothic", "fantasy quest",
  "noir", "whodunit", "paranormal romance",
];

const NARRATIVE_BLOCKED = [
  "mindset", "motivational", "coaching", "discipline", "habits", "healing framework",
  "productivity", "authority builder", "personal growth", "self-mastery", "wellness",
];

export const LEVEL1_REGISTRY: Level1Definition[] = [
  { id: "romanzo", label: "Romanzo", allowedBookTypeIds: NARRATIVE_IDS, blockedSubcategoryTokens: NARRATIVE_BLOCKED },
  { id: "self-help", label: "Self Help", allowedBookTypeIds: SELF_HELP_IDS, blockedSubcategoryTokens: SELF_HELP_BLOCKED },
  { id: "business", label: "Business", allowedBookTypeIds: BUSINESS_IDS, blockedSubcategoryTokens: [...SELF_HELP_BLOCKED, ...NARRATIVE_BLOCKED.filter((t) => t.includes("romance") || t.includes("thriller"))] },
  { id: "manuale", label: "Manuale", allowedBookTypeIds: MANUAL_IDS, blockedSubcategoryTokens: [...NARRATIVE_BLOCKED, ...SELF_HELP_BLOCKED] },
  { id: "educazione", label: "Educazione / Studio", allowedBookTypeIds: EDUCATION_IDS, blockedSubcategoryTokens: [...NARRATIVE_BLOCKED, ...SELF_HELP_BLOCKED] },
  { id: "biografia", label: "Biografia / Memoir", allowedBookTypeIds: ["self-help", "literary"], blockedSubcategoryTokens: NARRATIVE_BLOCKED },
  { id: "poesia", label: "Poesia", allowedBookTypeIds: POETRY_IDS, blockedSubcategoryTokens: [...NARRATIVE_BLOCKED, ...SELF_HELP_BLOCKED] },
  { id: "saggistica", label: "Saggistica", allowedBookTypeIds: ["philosophy", "psychology", "self-help"], blockedSubcategoryTokens: NARRATIVE_BLOCKED },
  { id: "spiritualita", label: "Spiritualità", allowedBookTypeIds: SPIRITUALITY_IDS, blockedSubcategoryTokens: NARRATIVE_BLOCKED.filter((t) => !t.includes("healing")) },
  { id: "marketing", label: "Marketing", allowedBookTypeIds: MARKETING_IDS, blockedSubcategoryTokens: [...NARRATIVE_BLOCKED, "mindset", "healing"] },
  { id: "psicologia", label: "Psicologia", allowedBookTypeIds: PSYCHOLOGY_IDS, blockedSubcategoryTokens: NARRATIVE_BLOCKED },
  { id: "bambini", label: "Bambini", allowedBookTypeIds: CHILDREN_IDS, blockedSubcategoryTokens: [...NARRATIVE_BLOCKED.filter((t) => t.includes("dark") || t.includes("murder")), "mindset", "coaching"] },
];

/** Map registry bookTypeId → level-1 master type. */
const BOOK_TYPE_TO_LEVEL1: Record<string, Level1BookType> = {
  romance: "romanzo", "dark-romance": "romanzo", fantasy: "romanzo", "cozy-fantasy": "romanzo",
  thriller: "romanzo", "gothic-thriller": "romanzo", crime: "romanzo", horror: "romanzo",
  mystery: "romanzo", "sci-fi": "romanzo", dystopian: "romanzo", ya: "bambini",
  historical: "romanzo", adventure: "romanzo", literary: "romanzo", paranormal: "romanzo",
  "self-help": "self-help", mindset: "self-help", coaching: "self-help", productivity: "self-help",
  business: "business", leadership: "business", finance: "business", marketing: "marketing",
  spirituality: "spiritualita", psychology: "psicologia", philosophy: "saggistica",
  education: "educazione", "history-school": "educazione", "math-school": "educazione", "science-school": "educazione",
  "technical-manual": "manuale", "software-guide": "manuale", "ai-tools-guide": "manuale", manual: "manuale",
  cookbook: "manuale", "cookbook-vegan": "manuale", "cookbook-keto": "manuale", "cookbook-dessert": "manuale",
  poetry: "poesia", children: "bambini", "fairy-tale": "bambini",
};

export function resolveLevel1FromBookTypeId(bookTypeId?: string): Level1BookType {
  if (bookTypeId && BOOK_TYPE_TO_LEVEL1[bookTypeId]) return BOOK_TYPE_TO_LEVEL1[bookTypeId];
  return "romanzo";
}

export function getLevel1Definition(level1: Level1BookType): Level1Definition {
  return LEVEL1_REGISTRY.find((d) => d.id === level1) || LEVEL1_REGISTRY[0];
}

export function isBookTypeAllowedForLevel1(bookTypeId: string, level1: Level1BookType): boolean {
  const def = getLevel1Definition(level1);
  return def.allowedBookTypeIds.includes(bookTypeId);
}

export function defaultBookTypeIdForLevel1(level1: Level1BookType): string {
  return getLevel1Definition(level1).allowedBookTypeIds[0];
}

export function inferLevel1FromConfig(input: {
  bookTypeId?: string;
  genre?: string;
  category?: string;
  subcategory?: string;
  subgenre?: string;
}): Level1BookType {
  if (input.bookTypeId) return resolveLevel1FromBookTypeId(input.bookTypeId);

  const hay = `${input.genre || ""} ${input.category || ""} ${input.subcategory || ""} ${input.subgenre || ""}`.toLowerCase();
  if (/self.?help|mindset|crescita|motivaz/i.test(hay)) return "self-help";
  if (/business|marketing|leadership|finance/i.test(hay)) return /marketing/i.test(hay) ? "marketing" : "business";
  if (/manuale|manual|software|ricett|cookbook/i.test(hay)) return "manuale";
  if (/educat|scuol|univers|studio|storia scol|matematica/i.test(hay)) return "educazione";
  if (/memoir|biograf/i.test(hay)) return "biografia";
  if (/poesia|poetry/i.test(hay)) return "poesia";
  if (/spirit|medita/i.test(hay)) return "spiritualita";
  if (/psicolog|filosof|saggist/i.test(hay)) return "psicologia";
  if (/bambin|ragazz|ya|favol/i.test(hay)) return "bambini";
  return "romanzo";
}

export function subcategoryMatchesBlockedToken(subcategory: string, tokens: string[]): boolean {
  const hay = subcategory.toLowerCase();
  return tokens.some((t) => hay.includes(t.toLowerCase()));
}
