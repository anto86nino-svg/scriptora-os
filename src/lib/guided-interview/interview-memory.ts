import type { GuidedInterviewState, InterviewQuestion, InterviewQuickSuggestion } from "./types";
import { inferBookProfileFromText } from "./dna-inference";
import { DEPTH_KEY_TO_CRITICAL } from "./interview-continue";
import { countForgeUserAnswers } from "./opening-experience";
import {
  BOOK_TYPE_PRESETS,
  GENRE_DIRECTION_PRESETS,
  LANGUAGE_PRESETS,
  LENGTH_PRESETS,
  STRUCTURE_PRESETS,
  TITLE_PRESETS,
  TONE_PRESETS,
  UNCERTAINTY_PRESETS,
} from "./interview-presets";

export type ForgeMemoryStage =
  | "welcome"
  | "spark"
  | "language"
  | "book-type"
  | "genre"
  | "tone"
  | "audience"
  | "promise"
  | "characters"
  | "plot"
  | "structure"
  | "title"
  | "dna-lock"
  | "index";

export type ForgeSlotKey =
  | "rawIdea"
  | "language"
  | "bookType"
  | "genre"
  | "subgenre"
  | "tone"
  | "audience"
  | "promise"
  | "protagonist"
  | "loveInterest"
  | "antagonist"
  | "centralConflict"
  | "stakes"
  | "setting"
  | "endingDirection"
  | "chapterCount"
  | "subchaptersEnabled"
  | "pov"
  | "tense"
  | "title"
  | "subtitle"
  | "frontMatter"
  | "backMatter"
  | "forbiddenElements"
  | "mustHaveScenes"
  | "method"
  | "problem"
  | "outcome"
  | "narrativeArc"
  | "indexOutline"
  | "antiDriftRules";

export type ForgeSlotValues = Partial<Record<ForgeSlotKey, string | number | boolean | string[]>>;

export type ForgeInterviewMemory = {
  answeredSlots: Partial<Record<ForgeSlotKey, boolean>>;
  needsGuidance: Partial<Record<ForgeSlotKey, boolean>>;
  slotValues: ForgeSlotValues;
  askedQuestionKeys: string[];
  lastQuestionKey?: string;
  repeatedQuestionCount: number;
  currentStage: ForgeMemoryStage;
  completedStages: ForgeMemoryStage[];
  suggestedPresets: string[];
  confirmedPresets: string[];
  usefulAnswerCount: number;
  lastRecapAtAnswer?: number;
};

export type ForgeMemoryDiff = {
  newlyFilledSlots: ForgeSlotKey[];
  updatedSlots: ForgeSlotKey[];
  stillMissingSlots: ForgeSlotKey[];
  contradictionWarnings: string[];
};

export type ForgeQuestionDef = {
  id: string;
  slotTarget: ForgeSlotKey;
  stage: ForgeMemoryStage;
  intent: string;
  key: string;
  text: string | ((memory: ForgeInterviewMemory) => string);
  quickChoices?:
    | InterviewQuickSuggestion[]
    | ((memory: ForgeInterviewMemory) => InterviewQuickSuggestion[]);
  shouldAsk: (memory: ForgeInterviewMemory) => boolean;
};

const UNCERTAIN_PATTERN =
  /^(non lo so|non so|boh|forse|dipende|aiutami|guidami|scegli tu|non saprei|fammi vedere|alternative)/i;

export const FORGE_STAGE_ORDER: ForgeMemoryStage[] = [
  "welcome",
  "spark",
  "language",
  "book-type",
  "genre",
  "tone",
  "audience",
  "promise",
  "characters",
  "plot",
  "structure",
  "title",
  "dna-lock",
  "index",
];

const FICTION_GENRES = /romanzo|romance|dark romance|thriller|horror|fantasy|giallo|noir|narrativa|fiction|memoir|racconti/i;
const NONFICTION_GENRES = /self-help|saggio|manuale|guida|business|studio|universitar/i;
const POETRY_GENRES = /poesia|poetry|verso|lyric/i;

const CRITICAL_TO_SLOT: Record<string, ForgeSlotKey> = {
  targetReader: "audience",
  readerTransformation: "rawIdea",
  centralConflict: "centralConflict",
  emotionalTone: "tone",
  genreDNA: "genre",
  genre: "genre",
  promise: "promise",
  protagonistWound: "protagonist",
  characterWound: "antagonist",
  narrativeDrive: "endingDirection",
  structurePreference: "pov",
  bookTitle: "title",
  language: "language",
  bookType: "bookType",
  setting: "setting",
};

const SLOT_TO_EXTRACTED: Partial<Record<ForgeSlotKey, string>> = {
  rawIdea: "readerTransformation",
  language: "language",
  bookType: "bookType",
  genre: "genre",
  subgenre: "subgenre",
  tone: "emotionalTone",
  audience: "targetReader",
  promise: "promise",
  protagonist: "protagonistWound",
  centralConflict: "centralConflict",
  stakes: "centralConflict",
  setting: "setting",
  endingDirection: "narrativeDrive",
  chapterCount: "chapterCount",
  pov: "structurePreference",
  title: "bookTitle",
  subtitle: "bookSubtitle",
  method: "genreDNA",
  problem: "centralConflict",
  outcome: "readerTransformation",
  narrativeArc: "narrativeDrive",
  indexOutline: "structurePreference",
  antiDriftRules: "genreDNA",
};

const QUESTION_INTENT_ALIASES: Record<string, string[]> = {
  language: ["language", "language-confirmation", "confirm-language"],
  genre: ["genre", "genre-confirmation", "stage-direction", "genre-direction", "book-type"],
  tone: ["tone", "stage-genre", "emotional-tone"],
  audience: ["audience", "target-reader", "stage-audience"],
  promise: ["promise", "stage-promise"],
  protagonist: ["protagonist", "stage-character", "characters-protagonist"],
  antagonist: ["antagonist", "characters-antagonist", "characterWound"],
  centralConflict: ["conflict", "plot", "stage-plot", "stage-genre-thriller"],
  structure: ["structure", "stage-structure", "chapter-count"],
  title: ["title", "stage-title"],
  rawIdea: ["spark", "opening", "welcome", "openingSpark"],
};

export function createEmptyForgeMemory(): ForgeInterviewMemory {
  return {
    answeredSlots: {},
    needsGuidance: {},
    slotValues: {},
    askedQuestionKeys: [],
    repeatedQuestionCount: 0,
    currentStage: "welcome",
    completedStages: [],
    suggestedPresets: [],
    confirmedPresets: [],
    usefulAnswerCount: 0,
  };
}

export function getForgeMemory(state: GuidedInterviewState): ForgeInterviewMemory {
  if (state.forgeMemory) {
    return hydrateMemoryFromState(state, state.forgeMemory);
  }
  return hydrateMemoryFromState(state, createEmptyForgeMemory());
}

function hydrateMemoryFromState(
  state: GuidedInterviewState,
  base: ForgeInterviewMemory,
): ForgeInterviewMemory {
  const memory = { ...base, slotValues: { ...base.slotValues } };
  const ex = state.extracted ?? {};

  syncSlot(memory, "rawIdea", ex.readerTransformation || firstUserMessage(state));
  syncSlot(memory, "language", ex.language);
  syncSlot(memory, "bookType", ex.bookType || state.selectedBookType);
  syncSlot(memory, "genre", ex.genre || state.selectedGenre || ex.genreDNA);
  syncSlot(memory, "subgenre", ex.subgenre || state.inferredProfile?.subgenre);
  syncSlot(memory, "tone", ex.emotionalTone || state.selectedTone);
  syncSlot(memory, "audience", ex.targetReader);
  syncSlot(memory, "promise", ex.promise);
  syncSlot(memory, "protagonist", ex.protagonistWound);
  syncSlot(memory, "antagonist", ex.antagonistWound || ex.antagonist);
  syncSlot(memory, "centralConflict", ex.centralConflict);
  syncSlot(memory, "setting", ex.setting);
  syncSlot(memory, "narrativeArc", ex.narrativeArc);
  syncSlot(memory, "endingDirection", ex.narrativeDrive || ex.endingDirection);
  syncSlot(memory, "chapterCount", ex.chapterCount);
  syncSlot(memory, "indexOutline", ex.indexOutline);
  syncSlot(memory, "title", ex.bookTitle);
  syncSlot(memory, "subtitle", ex.bookSubtitle);
  syncSlot(memory, "method", ex.genreDNA);
  syncSlot(memory, "problem", ex.centralConflict);
  syncSlot(memory, "outcome", ex.readerTransformation);

  if (ex.structurePreference) {
    syncSlot(memory, "pov", ex.structurePreference);
    syncSlot(memory, "chapterCount", memory.slotValues.chapterCount || ex.chapterCount);
  }

  const antagonistChar = state.characters?.find(
    (c) => c.role === "antagonist" || c.role === "love_interest",
  );
  if (antagonistChar && !isSlotFilled(memory, "antagonist")) {
    const label = [antagonistChar.name, antagonistChar.wound, antagonistChar.obsession]
      .filter(Boolean)
      .join(" — ");
    syncSlot(memory, "antagonist", label);
  }

  memory.usefulAnswerCount = Math.max(
    memory.usefulAnswerCount,
    state.messages.filter((m) => m.role === "user").length,
  );
  memory.currentStage = resolveMemoryStage(memory);
  return memory;
}

function syncSlot(memory: ForgeInterviewMemory, key: ForgeSlotKey, value: unknown): void {
  if (value === undefined || value === null) return;
  const text = String(value).trim();
  if (!text || text.length < 2) return;
  memory.slotValues[key] = text;
  memory.answeredSlots[key] = true;
}

function firstUserMessage(state: GuidedInterviewState): string | undefined {
  return state.messages.find((m) => m.role === "user")?.content?.trim();
}

function isFilled(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  const value = memory.slotValues[slot];
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length >= 2;
  return true;
}

export function isSlotFilled(memory: ForgeInterviewMemory, slot: ForgeSlotKey): boolean {
  return Boolean(memory.answeredSlots[slot]) && isFilled(memory, slot);
}

export function isQuestionAlreadyAnswered(
  questionKey: string,
  memory: ForgeInterviewMemory,
): boolean {
  const slot = questionKeyToSlot(questionKey);
  if (slot && isSlotFilled(memory, slot)) return true;
  return memory.askedQuestionKeys.includes(questionKey);
}

export function isSimilarQuestionRecentlyAsked(
  questionKey: string,
  memory: ForgeInterviewMemory,
): boolean {
  const recent = memory.askedQuestionKeys.slice(-3);
  const intent = questionIntent(questionKey);
  return recent.some((key) => questionIntent(key) === intent);
}

export function markQuestionAsked(
  questionKey: string,
  memory: ForgeInterviewMemory,
): ForgeInterviewMemory {
  const intent = questionIntent(questionKey);
  const repeated =
    memory.lastQuestionKey && questionIntent(memory.lastQuestionKey) === intent
      ? memory.repeatedQuestionCount + 1
      : 0;

  return {
    ...memory,
    askedQuestionKeys: [...memory.askedQuestionKeys, questionKey].slice(-24),
    lastQuestionKey: questionKey,
    repeatedQuestionCount: repeated,
  };
}

function questionIntent(questionKey: string): string {
  for (const [intent, aliases] of Object.entries(QUESTION_INTENT_ALIASES)) {
    if (aliases.some((alias) => questionKey.includes(alias) || alias.includes(questionKey))) {
      return intent;
    }
  }
  return questionKey;
}

function questionKeyToSlot(questionKey: string): ForgeSlotKey | null {
  const intent = questionIntent(questionKey);
  const map: Record<string, ForgeSlotKey> = {
    language: "language",
    genre: "genre",
    tone: "tone",
    audience: "audience",
    promise: "promise",
    protagonist: "protagonist",
    antagonist: "antagonist",
    characterWound: "antagonist",
    centralConflict: "centralConflict",
    structure: "chapterCount",
    title: "title",
    rawIdea: "rawIdea",
  };
  return map[intent] ?? null;
}

export function isUncertainUserAnswer(text: string): boolean {
  const t = text.trim();
  if (t.length < 4) return true;
  return UNCERTAIN_PATTERN.test(t);
}

function parseLanguage(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\bitalian[oa]?|italiano\b/.test(t)) return "Italiano";
  if (/\benglish|inglese|in inglese\b/.test(t)) return "English";
  if (/\bespañol|spagnol[oa]\b/.test(t)) return "Español";
  if (/\bfrançais|frances[ei]\b/.test(t)) return "Français";
  if (/\bdeutsch|tedesc[oa]\b/.test(t)) return "Deutsch";
  return undefined;
}

function parseGenre(text: string): { genre?: string; bookType?: string; subgenre?: string } {
  const t = text.toLowerCase();
  if (/dark romance/.test(t)) return { genre: "dark-romance", bookType: "Dark romance", subgenre: "Dark romance psicologico" };
  if (/self[- ]?help|persone bloccate|metodo pratico/.test(t)) return { genre: "self-help", bookType: "Self-help" };
  if (/thriller/.test(t)) return { genre: "thriller", bookType: "Thriller" };
  if (/horror|gotico|gothic/.test(t)) return { genre: "horror", bookType: "Horror" };
  if (/fantasy|regno|magia/.test(t)) return { genre: "fantasy", bookType: "Fantasy" };
  if (/poesia|poetry|raccolta poet/.test(t)) return { genre: "poetry", bookType: "Poesia" };
  if (/memoir|autobiograf/.test(t)) return { genre: "memoir", bookType: "Memoir" };
  if (/saggio/.test(t)) return { genre: "general", bookType: "Saggio" };
  if (/manuale/.test(t)) return { genre: "manual", bookType: "Manuale" };
  if (/romance|romanzo/.test(t)) return { genre: "romance", bookType: "Romanzo" };
  if (/racconti/.test(t)) return { genre: "general", bookType: "Raccolta racconti" };
  if (/studio|universitar/.test(t)) return { genre: "general", bookType: "Studio / universitario" };
  return {};
}

function parseChapterCount(text: string): number | undefined {
  const match = text.match(/(\d{1,3})\s*capitol/i);
  if (match) return Number(match[1]);
  return undefined;
}

function parsePov(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/prima persona|first person|io narratore/.test(t)) return "Prima persona";
  if (/terza persona|third person/.test(t)) return "Terza persona";
  return undefined;
}

function parseTone(text: string): string | undefined {
  for (const preset of TONE_PRESETS) {
    if (text.toLowerCase().includes(preset.label.toLowerCase())) return preset.value;
  }
  return undefined;
}

export function detectBookMode(memory: ForgeInterviewMemory): "fiction" | "nonfiction" | "poetry" {
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

export function getCriticalMissingSlots(memory: ForgeInterviewMemory): ForgeSlotKey[] {
  const missing: ForgeSlotKey[] = [];
  const mode = detectBookMode(memory);

  if (!isSlotFilled(memory, "rawIdea")) missing.push("rawIdea");
  if (!isSlotFilled(memory, "language")) missing.push("language");
  if (!isSlotFilled(memory, "genre") && !isSlotFilled(memory, "bookType")) missing.push("genre");
  if (!isSlotFilled(memory, "tone")) missing.push("tone");
  if (!isSlotFilled(memory, "audience")) missing.push("audience");
  if (!isSlotFilled(memory, "promise")) missing.push("promise");
  if (!isSlotFilled(memory, "chapterCount") && !isSlotFilled(memory, "pov")) missing.push("chapterCount");
  if (!isSlotFilled(memory, "title")) missing.push("title");

  if (mode === "fiction") {
    if (!isSlotFilled(memory, "protagonist")) missing.push("protagonist");
    if (!isSlotFilled(memory, "antagonist")) missing.push("antagonist");
    if (!isSlotFilled(memory, "centralConflict")) missing.push("centralConflict");
    if (!isSlotFilled(memory, "narrativeArc") && !isSlotFilled(memory, "endingDirection")) {
      missing.push("narrativeArc");
    }
    if (!isSlotFilled(memory, "endingDirection")) missing.push("endingDirection");
    if (!isSlotFilled(memory, "indexOutline") && isSlotFilled(memory, "chapterCount")) {
      missing.push("indexOutline");
    }
  }

  if (mode === "nonfiction") {
    if (!isSlotFilled(memory, "problem")) missing.push("problem");
    if (!isSlotFilled(memory, "method")) missing.push("method");
    if (!isSlotFilled(memory, "outcome")) missing.push("outcome");
  }

  return missing;
}

export function getNextBestMissingSlot(memory: ForgeInterviewMemory): ForgeSlotKey | null {
  const missing = getCriticalMissingSlots(memory);
  const stageSlot: Partial<Record<ForgeMemoryStage, ForgeSlotKey>> = {
    language: "language",
    "book-type": "bookType",
    genre: "genre",
    tone: "tone",
    audience: "audience",
    promise: "promise",
    characters: "protagonist",
    plot: "centralConflict",
    structure: "chapterCount",
    index: "indexOutline",
    title: "title",
  };

  for (const stage of FORGE_STAGE_ORDER) {
    const slot = stageSlot[stage];
    if (slot && missing.includes(slot)) return slot;
  }
  return missing[0] ?? null;
}

export function resolveMemoryStage(memory: ForgeInterviewMemory): ForgeMemoryStage {
  if (!isSlotFilled(memory, "rawIdea")) {
    return memory.usefulAnswerCount > 0 ? "spark" : "welcome";
  }
  if (!isSlotFilled(memory, "language")) return "language";
  if (!isSlotFilled(memory, "bookType") && !isSlotFilled(memory, "genre")) return "book-type";
  if (!isSlotFilled(memory, "genre")) return "genre";
  if (!isSlotFilled(memory, "tone")) return "tone";
  if (!isSlotFilled(memory, "audience")) return "audience";
  if (!isSlotFilled(memory, "promise")) return "promise";

  const mode = detectBookMode(memory);
  if (mode === "fiction") {
    if (!isSlotFilled(memory, "protagonist")) return "characters";
    if (!isSlotFilled(memory, "antagonist")) return "characters";
    if (!isSlotFilled(memory, "centralConflict") || !isSlotFilled(memory, "endingDirection")) {
      return "plot";
    }
    if (!isSlotFilled(memory, "narrativeArc")) return "plot";
  }
  if (mode === "nonfiction") {
    if (!isSlotFilled(memory, "problem") || !isSlotFilled(memory, "method")) return "promise";
    if (!isSlotFilled(memory, "outcome")) return "audience";
  }

  if (!isSlotFilled(memory, "chapterCount") && !isSlotFilled(memory, "pov")) return "structure";
  if (!isSlotFilled(memory, "indexOutline") && detectBookMode(memory) === "fiction") return "index";
  if (!isSlotFilled(memory, "title")) return "title";
  return "dna-lock";
}

function applySlot(
  memory: ForgeInterviewMemory,
  key: ForgeSlotKey,
  value: string | number | boolean | string[] | undefined,
  diff: ForgeMemoryDiff,
): void {
  if (value === undefined || value === null) return;
  const text = typeof value === "string" ? value.trim() : value;
  if (typeof text === "string" && text.length < 2) return;

  const wasFilled = isSlotFilled(memory, key);
  memory.slotValues[key] = text;
  memory.answeredSlots[key] = true;
  memory.needsGuidance[key] = false;

  if (!wasFilled) diff.newlyFilledSlots.push(key);
  else if (!diff.updatedSlots.includes(key)) diff.updatedSlots.push(key);
}

export function updateForgeMemoryFromAnswer(
  state: GuidedInterviewState,
  userAnswer: string,
  activeQuestion?: Pick<InterviewQuestion, "id" | "key">,
): { memory: ForgeInterviewMemory; diff: ForgeMemoryDiff } {
  const memory = getForgeMemory(state);
  const diff: ForgeMemoryDiff = {
    newlyFilledSlots: [],
    updatedSlots: [],
    stillMissingSlots: [],
    contradictionWarnings: [],
  };

  const uncertain = isUncertainUserAnswer(userAnswer);
  const targetSlot = activeQuestion ? questionKeyToSlot(activeQuestion.id) ?? slotFromQuestionKey(activeQuestion.key) : null;

  if (uncertain && targetSlot) {
    memory.needsGuidance[targetSlot] = true;
  } else if (!uncertain) {
    memory.usefulAnswerCount += 1;
  }

  if (activeQuestion?.id) {
    Object.assign(memory, markQuestionAsked(activeQuestion.id, memory));
  }

  const parsedLanguage = parseLanguage(userAnswer);
  const parsedGenre = parseGenre(userAnswer);
  const parsedChapters = parseChapterCount(userAnswer);
  const parsedPov = parsePov(userAnswer);
  const parsedTone = parseTone(userAnswer);

  if (parsedLanguage) applySlot(memory, "language", parsedLanguage, diff);
  if (parsedGenre.genre) applySlot(memory, "genre", parsedGenre.genre, diff);
  if (parsedGenre.bookType) applySlot(memory, "bookType", parsedGenre.bookType, diff);
  if (parsedGenre.subgenre) applySlot(memory, "subgenre", parsedGenre.subgenre, diff);
  if (parsedChapters) applySlot(memory, "chapterCount", String(parsedChapters), diff);
  if (parsedPov) applySlot(memory, "pov", parsedPov, diff);
  if (parsedTone) applySlot(memory, "tone", parsedTone, diff);

  const inference = inferBookProfileFromText(
    [...state.messages.filter((m) => m.role === "user").map((m) => m.content), userAnswer].join("\n"),
    state.extracted ?? {},
  );
  if (inference.genre) applySlot(memory, "genre", inference.genre, diff);
  if (inference.bookType) applySlot(memory, "bookType", inference.bookType, diff);
  if (inference.subgenre) applySlot(memory, "subgenre", inference.subgenre, diff);

  if (!uncertain && activeQuestion?.key) {
    const fieldKey = DEPTH_KEY_TO_CRITICAL[activeQuestion.key] ?? activeQuestion.key;
    if (fieldKey === "genreDNA") {
      applySlot(memory, "method", userAnswer, diff);
      applySlot(memory, "genre", parsedGenre.genre ?? userAnswer, diff);
      if (parsedGenre.bookType) applySlot(memory, "bookType", parsedGenre.bookType, diff);
      if (parsedGenre.subgenre) applySlot(memory, "subgenre", parsedGenre.subgenre, diff);
    } else {
      const mappedSlot = CRITICAL_TO_SLOT[fieldKey] ?? slotFromQuestionKey(activeQuestion.key);
      if (mappedSlot) applySlot(memory, mappedSlot, userAnswer, diff);
    }
  } else if (!uncertain && !targetSlot && userAnswer.length >= 12 && !isSlotFilled(memory, "rawIdea")) {
    applySlot(memory, "rawIdea", userAnswer, diff);
  }

  if (activeQuestion?.key === "openingSpark") {
    applySlot(memory, "rawIdea", userAnswer, diff);
  }

  if (
    memory.slotValues.genre &&
    memory.slotValues.bookType &&
    String(memory.slotValues.genre).includes("self-help") &&
    FICTION_GENRES.test(String(memory.slotValues.rawIdea ?? ""))
  ) {
    diff.contradictionWarnings.push("Direzione fiction vs self-help in tensione.");
  }

  const previousStage = memory.currentStage;
  memory.currentStage = resolveMemoryStage(memory);
  if (previousStage !== memory.currentStage && !memory.completedStages.includes(previousStage)) {
    memory.completedStages.push(previousStage);
  }

  diff.stillMissingSlots = getCriticalMissingSlots(memory);
  return { memory, diff };
}

function slotFromQuestionKey(key: string): ForgeSlotKey | null {
  const map: Record<string, ForgeSlotKey> = {
    openingSpark: "rawIdea",
    readerTransformation: "rawIdea",
    language: "language",
    bookType: "bookType",
    genre: "genre",
    genreDNA: "genre",
    emotionalTone: "tone",
    targetReader: "audience",
    promise: "promise",
    protagonistWound: "protagonist",
    characterWound: "antagonist",
    centralConflict: "centralConflict",
    narrativeDrive: "endingDirection",
    structurePreference: "pov",
    bookTitle: "title",
  };
  return map[key] ?? null;
}

export function syncExtractedFromMemory(
  memory: ForgeInterviewMemory,
  extracted: GuidedInterviewState["extracted"],
): GuidedInterviewState["extracted"] {
  const next = { ...extracted };
  for (const [slot, field] of Object.entries(SLOT_TO_EXTRACTED)) {
    const value = memory.slotValues[slot as ForgeSlotKey];
    if (value === undefined || value === null) continue;
    (next as Record<string, unknown>)[field] = String(value);
  }
  if (memory.slotValues.genre) {
    next.genre = String(memory.slotValues.genre);
  }
  if (memory.slotValues.method) {
    next.genreDNA = String(memory.slotValues.method);
  } else if (memory.slotValues.subgenre) {
    next.genreDNA = String(memory.slotValues.subgenre);
  }
  if (memory.slotValues.bookType) next.bookType = String(memory.slotValues.bookType);
  if (memory.slotValues.language) next.language = String(memory.slotValues.language);
  return next;
}

export function buildForgeMemoryRecap(memory: ForgeInterviewMemory): string | null {
  if (memory.usefulAnswerCount < 2) return null;

  const lines: string[] = [];
  if (isSlotFilled(memory, "language")) lines.push(`lingua: ${memory.slotValues.language}`);
  if (isSlotFilled(memory, "genre") || isSlotFilled(memory, "bookType")) {
    lines.push(`direzione: ${memory.slotValues.subgenre || memory.slotValues.genre || memory.slotValues.bookType}`);
  }
  if (isSlotFilled(memory, "tone")) lines.push(`tono: ${memory.slotValues.tone}`);
  if (isSlotFilled(memory, "audience")) lines.push(`lettore: ${memory.slotValues.audience}`);
  if (isSlotFilled(memory, "promise")) lines.push(`promessa: ${memory.slotValues.promise}`);

  if (lines.length < 2) return null;

  const missing = getCriticalMissingSlots(memory).slice(0, 2);
  const missingText =
    missing.length > 0
      ? ` Mi manca ancora ${missing.map(humanSlotLabel).join(" e ")}.`
      : "";

  return `Fin qui ho capito questo:\n${lines.map((l) => `• ${l}`).join("\n")}.${missingText}`;
}

function humanSlotLabel(slot: ForgeSlotKey): string {
  const labels: Partial<Record<ForgeSlotKey, string>> = {
    language: "la lingua",
    genre: "il genere",
    tone: "il tono",
    audience: "il lettore ideale",
    promise: "la promessa",
    protagonist: "il protagonista",
    centralConflict: "il conflitto",
    endingDirection: "il finale",
    chapterCount: "la struttura",
    title: "il titolo",
    problem: "il problema centrale",
    method: "il metodo",
  };
  return labels[slot] ?? slot;
}

export function shouldShowMemoryRecap(state: GuidedInterviewState, memory: ForgeInterviewMemory): boolean {
  const answers = countForgeUserAnswers(state);
  if (answers < 3) return false;
  if (answers % 3 !== 0) return false;
  if (memory.lastRecapAtAnswer === answers) return false;
  return Boolean(buildForgeMemoryRecap(memory));
}

export function memoryRecapShown(memory: ForgeInterviewMemory, answerCount: number): ForgeInterviewMemory {
  return { ...memory, lastRecapAtAnswer: answerCount };
}

export function getMemoryProgressLabel(memory: ForgeInterviewMemory): string {
  const labels: Partial<Record<ForgeMemoryStage, string>> = {
    welcome: "Idea",
    spark: "Idea",
    language: "Lingua",
    "book-type": "Genere",
    genre: "Genere",
    tone: "Tono",
    audience: "Pubblico",
    promise: "Promessa",
    characters: "Personaggi",
    plot: "Trama",
    structure: "Struttura",
    title: "Titolo",
    "dna-lock": "DNA Lock",
    index: "Indice",
  };
  const idx = FORGE_STAGE_ORDER.indexOf(memory.currentStage);
  const trail = FORGE_STAGE_ORDER.slice(0, Math.max(idx + 1, 2))
    .map((s) => labels[s])
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(" → ");
  return trail || "Idea → Lingua → Genere";
}

function buildQuestionFromDef(def: ForgeQuestionDef, memory: ForgeInterviewMemory): InterviewQuestion {
  const text = typeof def.text === "function" ? def.text(memory) : def.text;
  const quickSuggestions =
    typeof def.quickChoices === "function" ? def.quickChoices(memory) : def.quickChoices;

  return {
    id: def.id,
    key: def.key,
    question: text,
    quickSuggestions,
    placeholder: "Parla liberamente: idea, note, voce, caos… Scriptora organizzerà il resto.",
  };
}

function presetQuestionForSlot(
  slot: ForgeSlotKey,
  memory: ForgeInterviewMemory,
): InterviewQuestion | null {
  switch (slot) {
    case "language":
      return buildQuestionFromDef(
        {
          id: "language-confirmation",
          slotTarget: "language",
          stage: "language",
          intent: "confirm-language",
          key: "language",
          text: "Prima di costruire l'indice: confermiamo la lingua definitiva del libro?",
          quickChoices: LANGUAGE_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "language"),
        },
        memory,
      );
    case "bookType":
      return buildQuestionFromDef(
        {
          id: "book-type-preset",
          slotTarget: "bookType",
          stage: "book-type",
          intent: "confirm-book-type",
          key: "bookType",
          text: "Quale identità editoriale senti più vicina — poi la stringiamo insieme?",
          quickChoices: BOOK_TYPE_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "bookType"),
        },
        memory,
      );
    case "genre":
      return buildQuestionFromDef(
        {
          id: "genre-direction",
          slotTarget: "genre",
          stage: "genre",
          intent: "confirm-genre",
          key: "genreDNA",
          text: "Tra queste direzioni, quale ti convince di più — o quale ti fa più paura?",
          quickChoices: GENRE_DIRECTION_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "genre"),
        },
        memory,
      );
    case "tone":
      return buildQuestionFromDef(
        {
          id: "tone-preset",
          slotTarget: "tone",
          stage: "tone",
          intent: "confirm-tone",
          key: "emotionalTone",
          text: "Il lettore deve uscire ferito, elettrizzato o trasformato — quale effetto deve dominare?",
          quickChoices: TONE_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "tone"),
        },
        memory,
      );
    case "audience":
      return buildQuestionFromDef(
        {
          id: "audience-preset",
          slotTarget: "audience",
          stage: "audience",
          intent: "confirm-audience",
          key: "targetReader",
          text: "Chi deve sentirsi chiamato in causa — come se il libro fosse scritto solo per lui?",
          quickChoices: [
            { label: "Emozione forte", value: "Lettori che cercano emozione forte e vulnerabilità." },
            { label: "Trasformazione", value: "Persone che vogliono cambiare davvero." },
            { label: "Ossessione", value: "Chi cerca tensione, desiderio e confini morali." },
            { label: "Metodo pratico", value: "Chi cerca un metodo concreto e applicabile." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "audience"),
        },
        memory,
      );
    case "promise":
      return buildQuestionFromDef(
        {
          id: "promise-preset",
          slotTarget: "promise",
          stage: "promise",
          intent: "confirm-promise",
          key: "promise",
          text: "Quale promessa non possiamo tradire — nemmeno nel finale?",
          quickChoices: [
            { label: "Ferire bene", value: "Un'esperienza che ferisce ma resta giusta." },
            { label: "Guarire", value: "Un percorso di guarigione concreto." },
            { label: "Inquietare", value: "Una paura o tensione che resta addosso." },
            { label: "Trasformare", value: "Una trasformazione reale per il lettore." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "promise"),
        },
        memory,
      );
    case "protagonist":
      return buildQuestionFromDef(
        {
          id: "characters-protagonist",
          slotTarget: "protagonist",
          stage: "characters",
          intent: "confirm-protagonist",
          key: "protagonistWound",
          text: "Il protagonista combatte fino alla fine — o cede e cambia tutto con una scelta irreversibile?",
          quickChoices: [
            { label: "Combatte", value: "Combatte fino alla fine, anche se costa tutto." },
            { label: "Cede e cambia", value: "Cede a una scelta che non può più rimangiare." },
            { label: "Si spezza", value: "Si spezza prima di riuscire a salvarsi." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "protagonist"),
        },
        memory,
      );
    case "antagonist":
      return buildQuestionFromDef(
        {
          id: "characters-antagonist",
          slotTarget: "antagonist",
          stage: "characters",
          intent: "confirm-antagonist",
          key: "characterWound",
          text: "La forza contraria si innamora, si ossessiona o distrugge — cosa fa davvero?",
          quickChoices: [
            { label: "Si ossessiona", value: "Si ossessiona — magnetico e pericoloso." },
            { label: "Distrugge", value: "Distrugge ciò che tocca, senza redenzione facile." },
            { label: "Seduce e tradisce", value: "Seduce prima, tradisce dopo." },
            { label: "Crede di avere ragione", value: "Crede di avere ragione fino alla fine." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "antagonist"),
        },
        memory,
      );
    case "centralConflict":
      return buildQuestionFromDef(
        {
          id: "plot-conflict",
          slotTarget: "centralConflict",
          stage: "plot",
          intent: "confirm-conflict",
          key: "centralConflict",
          text: "Il conflitto centrale esplode subito — o cresce fino a diventare insopportabile?",
          quickChoices: UNCERTAINTY_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "centralConflict"),
        },
        memory,
      );
    case "endingDirection":
      return buildQuestionFromDef(
        {
          id: "plot-ending",
          slotTarget: "endingDirection",
          stage: "plot",
          intent: "confirm-ending",
          key: "narrativeDrive",
          text: "Il finale deve spezzare il cuore, liberare — o lasciare il lettore sconvolto?",
          quickChoices: [
            { label: "Spezza il cuore", value: "Finale devastante ma giusto." },
            { label: "Libera", value: "Finale liberatorio, anche se costa." },
            { label: "Sconvolge", value: "Finale che lascia una crepa aperta." },
            { label: "Redenzione", value: "Redenzione meritata, non regalata." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "endingDirection"),
        },
        memory,
      );
    case "narrativeArc":
      return buildQuestionFromDef(
        {
          id: "plot-arc",
          slotTarget: "narrativeArc",
          stage: "plot",
          intent: "confirm-arc",
          key: "narrativeDrive",
          text: "L'arco narrativo va verso redenzione, tragedia o trasformazione lenta?",
          quickChoices: [
            { label: "Tragedia", value: "Arco tragico — nessuno esce uguale." },
            { label: "Redenzione", value: "Arco di redenzione costata." },
            { label: "Trasformazione lenta", value: "Trasformazione lenta, quasi impercettibile." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "narrativeArc"),
        },
        memory,
      );
    case "chapterCount":
      return buildQuestionFromDef(
        {
          id: "structure-preset",
          slotTarget: "chapterCount",
          stage: "structure",
          intent: "confirm-structure",
          key: "structurePreference",
          text: "Quanti capitoli e che POV senti più giusti per questa storia?",
          quickChoices: [...LENGTH_PRESETS.slice(0, 3), ...STRUCTURE_PRESETS.slice(0, 3)],
          shouldAsk: (m) => !isSlotFilled(m, "chapterCount") && !isSlotFilled(m, "pov"),
        },
        memory,
      );
    case "indexOutline":
      return buildQuestionFromDef(
        {
          id: "architect-index",
          slotTarget: "indexOutline",
          stage: "index",
          intent: "confirm-index",
          key: "structurePreference",
          text: "Per l'indice: preferisci escalation continua, atti netti o capitoli che chiudono mini-arci?",
          quickChoices: [
            { label: "Escalation continua", value: "Indice a escalation continua, capitolo dopo capitolo." },
            { label: "Atti netti", value: "Tre atti netti con midpoint devastante." },
            { label: "Mini-arci", value: "Capitoli che chiudono mini-arci emotivi." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "indexOutline"),
        },
        memory,
      );
      return buildQuestionFromDef(
        {
          id: "title-preset",
          slotTarget: "title",
          stage: "title",
          intent: "confirm-title",
          key: "bookTitle",
          text: "Hai già un titolo — o usiamo un titolo provvisorio e lo rifiniamo dopo?",
          quickChoices: TITLE_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "title"),
        },
        memory,
      );
    case "method":
      return buildQuestionFromDef(
        {
          id: "method-preset",
          slotTarget: "method",
          stage: "promise",
          intent: "confirm-method",
          key: "genreDNA",
          text: "Quale metodo o percorso concreto porterà il lettore dal punto A al punto B?",
          quickChoices: [
            { label: "Framework step", value: "Framework in step progressivi." },
            { label: "Esercizi pratici", value: "Esercizi pratici settimanali." },
            { label: "Casi studio", value: "Casi studio reali e applicabili." },
          ],
          shouldAsk: (m) => !isSlotFilled(m, "method"),
        },
        memory,
      );
    case "problem":
      return buildQuestionFromDef(
        {
          id: "problem-preset",
          slotTarget: "problem",
          stage: "promise",
          intent: "confirm-problem",
          key: "centralConflict",
          text: "Quale problema reale del lettore questo libro deve risolvere meglio di tutti?",
          quickChoices: UNCERTAINTY_PRESETS,
          shouldAsk: (m) => !isSlotFilled(m, "problem"),
        },
        memory,
      );
    default:
      return null;
  }
}

export const FORGE_QUESTION_BANK: ForgeQuestionDef[] = [
  {
    id: "spark-idea",
    slotTarget: "rawIdea",
    stage: "spark",
    intent: "capture-idea",
    key: "openingSpark",
    text: "Quale scena vedi già davanti a te — quella da cui tutto parte?",
    quickChoices: [
      { label: "Un'immagine forte", value: "Parto da un'immagine forte che non riesco a togliermi dalla testa." },
      { label: "Un personaggio", value: "Parto da un personaggio che non può restare uguale." },
      { label: "Una scena", value: "Parto da una scena precisa che vedo già." },
    ],
    shouldAsk: (m) => !isSlotFilled(m, "rawIdea") && m.usefulAnswerCount <= 1,
  },
];

export function selectNextMemoryQuestion(state: GuidedInterviewState): InterviewQuestion | null {
  const memory = getForgeMemory(state);
  const lastAnswer = state.messages.filter((m) => m.role === "user").pop()?.content ?? "";

  if (countForgeUserAnswers(state) === 0) return null;

  if (isUncertainUserAnswer(lastAnswer)) {
    const slot = getNextBestMissingSlot(memory);
    if (slot) {
      const presetQ = presetQuestionForSlot(slot, memory);
      if (presetQ) {
        return withRecap(state, memory, {
          ...presetQ,
          question: "Va bene. Ti propongo alcune direzioni concrete — quale vibra di più?",
        });
      }
    }
  }

  if (memory.repeatedQuestionCount > 1) {
    const forcedSlot = getNextBestMissingSlot(memory);
    if (forcedSlot) {
      const forced = presetQuestionForSlot(forcedSlot, memory);
      if (forced) return withRecap(state, memory, forced);
    }
  }

  for (const def of FORGE_QUESTION_BANK) {
    if (!def.shouldAsk(memory)) continue;
    if (isQuestionAlreadyAnswered(def.id, memory)) continue;
    if (isSimilarQuestionRecentlyAsked(def.id, memory)) continue;
    return withRecap(state, memory, buildQuestionFromDef(def, memory));
  }

  for (const slot of getCriticalMissingSlots(memory)) {
    const question = presetQuestionForSlot(slot, memory);
    if (!question) continue;
    if (isQuestionAlreadyAnswered(question.id, memory)) continue;
    if (isSimilarQuestionRecentlyAsked(question.id, memory)) continue;
    return withRecap(state, memory, question);
  }

  const fallbackSlot = getNextBestMissingSlot(memory);
  if (fallbackSlot) {
    const fallback = presetQuestionForSlot(fallbackSlot, memory);
    if (fallback && !isSimilarQuestionRecentlyAsked(fallback.id, memory)) {
      return withRecap(state, memory, fallback);
    }
  }

  return null;
}

function withRecap(
  state: GuidedInterviewState,
  memory: ForgeInterviewMemory,
  question: InterviewQuestion,
): InterviewQuestion {
  if (!shouldShowMemoryRecap(state, memory)) return question;
  const recap = buildForgeMemoryRecap(memory);
  if (!recap) return question;
  return {
    ...question,
    helper: recap,
  };
}

export function getSavedSlotLabels(diff: ForgeMemoryDiff): string[] {
  return diff.newlyFilledSlots.map(humanSlotLabel);
}
