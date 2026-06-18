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
  | "blueprintReady";

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
  { id: "blueprintReady", label: "Blueprint", requiredSlots: [], maxQuestions: 0, appliesTo: "all" },
];

const PROVISIONAL_CONFIRMATION =
  "Perfetto, lo fissiamo come direzione provvisoria. Se serve lo rifiniamo prima del blueprint.";

function detectBookMode(memory: ForgeInterviewMemory): "fiction" | "nonfiction" | "poetry" {
  const bag = [memory.slotValues.bookType, memory.slotValues.genre, memory.slotValues.rawIdea]
    .filter(Boolean)
    .join(" ");
  if (/poesia|poetry|verso|lyric/i.test(bag)) return "poetry";
  if (/self-help|saggio|manuale|guida|business|studio|universitar/i.test(bag)) return "nonfiction";
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

function romanceAdjustedRequired(stage: StoryRoomStageDef, memory: ForgeInterviewMemory): ForgeSlotKey[] {
  if (stage.id !== "characters") return stage.requiredSlots;
  if (isRomanceMode(memory)) {
    return ["protagonist", "loveInterest", "antagonist"];
  }
  return stage.requiredSlots;
}

export function isStageRequirementMet(
  stage: StoryRoomStageDef,
  memory: ForgeInterviewMemory,
): boolean {
  if (stage.id === "genre") {
    return isGenreSlotLocked(memory) || isSlotFilled(memory, "genre");
  }
  if (stage.id === "structure") {
    return isSlotFilled(memory, "chapterCount") || isSlotFilled(memory, "pov");
  }
  if (stage.id === "idea") {
    return isSlotFilled(memory, "rawIdea") || memory.usefulAnswerCount >= 1;
  }
  const required = romanceAdjustedRequired(stage, memory);
  return required.every((slot) => isSlotFilled(memory, slot));
}

export function evaluateStageCompletion(
  memory: ForgeInterviewMemory,
): StoryRoomStageId[] {
  const completed: StoryRoomStageId[] = [];
  for (const stage of applicableStages(memory)) {
    if (stage.id === "blueprintReady") continue;
    if (isStageRequirementMet(stage, memory)) {
      completed.push(stage.id);
    }
  }
  return completed;
}

export function resolveCurrentStoryRoomStage(memory: ForgeInterviewMemory): StoryRoomStageId {
  const stages = applicableStages(memory);
  const completed = new Set(evaluateStageCompletion(memory));

  for (const stage of stages) {
    if (stage.id === "blueprintReady") continue;
    if (!completed.has(stage.id)) return stage.id;
  }

  return "blueprintReady";
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
    for (const slot of romanceAdjustedRequired(currentDef, memory)) {
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
    for (const slot of [...stage.requiredSlots, ...(stage.optionalSlots ?? [])]) {
      if (isSlotFilled(memory, slot) && !completedSlotKeys.includes(slot)) {
        completedSlotKeys.push(slot);
      }
    }
  }

  const currentStageId = opts?.forceStageId ?? resolveCurrentStoryRoomStage(memory);
  const allDone = mergedCompleted.length >= stages.filter((s) => s.id !== "blueprintReady").length;

  return {
    ...memory,
    storyRoomMachine: {
      ...machine,
      currentStageId: allDone ? "blueprintReady" : currentStageId,
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

export function wasStoryRoomQuestionAsked(
  memory: ForgeInterviewMemory,
  questionId: string,
): boolean {
  const machine = getStoryRoomMachine(memory);
  const slot = questionKeyToSlotForMachine(questionId);
  if (slot && !isSlotFilled(memory, slot)) return false;
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
  const stages = applicableStages(memory).filter((s) => s.id !== "blueprintReady");
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
  const stages = applicableStages(memory).filter((s) => s.id !== "blueprintReady");
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
    blueprintReady: currentStageId === "blueprintReady" || completedIds.size >= stages.length,
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

export function slotsForCurrentStage(memory: ForgeInterviewMemory): ForgeSlotKey[] {
  const machine = getStoryRoomMachine(memory);
  const stage = STORY_ROOM_STAGE_DEFS.find((s) => s.id === machine.currentStageId);
  if (!stage || stage.id === "blueprintReady") return [];

  const required = romanceAdjustedRequired(stage, memory);
  const missing = required.filter((slot) => !isSlotFilled(memory, slot));
  if (missing.length > 0) return missing;

  const optional = (stage.optionalSlots ?? []).filter((slot) => !isSlotFilled(memory, slot));
  return optional;
}

export function isSlotOnCurrentStage(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const machine = getStoryRoomMachine(memory);
  const stage = STORY_ROOM_STAGE_DEFS.find((s) => s.id === machine.currentStageId);
  if (!stage) return true;
  const all = [...romanceAdjustedRequired(stage, memory), ...(stage.optionalSlots ?? [])];
  return all.includes(slot);
}

export function getProvisionalAdvanceMessage(): string {
  return PROVISIONAL_CONFIRMATION;
}

export function isStoryRoomBlueprintReady(memory: ForgeInterviewMemory): boolean {
  const trail = buildStoryRoomProgressTrail(memory);
  return trail.blueprintReady;
}

/** Normalize slot writes from chat / auto-answer into structured memory. */
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
