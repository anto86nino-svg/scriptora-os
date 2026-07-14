import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type { ForgeCharacter } from "./forge-evolution-types";
import { detectEditorialBookMode } from "./book-understanding-engine";
import { sanitizeDnaText } from "./dna-cleaner";
import {
  shouldAskHumanAntagonistDetails,
} from "./antagonist-intelligence";

const CHARACTER_FIELDS = ["name", "wound", "fear", "desire", "contradiction", "obsession", "secret", "arc"] as const;
const ANTAGONIST_CORE_FIELDS = ["name", "wound", "desire", "arc"] as const;

function antagonist(state: GuidedInterviewState): ForgeCharacter {
  const existing = state.characters?.find((c) => c.role === "antagonist");
  return existing ?? { id: "antagonist-1", role: "antagonist" };
}

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function isFiction(state: GuidedInterviewState): boolean {
  return detectEditorialBookMode(state) === "fiction";
}

function protagonist(state: GuidedInterviewState): ForgeCharacter {
  const existing = state.characters?.find((c) => c.role === "protagonist");
  return existing ?? { id: "protagonist-1", role: "protagonist" };
}

function isCharacterFieldComplete(character: ForgeCharacter, field: (typeof CHARACTER_FIELDS)[number]): boolean {
  const value = character[field];
  return clean(value).length >= (field === "name" ? 2 : 6);
}

export function isCharacterComplete(character: ForgeCharacter): boolean {
  return CHARACTER_FIELDS.every((field) => isCharacterFieldComplete(character, field));
}

export function getCharactersCompletionReport(state: GuidedInterviewState): {
  required: boolean;
  complete: boolean;
  missing: string[];
} {
  if (!isFiction(state)) {
    return { required: false, complete: true, missing: [] };
  }

  const lead = protagonist(state);
  const missing = CHARACTER_FIELDS.filter((field) => !isCharacterFieldComplete(lead, field));
  return {
    required: true,
    complete: missing.length === 0,
    missing: missing.map((f) => `protagonist.${f}`),
  };
}

function q(id: string, key: string, question: string, helper?: string): InterviewQuestion {
  return {
    id,
    key,
    question,
    helper,
    placeholder: "Raccontamelo come parleresti a un editor…",
  };
}

const FIELD_QUESTIONS: Record<(typeof CHARACTER_FIELDS)[number], (name?: string) => InterviewQuestion> = {
  name: () =>
    q(
      "char-name",
      "characterName",
      "Chi è il personaggio che porta tutto il peso della storia? Dammi il nome — o come lo senti dentro.",
      "Non serve essere definitivo. Serve che esista davvero.",
    ),
  wound: (name) =>
    q(
      "char-wound",
      "characterWound",
      name
        ? `Qual è la ferita che ${name} porta addosso prima ancora che la storia inizi?`
        : "Qual è la ferita che il protagonista porta addosso prima ancora che la storia inizi?",
      "Non il plot. La crepa interiore.",
    ),
  fear: (name) =>
    q(
      "char-fear",
      "characterFear",
      name
        ? `Cosa teme ${name} più di ogni altra cosa — anche se non lo ammette?`
        : "Cosa teme il protagonista più di ogni altra cosa?",
    ),
  desire: (name) =>
    q(
      "char-desire",
      "characterDesire",
      name
        ? `Cosa vuole ${name} con un'intensità che lo rende pericoloso o vulnerabile?`
        : "Cosa vuole il protagonista con un'intensità che lo rende pericoloso o vulnerabile?",
    ),
  contradiction: (name) =>
    q(
      "char-contradiction",
      "characterContradiction",
      name
        ? `Dove ${name} si contraddice? Dove dice una cosa e fa l'opposto?`
        : "Dove il protagonista si contraddice?",
    ),
  obsession: (name) =>
    q(
      "char-obsession",
      "characterObsession",
      name
        ? `A cosa è ossessionato ${name} — anche quando dovrebbe lasciar perdere?`
        : "A cosa è ossessionato il protagonista?",
    ),
  secret: (name) =>
    q(
      "char-secret",
      "characterSecret",
      name
        ? `Quale segreto ${name} non può permettere che emerga?`
        : "Quale segreto il protagonista non può permettere che emerga?",
    ),
  arc: (name) =>
    q(
      "char-arc",
      "characterArc",
      name
        ? `Come deve cambiare ${name} — o cosa deve perdere — perché questa storia abbia senso?`
        : "Come deve cambiare il protagonista perché questa storia abbia senso?",
    ),
};

const ANTAGONIST_FIELD_QUESTIONS: Record<
  (typeof ANTAGONIST_CORE_FIELDS)[number],
  (name?: string, protagonistName?: string) => InterviewQuestion
> = {
  name: (_name, protagonistName) =>
    q(
      "char-antagonist-name",
      "antagonistName",
      protagonistName
        ? `Chi è la forza contraria a ${protagonistName} — il nome o la figura che senti più pericolosa?`
        : "Chi è la forza contraria che rende la storia pericolosa?",
      "Non serve il cliché. Serve una minaccia credibile.",
    ),
  wound: (name) =>
    q(
      "char-antagonist-wound",
      "antagonistWound",
      name
        ? `Quale ferita rende ${name} pericoloso/a — o magnetico/a — per il protagonista?`
        : "Quale ferita rende l'antagonista pericoloso per il protagonista?",
      "La crepa che spiega perché non può semplicemente andarsene.",
    ),
  desire: (name) =>
    q(
      "char-antagonist-desire",
      "antagonistDesire",
      name
        ? `Cosa vuole ${name} con un'intensità che minaccia davvero la storia?`
        : "Cosa vuole l'antagonista con un'intensità che minaccia la storia?",
    ),
  arc: (name, protagonistName) =>
    q(
      "char-antagonist-arc",
      "antagonistArc",
      name && protagonistName
        ? `Come ${name} cambia — o come spezza — l'arco di ${protagonistName}?`
        : "Come l'antagonista cambia o spezza l'arco del protagonista?",
      "La traiettoria della minaccia, non solo la presenza.",
    ),
};

export function isAntagonistCoreComplete(state: GuidedInterviewState): boolean {
  if (!isFiction(state)) return true;
  const lead = antagonist(state);
  return ANTAGONIST_CORE_FIELDS.every((field) => isCharacterFieldComplete(lead, field));
}

export function getAntagonistForgeQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  if (!isFiction(state) || isAntagonistCoreComplete(state)) return [];
  if (!shouldAskHumanAntagonistDetails(state)) return [];

  const lead = protagonist(state);
  const report = getCharactersCompletionReport(state);
  if (report.required && !report.complete) return [];

  const villain = antagonist(state);
  for (const field of ANTAGONIST_CORE_FIELDS) {
    if (!isCharacterFieldComplete(villain, field)) {
      return [ANTAGONIST_FIELD_QUESTIONS[field](villain.name, lead.name)];
    }
  }
  return [];
}

export function getCharacterForgeQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const report = getCharactersCompletionReport(state);
  if (!report.required || report.complete) return [];

  const lead = protagonist(state);
  const questions: InterviewQuestion[] = [];
  for (const field of CHARACTER_FIELDS) {
    if (!isCharacterFieldComplete(lead, field)) {
      questions.push(FIELD_QUESTIONS[field](lead.name));
      break;
    }
  }
  return questions;
}

export function applyCharacterAnswer(
  state: GuidedInterviewState,
  key: string,
  answer: string,
): ForgeCharacter[] {
  type ForgeCharacterTextField = Exclude<keyof ForgeCharacter, "id" | "role">;
  const fieldMap: Partial<Record<string, ForgeCharacterTextField>> = {
    characterName: "name",
    characterWound: "wound",
    characterFear: "fear",
    characterDesire: "desire",
    characterContradiction: "contradiction",
    characterObsession: "obsession",
    characterSecret: "secret",
    characterArc: "arc",
    antagonistName: "name",
    antagonistWound: "wound",
    antagonistDesire: "desire",
    antagonistArc: "arc",
  };

  const roleByKey: Record<string, ForgeCharacter["role"]> = {
    characterName: "protagonist",
    characterWound: "protagonist",
    characterFear: "protagonist",
    characterDesire: "protagonist",
    characterContradiction: "protagonist",
    characterObsession: "protagonist",
    characterSecret: "protagonist",
    characterArc: "protagonist",
    antagonistName: "antagonist",
    antagonistWound: "antagonist",
    antagonistDesire: "antagonist",
    antagonistArc: "antagonist",
  };

  const field = fieldMap[key];
  if (!field) return state.characters ?? [];

  const chars = [...(state.characters ?? [])];
  const role = roleByKey[key] ?? "protagonist";
  let lead = chars.find((c) => c.role === role);
  if (!lead) {
    lead = {
      id: role === "antagonist" ? "antagonist-1" : "protagonist-1",
      role,
    };
    chars.push(lead);
  }
  lead[field] = clean(answer);
  return chars;
}
