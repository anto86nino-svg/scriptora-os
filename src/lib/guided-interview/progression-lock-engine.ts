import type { ForgeInterviewMemory, ForgeSlotKey } from "./interview-memory";
import { detectBookMode } from "./interview-memory";
import { isGenreSlotLocked } from "./forge-genre-catalog";
import { isRomanceMode } from "./narrative-first-engine";

/** Mandatory progression toward blueprint */
export const PROGRESSION_LOCK_ORDER: ForgeSlotKey[] = [
  "genre",
  "bookType",
  "subgenre",
  "language",
  "authorName",
  "rawIdea",
  "promise",
  "audience",
  "tone",
  "protagonist",
  "loveInterest",
  "antagonist",
  "centralConflict",
  "stakes",
  "setting",
  "method",
  "problem",
  "outcome",
  "chapterCount",
  "subchaptersEnabled",
  "marketplace",
  "frontMatter",
  "backMatter",
  "indexOutline",
  "narrativeArc",
  "endingDirection",
  "title",
];

const PROGRESSION_PREREQUISITES: Partial<Record<ForgeSlotKey, ForgeSlotKey[]>> = {
  language: ["genre"],
  authorName: ["genre", "language"],
  rawIdea: ["genre", "language", "authorName"],
  promise: ["genre", "language", "authorName"],
  audience: ["genre", "language", "authorName", "promise"],
  tone: ["genre", "language", "authorName", "promise", "audience"],
  protagonist: ["genre", "language", "authorName"],
  loveInterest: ["genre", "language", "authorName", "protagonist"],
  antagonist: ["genre", "language", "authorName", "protagonist"],
  centralConflict: ["genre", "language", "authorName"],
  chapterCount: ["genre", "language", "authorName", "tone", "audience"],
  subchaptersEnabled: ["genre", "language", "authorName", "chapterCount"],
  marketplace: ["genre", "language", "authorName", "chapterCount"],
  frontMatter: ["genre", "language", "authorName", "chapterCount", "marketplace"],
  backMatter: ["genre", "language", "authorName", "chapterCount", "marketplace"],
  title: ["genre", "language", "authorName", "chapterCount"],
  method: ["genre", "language", "authorName"],
  problem: ["genre", "language", "authorName"],
  outcome: ["genre", "language", "authorName", "problem"],
};

function isSlotFilled(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const value = memory.slotValues[slot];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length >= 2;
  return true;
}

function isSlotRequiredForBook(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const mode = detectBookMode(memory);
  const romance = isRomanceMode(memory);
  const fictionOnly: ForgeSlotKey[] = [
    "protagonist",
    "loveInterest",
    "antagonist",
    "centralConflict",
    "stakes",
    "setting",
    "narrativeArc",
    "endingDirection",
    "indexOutline",
  ];
  const nonfictionOnly: ForgeSlotKey[] = ["method", "problem", "outcome"];
  if (mode === "nonfiction" && fictionOnly.includes(slot)) return false;
  if (mode === "fiction" && nonfictionOnly.includes(slot)) return false;
  if (slot === "loveInterest" && !romance) return false;
  if (slot === "rawIdea" && isGenreSlotLocked(memory)) return false;
  return true;
}

export function isSlotProgressionLocked(
  memory: ForgeInterviewMemory,
  slot: ForgeSlotKey,
): boolean {
  if (!isGenreSlotLocked(memory) && slot !== "genre" && slot !== "bookType" && slot !== "subgenre") {
    return true;
  }

  const prereqs = PROGRESSION_PREREQUISITES[slot];
  if (!prereqs) return false;

  for (const prior of prereqs) {
    if (!isSlotRequiredForBook(memory, prior)) continue;
    if (!isSlotFilled(memory, prior)) return true;
  }
  return false;
}

export function sortSlotsByProgression(
  memory: ForgeInterviewMemory,
  slots: ForgeSlotKey[],
): ForgeSlotKey[] {
  const mode = detectBookMode(memory);
  const romance = isRomanceMode(memory);
  const fictionOnly: ForgeSlotKey[] = [
    "protagonist",
    "loveInterest",
    "antagonist",
    "centralConflict",
    "stakes",
    "setting",
    "narrativeArc",
    "endingDirection",
    "indexOutline",
  ];
  const nonfictionOnly: ForgeSlotKey[] = ["method", "problem", "outcome"];

  return [...slots].sort((a, b) => {
    if (a === "loveInterest" && !romance) return 1;
    if (b === "loveInterest" && !romance) return -1;
    if (mode === "nonfiction" && fictionOnly.includes(a)) return 1;
    if (mode === "nonfiction" && fictionOnly.includes(b)) return -1;
    if (mode === "fiction" && nonfictionOnly.includes(a)) return 1;
    if (mode === "fiction" && nonfictionOnly.includes(b)) return -1;
    const ai = PROGRESSION_LOCK_ORDER.indexOf(a);
    const bi = PROGRESSION_LOCK_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

export function getProgressionLockLabel(slot: ForgeSlotKey): string {
  const labels: Partial<Record<ForgeSlotKey, string>> = {
    genre: "Genre Lock",
    language: "Language Lock",
    authorName: "Author Identity Lock",
    promise: "Concept Lock",
    audience: "Audience Lock",
    tone: "Tone Lock",
    chapterCount: "Structure Lock",
    marketplace: "Marketplace Lock",
    protagonist: "Character Lock",
    method: "Method Lock",
    title: "Title Direction",
  };
  return labels[slot] ?? "Lock";
}
