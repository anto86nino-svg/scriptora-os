import type { ForgeInterviewMemory, ForgeSlotKey } from "./interview-memory";

const FICTION_GENRES = /romanzo|romance|dark romance|thriller|horror|fantasy|giallo|noir|narrativa|fiction|memoir|racconti/i;
const NONFICTION_GENRES = /self-help|saggio|manuale|guida|business|studio|universitar/i;
const POETRY_GENRES = /poesia|poetry|verso|lyric/i;

function isFilled(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const value = memory.slotValues[slot];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length >= 2;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

function slotFilled(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  return Boolean(memory.answeredSlots[slot]) && isFilled(memory, slot);
}

export function detectNarrativeBookMode(
  memory: ForgeInterviewMemory,
): "fiction" | "nonfiction" | "poetry" {
  const bag = [
    memory.slotValues.bookType,
    memory.slotValues.genre,
    memory.slotValues.rawIdea,
  ]
    .filter(Boolean)
    .join(" ");

  if (POETRY_GENRES.test(bag)) return "poetry";
  if (NONFICTION_GENRES.test(bag)) return "nonfiction";
  if (FICTION_GENRES.test(bag)) return "fiction";
  return "fiction";
}

/** Admin / PM slots — deferred until narrative core exists in fiction. */
export const FORGE_ADMIN_SLOTS: ForgeSlotKey[] = [
  "language",
  "authorName",
  "chapterCount",
  "subchaptersEnabled",
  "marketplace",
  "indexOutline",
  "frontMatter",
  "backMatter",
  "pov",
];

export const NARRATIVE_FICTION_SLOT_PRIORITY: ForgeSlotKey[] = [
  "rawIdea",
  "genre",
  "bookType",
  "protagonist",
  "loveInterest",
  "antagonist",
  "promise",
  "stakes",
  "centralConflict",
  "endingDirection",
  "narrativeArc",
  "tone",
  "audience",
  "setting",
  "language",
  "chapterCount",
  "pov",
  "indexOutline",
  "title",
];

export function isNarrativeFictionBook(memory: ForgeInterviewMemory): boolean {
  return detectNarrativeBookMode(memory) === "fiction";
}

export function isRomanceMode(memory: ForgeInterviewMemory): boolean {
  const bag = [
    memory.slotValues.genre,
    memory.slotValues.subgenre,
    memory.slotValues.bookType,
    memory.slotValues.rawIdea,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /romance|dark.?romance|amore|love story/.test(bag);
}

export function hasNarrativeCore(memory: ForgeInterviewMemory): boolean {
  const hasProtagonist = slotFilled(memory, "protagonist");
  const hasDesire = slotFilled(memory, "promise") || slotFilled(memory, "stakes");
  const hasObstacle =
    slotFilled(memory, "antagonist") ||
    slotFilled(memory, "centralConflict") ||
    (isRomanceMode(memory) && slotFilled(memory, "loveInterest"));
  const hasConflict = slotFilled(memory, "centralConflict");
  return hasProtagonist && hasDesire && hasObstacle && hasConflict;
}

export function isDeferredAdminSlot(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  if (!isNarrativeFictionBook(memory)) return false;
  if (!FORGE_ADMIN_SLOTS.includes(slot)) return false;
  return !hasNarrativeCore(memory);
}

export function filterNarrativeFirstSlots(
  memory: ForgeInterviewMemory,
  slots: ForgeSlotKey[],
): ForgeSlotKey[] {
  const romance = isRomanceMode(memory);
  return slots.filter((slot) => {
    if (isDeferredAdminSlot(memory, slot)) return false;
    if (slot === "loveInterest" && !romance) return false;
    return true;
  });
}

export function getNarrativeFirstSlotPriority(memory: ForgeInterviewMemory): ForgeSlotKey[] {
  const romance = isRomanceMode(memory);
  return NARRATIVE_FICTION_SLOT_PRIORITY.filter(
    (slot) => slot !== "loveInterest" || romance,
  );
}

export function pickNextNarrativeSlot(
  memory: ForgeInterviewMemory,
  missing: ForgeSlotKey[],
): ForgeSlotKey | null {
  const filtered = filterNarrativeFirstSlots(memory, missing);
  for (const slot of getNarrativeFirstSlotPriority(memory)) {
    if (filtered.includes(slot)) return slot;
  }
  return filtered[0] ?? null;
}
