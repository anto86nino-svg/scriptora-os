import type { ForgeInterviewMemory, ForgeSlotKey } from "./interview-memory";
import { isSlotFilled } from "./interview-memory";
import { FORGE_GENRE_OPENING_QUESTION_ID, isGenreSlotLocked } from "./forge-genre-catalog";
import { isRomanceMode } from "./narrative-first-engine";

export type StoryRoomStageId =
  | "idea"
  | "language"
  | "genre"
  | "tone"
  | "audience"
  | "promise"
  | "characters"
  | "stakes"
  | "structure"
  | "title"
  | "frontMatter"
  | "ending"
  | "bookFoundationLock"
  | "blueprintReady";

export type StoryRoomSlotGroup =
  | "idea"
  | "language"
  | "genre"
  | "tone"
  | "audience"
  | "promise"
  | "characters"
  | "stakes"
  | "structure"
  | "title"
  | "frontMatter"
  | "ending";

export type StoryRoomMachineState = {
  currentStageId: StoryRoomStageId;
  completedStageIds: StoryRoomStageId[];
  askedQuestionIds: string[];
  completedSlotKeys: ForgeSlotKey[];
  questionCountByStage: Partial<Record<StoryRoomStageId, number>>;
};

export type StoryRoomStageDef = {
  id: StoryRoomStageId;
  label: string;
  requiredSlots: ForgeSlotKey[];
  optionalSlots?: ForgeSlotKey[];
  maxQuestions: number;
  appliesTo?: "all" | "fiction" | "nonfiction" | "poetry";
};

export const STORY_ROOM_STAGE_DEFS: StoryRoomStageDef[] = [
  { id: "idea", label: "Idea", requiredSlots: ["rawIdea"], maxQuestions: 2, appliesTo: "all" },
  { id: "language", label: "Lingua", requiredSlots: ["language"], optionalSlots: ["authorName"], maxQuestions: 2, appliesTo: "all" },
  { id: "genre", label: "Genere", requiredSlots: ["genre"], optionalSlots: ["bookType", "subgenre"], maxQuestions: 3, appliesTo: "all" },
  { id: "tone", label: "Tono", requiredSlots: ["tone"], maxQuestions: 2, appliesTo: "all" },
  { id: "audience", label: "Pubblico", requiredSlots: ["audience"], maxQuestions: 2, appliesTo: "all" },
  { id: "promise", label: "Promessa", requiredSlots: ["promise"], maxQuestions: 2, appliesTo: "all" },
  {
    id: "characters",
    label: "Personaggi",
    requiredSlots: ["protagonist", "antagonist"],
    optionalSlots: ["loveInterest"],
    maxQuestions: 4,
    appliesTo: "fiction",
  },
  {
    id: "stakes",
    label: "Posta in gioco",
    requiredSlots: ["stakes", "centralConflict"],
    maxQuestions: 3,
    appliesTo: "fiction",
  },
  {
    id: "structure",
    label: "Struttura",
    requiredSlots: ["chapterCount"],
    optionalSlots: ["marketplace", "subchaptersEnabled", "pov"],
    maxQuestions: 3,
    appliesTo: "all",
  },
  { id: "title", label: "Titolo", requiredSlots: ["title"], maxQuestions: 2, appliesTo: "all" },
  {
    id: "frontMatter",
    label: "Front matter",
    requiredSlots: ["frontMatter"],
    optionalSlots: ["backMatter"],
    maxQuestions: 2,
    appliesTo: "all",
  },
  {
    id: "ending",
    label: "Finale",
    requiredSlots: ["endingDirection"],
    optionalSlots: ["narrativeArc"],
    maxQuestions: 3,
    appliesTo: "fiction",
  },
  {
    id: "bookFoundationLock",
    label: "Fondamenta",
    requiredSlots: ["title", "subtitle", "chapterCount"],
    optionalSlots: ["protagonist", "antagonist", "promise"],
    maxQuestions: 0,
    appliesTo: "all",
  },
  { id: "blueprintReady", label: "Blueprint", requiredSlots: [], maxQuestions: 0, appliesTo: "all" },
];

const SLOT_ALIAS_GROUPS: Record<StoryRoomSlotGroup, string[]> = {
  idea: ["rawIdea", "concept", "premise", "whatBookIs"],
  language: ["language"],
  genre: ["genre", "genreDNA", "subgenre", "bookType"],
  tone: ["tone", "emotionalTone", "atmosphere", "darknessLevel"],
  audience: ["audience", "targetAudience", "idealReader", "readerProfile", "targetReader"],
  promise: ["promise", "marketPromise", "readerPromise", "emotionalPromise", "bookPromise"],
  characters: [
    "protagonist",
    "mainCharacter",
    "heroine",
    "hero",
    "loveInterest",
    "antagonist",
    "antagonistOrLoveInterest",
    "emotionalPoles",
  ],
  stakes: ["stakes", "emotionalStakes", "primaryLoss", "centralConflict", "wound", "desire"],
  structure: ["chapterCount", "chaptersCount", "structure", "structurePreference", "subchaptersEnabled", "pov"],
  title: ["title", "workingTitle", "titleStrategy"],
  frontMatter: ["frontMatter", "dedication", "preface"],
  ending: ["endingDirection", "ending", "finalEmotion", "finaleType", "narrativeDrive"],
};

const CANONICAL_SLOT_FALLBACK: Partial<Record<StoryRoomSlotGroup, ForgeSlotKey[]>> = {
  idea: ["rawIdea"],
  language: ["language"],
  genre: ["genre", "bookType", "subgenre"],
  tone: ["tone"],
  audience: ["audience"],
  promise: ["promise"],
  characters: ["protagonist", "loveInterest", "antagonist"],
  stakes: ["stakes", "centralConflict"],
  structure: ["chapterCount", "pov"],
  title: ["title", "subtitle"],
  frontMatter: ["frontMatter", "backMatter"],
  ending: ["endingDirection", "narrativeArc"],
};

const PROVISIONAL_CONFIRMATION =
  "Perfetto, lo fissiamo come direzione provvisoria. Se serve lo rifiniamo prima del blueprint.";

const MIN_TEXT = 3;
const MIN_SPECIFIC = 12;

function slotBag(memory: ForgeInterviewMemory): Record<string, unknown> {
  return memory.slotValues as Record<string, unknown>;
}

export function hasMeaningfulSlotText(value: unknown, min = MIN_TEXT): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length >= min;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) {
    return value.some((entry) => hasMeaningfulSlotText(entry, min));
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      hasMeaningfulSlotText(entry, min),
    );
  }
  return false;
}

function bagValue(bag: Record<string, unknown>, key: string): unknown {
  return bag[key];
}

function nestedValue(bag: Record<string, unknown>, parentKey: string, childKey: string): unknown {
  const parent = bag[parentKey];
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return undefined;
  return (parent as Record<string, unknown>)[childKey];
}

function anyAliasInBag(bag: Record<string, unknown>, aliases: string[], min = MIN_TEXT): boolean {
  for (const key of aliases) {
    if (hasMeaningfulSlotText(bagValue(bag, key), min)) return true;
  }
  return false;
}

function anyCanonicalFilled(memory: ForgeInterviewMemory, keys: ForgeSlotKey[]): boolean {
  return keys.some((key) => isSlotFilled(memory, key));
}

function isSpecificEmotionalPoles(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length >= MIN_SPECIFIC;
  if (Array.isArray(value)) {
    const meaningful = value.filter((entry) => String(entry).trim().length >= 4);
    return meaningful.length >= 2 || meaningful.join(" ").length >= MIN_SPECIFIC;
  }
  if (value && typeof value === "object") {
    return hasMeaningfulSlotText(value, MIN_SPECIFIC);
  }
  return false;
}

function hasProtagonistLead(bag: Record<string, unknown>, memory: ForgeInterviewMemory): boolean {
  return (
    anyAliasInBag(bag, ["protagonist", "mainCharacter", "heroine", "hero"]) ||
    anyCanonicalFilled(memory, ["protagonist"])
  );
}

function hasCharacterCounterpart(bag: Record<string, unknown>, memory: ForgeInterviewMemory): boolean {
  if (
    anyAliasInBag(bag, ["loveInterest", "antagonist", "antagonistOrLoveInterest"]) ||
    anyCanonicalFilled(memory, ["loveInterest", "antagonist"])
  ) {
    return true;
  }
  return isSpecificEmotionalPoles(bagValue(bag, "emotionalPoles"));
}

/** Central slot resolver — aliases, nested values, canonical forge keys. */
export function hasStoryRoomSlotValue(
  memory: ForgeInterviewMemory,
  slotKey: StoryRoomSlotGroup,
): boolean {
  const bag = slotBag(memory);

  switch (slotKey) {
    case "idea":
      return (
        anyAliasInBag(bag, SLOT_ALIAS_GROUPS.idea) ||
        anyCanonicalFilled(memory, ["rawIdea"]) ||
        memory.usefulAnswerCount >= 1
      );

    case "language":
      return anyAliasInBag(bag, SLOT_ALIAS_GROUPS.language) || anyCanonicalFilled(memory, ["language"]);

    case "genre":
      return (
        isGenreSlotLocked(memory) ||
        anyAliasInBag(bag, SLOT_ALIAS_GROUPS.genre) ||
        anyCanonicalFilled(memory, ["genre", "bookType", "subgenre"])
      );

    case "tone":
      return anyAliasInBag(bag, SLOT_ALIAS_GROUPS.tone) || anyCanonicalFilled(memory, ["tone"]);

    case "audience":
      return anyAliasInBag(bag, SLOT_ALIAS_GROUPS.audience) || anyCanonicalFilled(memory, ["audience"]);

    case "promise":
      if (anyAliasInBag(bag, SLOT_ALIAS_GROUPS.promise) || anyCanonicalFilled(memory, ["promise"])) {
        return true;
      }
      return hasMeaningfulSlotText(nestedValue(bag, "marketPromise", "uniqueAngle"), MIN_TEXT);

    case "characters":
      if (isSpecificEmotionalPoles(bagValue(bag, "emotionalPoles"))) return true;
      if (hasProtagonistLead(bag, memory) && hasCharacterCounterpart(bag, memory)) return true;
      if (isRomanceMode(memory)) {
        return (
          (hasProtagonistLead(bag, memory) && hasMeaningfulSlotText(bagValue(bag, "loveInterest"))) ||
          anyCanonicalFilled(memory, ["protagonist", "loveInterest"])
        );
      }
      return hasProtagonistLead(bag, memory) && hasCharacterCounterpart(bag, memory);

    case "stakes":
      if (anyAliasInBag(bag, SLOT_ALIAS_GROUPS.stakes) || anyCanonicalFilled(memory, ["stakes", "centralConflict"])) {
        return true;
      }
      return hasMeaningfulSlotText(nestedValue(bag, "stakes", "primaryLoss"), MIN_TEXT);

    case "structure":
      return (
        anyAliasInBag(bag, SLOT_ALIAS_GROUPS.structure) ||
        anyCanonicalFilled(memory, ["chapterCount", "pov", "subchaptersEnabled"])
      );

    case "title":
      if (anyAliasInBag(bag, SLOT_ALIAS_GROUPS.title) || anyCanonicalFilled(memory, ["title", "subtitle"])) {
        return true;
      }
      return hasMeaningfulSlotText(nestedValue(bag, "titleStrategy", "workingTitle"), MIN_TEXT);

    case "frontMatter":
      if (anyAliasInBag(bag, SLOT_ALIAS_GROUPS.frontMatter) || anyCanonicalFilled(memory, ["frontMatter"])) {
        return true;
      }
      return hasMeaningfulSlotText(nestedValue(bag, "frontMatter", "mode"), MIN_TEXT);

    case "ending":
      return (
        anyAliasInBag(bag, SLOT_ALIAS_GROUPS.ending) ||
        anyCanonicalFilled(memory, ["endingDirection", "narrativeArc"])
      );

    default:
      return false;
  }
}

function detectBookMode(memory: ForgeInterviewMemory): "fiction" | "nonfiction" | "poetry" {
  const bag = slotBag(memory);
  const parts = [
    bag.bookType,
    bag.genre,
    bag.genreDNA,
    bag.rawIdea,
    bag.concept,
  ]
    .filter(Boolean)
    .join(" ");
  if (/poesia|poetry|verso|lyric/i.test(parts)) return "poetry";
  if (/self-help|saggio|manuale|guida|business|studio|universitar/i.test(parts)) return "nonfiction";
  return "fiction";
}

export function createEmptyStoryRoomMachine(): StoryRoomMachineState {
  return {
    currentStageId: "idea",
    completedStageIds: [],
    askedQuestionIds: [],
    completedSlotKeys: [],
    questionCountByStage: {},
  };
}

export function getStoryRoomMachine(memory: ForgeInterviewMemory): StoryRoomMachineState {
  return memory.storyRoomMachine ?? createEmptyStoryRoomMachine();
}

function applicableStages(memory: ForgeInterviewMemory): StoryRoomStageDef[] {
  const mode = detectBookMode(memory);
  return STORY_ROOM_STAGE_DEFS.filter((stage) => {
    if (stage.id === "blueprintReady") return true;
    if (!stage.appliesTo || stage.appliesTo === "all") return true;
    if (stage.appliesTo === "fiction") return mode === "fiction";
    if (stage.appliesTo === "nonfiction") return mode === "nonfiction";
    if (stage.appliesTo === "poetry") return mode === "poetry";
    return true;
  });
}

export function isStageRequirementMet(
  stage: StoryRoomStageDef,
  memory: ForgeInterviewMemory,
): boolean {
  if (stage.id === "blueprintReady" || stage.id === "bookFoundationLock") return false;
  return hasStoryRoomSlotValue(memory, stage.id as StoryRoomSlotGroup);
}

export function getCompletedStagesFromSlots(memory: ForgeInterviewMemory): StoryRoomStageId[] {
  return evaluateStageCompletion(memory);
}

export function evaluateStageCompletion(memory: ForgeInterviewMemory): StoryRoomStageId[] {
  const completed: StoryRoomStageId[] = [];
  for (const stage of applicableStages(memory)) {
    if (stage.id === "blueprintReady" || stage.id === "bookFoundationLock") continue;
    if (isStageRequirementMet(stage, memory)) {
      completed.push(stage.id);
    }
  }
  return completed;
}

export function getStageMissingHints(
  stage: StoryRoomStageDef,
  memory: ForgeInterviewMemory,
): string[] {
  if (isStageRequirementMet(stage, memory)) return [];
  const group = stage.id as StoryRoomSlotGroup;
  const aliases = SLOT_ALIAS_GROUPS[group] ?? [];
  const canonical = CANONICAL_SLOT_FALLBACK[group] ?? stage.requiredSlots;
  return [...aliases, ...canonical].slice(0, 6);
}

export function getStoryRoomProgressDebugInfo(memory: ForgeInterviewMemory): {
  percent: number;
  completedStageIds: StoryRoomStageId[];
  currentStageId: StoryRoomStageId;
  missingByStage: Record<string, string[]>;
} {
  const machine = getStoryRoomMachine(memory);
  const completedStageIds = [...new Set([
    ...machine.completedStageIds,
    ...evaluateStageCompletion(memory),
  ])];
  const currentStageId = resolveCurrentStoryRoomStage(memory);
  const missingByStage: Record<string, string[]> = {};

  for (const stage of applicableStages(memory)) {
    if (stage.id === "blueprintReady") continue;
    if (!completedStageIds.includes(stage.id)) {
      missingByStage[stage.id] = getStageMissingHints(stage, memory);
    }
  }

  return {
    percent: getStoryRoomProgressPercent(memory),
    completedStageIds,
    currentStageId,
    missingByStage,
  };
}

export function resolveCurrentStoryRoomStage(memory: ForgeInterviewMemory): StoryRoomStageId {
  const stages = applicableStages(memory);
  const completed = new Set(evaluateStageCompletion(memory));
  const machine = getStoryRoomMachine(memory);

  for (const stage of stages) {
    if (stage.id === "blueprintReady" || stage.id === "bookFoundationLock") continue;
    if (!completed.has(stage.id)) return stage.id;
  }

  if (machine.currentStageId === "blueprintReady") return "blueprintReady";
  return "bookFoundationLock";
}

function canonicalSlotsForStage(stage: StoryRoomStageDef, memory: ForgeInterviewMemory): ForgeSlotKey[] {
  if (stage.id === "characters" && isRomanceMode(memory)) {
    return ["protagonist", "loveInterest", "antagonist"];
  }
  return [...stage.requiredSlots, ...(stage.optionalSlots ?? [])];
}

export function advanceStoryRoomStage(
  memory: ForgeInterviewMemory,
  opts?: { lastAnswer?: string; forceStageId?: StoryRoomStageId },
): ForgeInterviewMemory {
  const machine = getStoryRoomMachine(memory);
  const stages = applicableStages(memory);
  const completedFromSlots = evaluateStageCompletion(memory);
  const completedStageIds = [...new Set([...machine.completedStageIds, ...completedFromSlots])];

  const currentBefore = machine.currentStageId;
  const currentDef = stages.find((s) => s.id === currentBefore);
  const questionCount = machine.questionCountByStage[currentBefore] ?? 0;

  if (
    currentDef &&
    opts?.lastAnswer &&
    questionCount >= currentDef.maxQuestions &&
    !isStageRequirementMet(currentDef, memory)
  ) {
    for (const slot of canonicalSlotsForStage(currentDef, memory)) {
      if (!isSlotFilled(memory, slot)) {
        memory.slotValues[slot] = opts.lastAnswer.trim();
        memory.answeredSlots[slot] = true;
        if (!machine.completedSlotKeys.includes(slot)) {
          machine.completedSlotKeys.push(slot);
        }
      }
    }
  }

  const refreshedCompleted = evaluateStageCompletion(memory);
  const mergedCompleted = [...new Set([...completedStageIds, ...refreshedCompleted])];

  const completedSlotKeys = [...machine.completedSlotKeys];
  for (const stage of stages) {
    if (!mergedCompleted.includes(stage.id)) continue;
    for (const slot of canonicalSlotsForStage(stage, memory)) {
      if (isSlotFilled(memory, slot) && !completedSlotKeys.includes(slot)) {
        completedSlotKeys.push(slot);
      }
    }
  }

  const currentStageId = opts?.forceStageId ?? resolveCurrentStoryRoomStage(memory);
  const actionableStages = stages.filter(
    (s) => s.id !== "blueprintReady" && s.id !== "bookFoundationLock",
  );
  const allDone = mergedCompleted.length >= actionableStages.length;
  const nextStageId = opts?.forceStageId
    ? opts.forceStageId
    : allDone && machine.currentStageId !== "blueprintReady"
      ? "bookFoundationLock"
      : allDone
        ? "blueprintReady"
        : currentStageId;

  return {
    ...memory,
    storyRoomMachine: {
      ...machine,
      currentStageId: nextStageId,
      completedStageIds: mergedCompleted,
      completedSlotKeys,
    },
    currentStage: mapStageIdToForgeMemoryStage(currentStageId),
    completedStages: mergedCompleted.map(mapStageIdToForgeMemoryStage).filter(Boolean) as ForgeInterviewMemory["completedStages"],
  };
}

function mapStageIdToForgeMemoryStage(id: StoryRoomStageId): ForgeInterviewMemory["currentStage"] | null {
  const map: Partial<Record<StoryRoomStageId, ForgeInterviewMemory["currentStage"]>> = {
    idea: "spark",
    language: "language",
    genre: "genre",
    tone: "tone",
    audience: "audience",
    promise: "promise",
    characters: "characters",
    stakes: "plot",
    structure: "structure",
    title: "title",
    frontMatter: "title",
    ending: "plot",
    bookFoundationLock: "dna-lock",
    blueprintReady: "dna-lock",
  };
  return map[id] ?? null;
}

export function markStoryRoomQuestionAsked(
  memory: ForgeInterviewMemory,
  questionId: string,
): ForgeInterviewMachinePatch {
  const machine = getStoryRoomMachine(memory);
  const stageId = machine.currentStageId;
  const askedQuestionIds = machine.askedQuestionIds.includes(questionId)
    ? machine.askedQuestionIds
    : [...machine.askedQuestionIds, questionId];

  return {
    askedQuestionIds,
    questionCountByStage: {
      ...machine.questionCountByStage,
      [stageId]: (machine.questionCountByStage[stageId] ?? 0) + 1,
    },
  };
}

type ForgeInterviewMachinePatch = Pick<
  StoryRoomMachineState,
  "askedQuestionIds" | "questionCountByStage"
>;

function stageGroupForQuestionSlot(slot: ForgeSlotKey | null): StoryRoomSlotGroup | null {
  if (!slot) return null;
  const map: Partial<Record<ForgeSlotKey, StoryRoomSlotGroup>> = {
    rawIdea: "idea",
    language: "language",
    genre: "genre",
    bookType: "genre",
    subgenre: "genre",
    tone: "tone",
    audience: "audience",
    promise: "promise",
    protagonist: "characters",
    loveInterest: "characters",
    antagonist: "characters",
    stakes: "stakes",
    centralConflict: "stakes",
    chapterCount: "structure",
    pov: "structure",
    title: "title",
    frontMatter: "frontMatter",
    endingDirection: "ending",
    narrativeArc: "ending",
  };
  return map[slot] ?? null;
}

export function wasStoryRoomQuestionAsked(
  memory: ForgeInterviewMemory,
  questionId: string,
): boolean {
  const machine = getStoryRoomMachine(memory);
  const slot = questionKeyToSlotForMachine(questionId);
  const group = stageGroupForQuestionSlot(slot);
  if (group && !hasStoryRoomSlotValue(memory, group)) return false;
  return machine.askedQuestionIds.includes(questionId);
}

function questionKeyToSlotForMachine(questionId: string): ForgeSlotKey | null {
  const aliases: Record<string, ForgeSlotKey> = {
    "language-confirmation": "language",
    "tone-preset": "tone",
    "audience-preset": "audience",
    "promise-preset": "promise",
    "characters-protagonist": "protagonist",
    "characters-antagonist": "antagonist",
    "characters-attraction": "loveInterest",
    "plot-stakes": "stakes",
    "plot-conflict": "centralConflict",
    "plot-ending": "endingDirection",
    "structure-preset": "chapterCount",
    "title-preset": "title",
    "front-matter-preset": "frontMatter",
    [FORGE_GENRE_OPENING_QUESTION_ID]: "genre",
  };
  if (aliases[questionId]) return aliases[questionId];
  if (questionId.startsWith("adaptive-dr-")) return "protagonist";
  if (questionId.startsWith("confirm-deduced-")) {
    return questionId.replace("confirm-deduced-", "") as ForgeSlotKey;
  }
  return null;
}

export function shouldForceStageAdvance(memory: ForgeInterviewMemory): boolean {
  const machine = getStoryRoomMachine(memory);
  const stage = STORY_ROOM_STAGE_DEFS.find((s) => s.id === machine.currentStageId);
  if (!stage) return false;
  const count = machine.questionCountByStage[machine.currentStageId] ?? 0;
  return count >= Math.min(2, stage.maxQuestions) && !isStageRequirementMet(stage, memory);
}

export function getStoryRoomProgressPercent(memory: ForgeInterviewMemory): number {
  const stages = applicableStages(memory).filter(
    (s) => s.id !== "blueprintReady" && s.id !== "bookFoundationLock",
  );
  if (!stages.length) return 0;
  const machine = getStoryRoomMachine(memory);
  const completed = new Set([
    ...machine.completedStageIds,
    ...evaluateStageCompletion(memory),
  ]);
  const done = stages.filter((s) => completed.has(s.id)).length;
  return Math.round((done / stages.length) * 100);
}

export type StoryRoomProgressTrail = {
  completed: string[];
  current: string;
  upcoming: string[];
  percent: number;
  currentStageId: StoryRoomStageId;
  blueprintReady: boolean;
};

export function buildStoryRoomProgressTrail(memory: ForgeInterviewMemory): StoryRoomProgressTrail {
  const stages = applicableStages(memory).filter(
    (s) => s.id !== "blueprintReady" && s.id !== "bookFoundationLock",
  );
  const machine = getStoryRoomMachine(memory);
  const completedIds = new Set([
    ...machine.completedStageIds,
    ...evaluateStageCompletion(memory),
  ]);
  const currentStageId = resolveCurrentStoryRoomStage(memory);
  const currentIdx = stages.findIndex((s) => s.id === currentStageId);

  const completed = stages.filter((s) => completedIds.has(s.id)).map((s) => s.label);
  const current = stages.find((s) => s.id === currentStageId)?.label ?? "Blueprint";
  const upcoming =
    currentIdx >= 0 ? stages.slice(currentIdx + 1).map((s) => s.label) : [];

  return {
    completed,
    current,
    upcoming,
    percent: getStoryRoomProgressPercent(memory),
    currentStageId,
    blueprintReady: currentStageId === "blueprintReady",
  };
}

export function buildStoryRoomProgressLabel(memory: ForgeInterviewMemory): string {
  const trail = buildStoryRoomProgressTrail(memory);
  const parts = [
    ...trail.completed.map((l) => `✓ ${l}`),
    `→ ${trail.current}`,
    ...trail.upcoming.slice(0, 3),
  ];
  return parts.join(" → ");
}

function missingCanonicalSlotsForStage(stage: StoryRoomStageDef, memory: ForgeInterviewMemory): ForgeSlotKey[] {
  const slots = canonicalSlotsForStage(stage, memory);
  if (stage.id === "characters") {
    const bag = slotBag(memory);
    const missing: ForgeSlotKey[] = [];
    if (!hasProtagonistLead(bag, memory)) missing.push("protagonist");
    if (isRomanceMode(memory) && !hasMeaningfulSlotText(bag.loveInterest) && !isSlotFilled(memory, "loveInterest")) {
      missing.push("loveInterest");
    } else if (!hasCharacterCounterpart(bag, memory)) {
      missing.push("antagonist");
    }
    return missing;
  }
  if (stage.id === "stakes") {
    if (hasStoryRoomSlotValue(memory, "stakes")) return [];
    return slots.filter((slot) => !isSlotFilled(memory, slot)).slice(0, 2);
  }
  return slots.filter((slot) => !isSlotFilled(memory, slot));
}

export function slotsForCurrentStage(memory: ForgeInterviewMemory): ForgeSlotKey[] {
  const machine = getStoryRoomMachine(memory);
  const stage = STORY_ROOM_STAGE_DEFS.find((s) => s.id === machine.currentStageId);
  if (!stage || stage.id === "blueprintReady") return [];
  if (hasStoryRoomSlotValue(memory, stage.id as StoryRoomSlotGroup)) return [];
  return missingCanonicalSlotsForStage(stage, memory);
}

export function isSlotOnCurrentStage(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const machine = getStoryRoomMachine(memory);
  const stage = STORY_ROOM_STAGE_DEFS.find((s) => s.id === machine.currentStageId);
  if (!stage) return true;
  return canonicalSlotsForStage(stage, memory).includes(slot);
}

export function getProvisionalAdvanceMessage(): string {
  return PROVISIONAL_CONFIRMATION;
}

export function isStoryRoomBlueprintReady(memory: ForgeInterviewMemory): boolean {
  const trail = buildStoryRoomProgressTrail(memory);
  return trail.blueprintReady;
}

export function normalizeSlotFromAnswer(
  memory: ForgeInterviewMemory,
  slot: ForgeSlotKey,
  answer: string,
): string {
  const text = answer.trim();
  if (!text) return text;

  if (slot === "language") {
    if (/italian|italiano|in italiano/i.test(text)) return "Italiano";
    if (/english|inglese|in inglese/i.test(text)) return "English";
  }

  return text;
}
