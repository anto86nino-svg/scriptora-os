import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type {
  ForgeScene,
  ForgeSceneRole,
  NarrativeArcBeat,
  StoryEndingVision,
  StoryRoomSection,
  StoryRoomSnapshot,
  StoryRoomState,
} from "./forge-evolution-types";
import { detectEditorialBookMode } from "./book-understanding-engine";
import { countForgeUserAnswers } from "./opening-experience";
import {
  getAntagonistForgeQuestions,
  getCharactersCompletionReport,
  isAntagonistCoreComplete,
} from "./character-forge-engine";
import {
  getAntagonistClassificationQuestion,
  getNonHumanAntagonistQuestion,
} from "./antagonist-intelligence";
import { canEnterFinalDecisionMode } from "./forge-orchestrator";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

const SCENE_ROLES: ForgeSceneRole[] = ["opening", "crisis", "climax", "closing"];

const SCENE_META: Record<
  ForgeSceneRole,
  { label: string; question: string; helper: string }
> = {
  opening: {
    label: "Scena di apertura",
    question: "Quale scena vedi già davanti a te — quella che apre tutto e mette il lettore dentro la storia?",
    helper: "Suggerimento modificabile — non è un obbligo strutturale.",
  },
  crisis: {
    label: "Scena di rottura",
    question: "Quale scena rompe l'equilibrio e costa qualcosa di irreversibile?",
    helper: "Puoi cambiarla, eliminarla o sostituirla in qualsiasi momento.",
  },
  climax: {
    label: "Scena di esplosione",
    question: "Dove tutto esplode — la scena che il lettore non dovrebbe dimenticare?",
    helper: "Solo una direzione possibile, non una gabbia.",
  },
  closing: {
    label: "Scena di chiusura",
    question: "Qual è l'ultima immagine che vuoi lasciare al lettore?",
    helper: "Suggerimento editoriale — la Story Room non ti vincola.",
  },
};

const ARC_BEATS: Array<{
  id: string;
  act: NarrativeArcBeat["act"];
  label: string;
  question: string;
  helper: string;
}> = [
  {
    id: "arc-setup",
    act: "setup",
    label: "Illusione iniziale",
    question: "Cosa crede il protagonista all'inizio che la storia dovrà demolire?",
    helper: "La convinzione che lo tiene fermo prima del primo crack.",
  },
  {
    id: "arc-pressure",
    act: "pressure",
    label: "Pressione crescente",
    question: "Cosa stringe sempre di più il protagonista fino a renderlo incastrato?",
    helper: "La forza che non gli lascia spazio di fuga emotiva.",
  },
  {
    id: "arc-break",
    act: "break",
    label: "Punto di non ritorno",
    question: "Cosa succede a metà strada che rende il ritorno impossibile?",
    helper: "La scelta, la rivelazione o la perdita che cambia tutto.",
  },
  {
    id: "arc-fallout",
    act: "fallout",
    label: "Prezzo da pagare",
    question: "Cosa deve pagare il protagonista per arrivare al finale?",
    helper: "Non il plot twist. Il costo morale o emotivo.",
  },
  {
    id: "arc-finale",
    act: "finale",
    label: "Trasformazione finale",
    question: "Chi è il protagonista all'ultima pagina — o cosa ha perso per sempre?",
    helper: "La versione di sé che esce dalla storia.",
  },
];

const ENDING_FIELDS: Array<{
  key: keyof StoryEndingVision;
  question: string;
  helper: string;
}> = [
  {
    key: "tone",
    question: "Il finale deve liberare, devastare o lasciare una crepa aperta?",
    helper: "Scegli la temperatura emotiva del finale.",
  },
  {
    key: "protagonistFate",
    question: "Il protagonista sopravvive — ma a quale prezzo?",
    helper: "Vittoria, perdita, redenzione o crepa che non si chiude.",
  },
  {
    key: "readerFeeling",
    question: "Il lettore deve chiudere il libro con speranza, dolore o inquietudine?",
    helper: "La sensazione che porti via, non il plot.",
  },
  {
    key: "irreversibleChoice",
    question: "Quale scelta irreversibile rende il finale moralmente costoso?",
    helper: "La decisione che nessuno può annullare.",
  },
];

export function createEmptyStoryRoom(): StoryRoomState {
  return { scenes: [], arcBeats: [], ending: {} };
}

export function getStoryRoom(state: GuidedInterviewState): StoryRoomState {
  return hydrateStoryRoomFromState(state, state.storyRoom ?? createEmptyStoryRoom());
}

function hydrateStoryRoomFromState(
  state: GuidedInterviewState,
  room: StoryRoomState,
): StoryRoomState {
  let next = { ...room, scenes: [...room.scenes], arcBeats: [...room.arcBeats], ending: { ...(room.ending ?? {}) } };
  const ex = state.extracted ?? {};

  if (!isSceneFilled(sceneByRole(next, "opening")) && clean(ex.setting)) {
    next = upsertScene(next, "opening", `Apertura: ${clean(ex.setting)}`);
  }
  if (!isSceneFilled(sceneByRole(next, "climax")) && clean(ex.narrativeDrive)) {
    next = upsertScene(next, "climax", clean(ex.narrativeDrive));
  }
  if (!isSceneFilled(sceneByRole(next, "closing")) && clean(ex.readerTransformation)) {
    next = upsertScene(next, "closing", clean(ex.readerTransformation));
  }

  for (const decision of state.narrativeDecisions ?? []) {
    if (!clean(decision.answer)) continue;
    const template = ARC_BEATS.find((b) => decision.id.includes(b.id.replace("arc-", "")) || decision.question.toLowerCase().includes(b.label.toLowerCase()));
    if (template && !isArcBeatFilled(next.arcBeats.find((b) => b.id === template.id))) {
      next = upsertArcBeat(next, template.id, decision.answer ?? "");
    }
  }

  const future = state.storyFuture ?? {};
  if (!isEndingFieldFilled(next.ending, "tone") && clean(future.endingTone)) {
    next = upsertEndingField(next, "tone", String(future.endingTone));
  }
  if (!isEndingFieldFilled(next.ending, "readerFeeling") && clean(future.lastPageFeeling)) {
    next = upsertEndingField(next, "readerFeeling", String(future.lastPageFeeling));
  }
  if (!isEndingFieldFilled(next.ending, "protagonistFate") && clean(future.finalStatus)) {
    next = upsertEndingField(next, "protagonistFate", String(future.finalStatus));
  }
  if (!isEndingFieldFilled(next.ending, "irreversibleChoice") && clean(ex.endingDirection)) {
    next = upsertEndingField(next, "irreversibleChoice", clean(ex.endingDirection));
  }

  return next;
}

function isFiction(state: GuidedInterviewState): boolean {
  return detectEditorialBookMode(state) === "fiction";
}

export function shouldShowStoryRoom(state: GuidedInterviewState): boolean {
  return isFiction(state) && countForgeUserAnswers(state) >= 2;
}

function sceneByRole(room: StoryRoomState, role: ForgeSceneRole): ForgeScene | undefined {
  return room.scenes.find((s) => s.role === role);
}

function isSceneFilled(scene?: ForgeScene): boolean {
  return clean(scene?.beat).length >= 12;
}

function isArcBeatFilled(beat?: NarrativeArcBeat): boolean {
  return clean(beat?.change).length >= 8;
}

function isEndingFieldFilled(ending: StoryEndingVision | undefined, key: keyof StoryEndingVision): boolean {
  return clean(ending?.[key]).length >= 6;
}

function summarizeCharacters(state: GuidedInterviewState): { complete: boolean; summary: string; missing: string[] } {
  const report = getCharactersCompletionReport(state);
  const lead = state.characters?.find((c) => c.role === "protagonist");
  const antagonist = state.characters?.find((c) => c.role === "antagonist");
  const parts: string[] = [];
  if (lead?.name) parts.push(lead.name);
  if (antagonist?.name) parts.push(`vs ${antagonist.name}`);
  const missing: string[] = [];
  if (!report.complete) missing.push("protagonista");
  if (!isAntagonistCoreComplete(state)) missing.push("antagonista");
  return {
    complete: report.complete && isAntagonistCoreComplete(state),
    summary: parts.length > 0 ? parts.join(" ") : "Personaggi in costruzione",
    missing,
  };
}

function summarizeScenes(room: StoryRoomState): { complete: boolean; summary: string; missing: string[] } {
  const filled = SCENE_ROLES.filter((role) => isSceneFilled(sceneByRole(room, role)));
  const summary =
    filled.length > 0
      ? `${filled.length} scena/e immaginata/e — tutte modificabili`
      : "Scene suggerite, mai obbligatorie";
  return {
    complete: filled.length >= 1,
    summary,
    missing: [],
  };
}

function summarizeArcs(room: StoryRoomState): { complete: boolean; summary: string; missing: string[] } {
  const filled = room.arcBeats.filter((b) => isArcBeatFilled(b));
  const missing = ARC_BEATS.filter(
    (template) => !room.arcBeats.some((b) => b.id === template.id && isArcBeatFilled(b)),
  ).map((t) => t.label);
  return {
    complete: filled.length >= 2,
    summary: filled.length > 0 ? `${filled.length} nodi d'arco` : "Arco narrativo da definire",
    missing,
  };
}

function summarizeEnding(room: StoryRoomState): { complete: boolean; summary: string; missing: string[] } {
  const ending = room.ending ?? {};
  const filled = ENDING_FIELDS.filter((f) => isEndingFieldFilled(ending, f.key));
  const missing = ENDING_FIELDS.filter((f) => !isEndingFieldFilled(ending, f.key)).map((f) => f.key);
  const summary = clean(ending.tone) || clean(ending.readerFeeling) || "Finale da decidere";
  return {
    complete: filled.length >= 2,
    summary,
    missing,
  };
}

export function buildStoryRoomSnapshot(state: GuidedInterviewState): StoryRoomSnapshot {
  const fiction = isFiction(state);
  const visible = shouldShowStoryRoom(state);
  const room = getStoryRoom(state);
  const characters = summarizeCharacters(state);
  const scenes = summarizeScenes(room);
  const arcs = summarizeArcs(room);
  const ending = summarizeEnding(room);

  const sections = [
    {
      id: "characters" as const,
      label: "Personaggi",
      emoji: "🎭",
      ...characters,
    },
    {
      id: "scenes" as const,
      label: "Scene",
      emoji: "🎬",
      ...scenes,
    },
    {
      id: "arcs" as const,
      label: "Archi",
      emoji: "📈",
      ...arcs,
    },
    {
      id: "ending" as const,
      label: "Finale",
      emoji: "🌙",
      ...ending,
    },
  ];

  const weights = [0.35, 0.25, 0.2, 0.2];
  const completionPct = Math.round(
    sections.reduce((sum, section, index) => sum + (section.complete ? weights[index] : 0), 0) * 100,
  );

  const activeSection =
    sections.find((section) => !section.complete)?.id ?? null;

  const highlight = activeSection
    ? {
        characters: "Stiamo dando corpo a chi porta il peso della storia.",
        scenes: "Stiamo fissando le scene che il lettore deve vedere.",
        arcs: "Stiamo tracciando come la storia cambia davvero.",
        ending: "Stiamo decidendo come il libro deve restare addosso.",
      }[activeSection]
    : "La Story Room è quasi completa — il libro ha già una spina dorsale narrativa.";

  return {
    visible,
    fiction,
    sections,
    completionPct,
    activeSection,
    highlight,
  };
}

export function isStoryRoomComplete(state: GuidedInterviewState): boolean {
  if (!isFiction(state)) return true;

  const room = getStoryRoom(state);
  const protagonistDone = getCharactersCompletionReport(state).complete;
  const sceneCount = room.scenes.filter((scene) => isSceneFilled(scene)).length;
  const arcCount = room.arcBeats.filter((beat) => isArcBeatFilled(beat)).length;
  const endingFilled = ENDING_FIELDS.filter((field) =>
    isEndingFieldFilled(room.ending, field.key),
  ).length;

  if (protagonistDone && sceneCount >= 2 && (arcCount >= 2 || endingFilled >= 2)) {
    return true;
  }

  const snapshot = buildStoryRoomSnapshot(state);
  const charOk = snapshot.sections.find((s) => s.id === "characters")?.complete ?? false;
  const scenesOk = snapshot.sections.find((s) => s.id === "scenes")?.complete ?? false;
  const arcsOk = snapshot.sections.find((s) => s.id === "arcs")?.complete ?? false;
  const endingOk = snapshot.sections.find((s) => s.id === "ending")?.complete ?? false;

  return charOk && scenesOk && (arcsOk || endingOk);
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

function getNextSceneQuestion(state: GuidedInterviewState): InterviewQuestion | null {
  const room = getStoryRoom(state);
  for (const role of SCENE_ROLES) {
    const scene = sceneByRole(room, role);
    if (!isSceneFilled(scene)) {
      const meta = SCENE_META[role];
      return q(`story-scene-${role}`, `scene${role[0].toUpperCase()}${role.slice(1)}`, meta.question, meta.helper);
    }
  }
  return null;
}

function getNextArcQuestion(state: GuidedInterviewState): InterviewQuestion | null {
  const room = getStoryRoom(state);
  for (const template of ARC_BEATS) {
    const existing = room.arcBeats.find((b) => b.id === template.id);
    if (!isArcBeatFilled(existing)) {
      return q(`story-arc-${template.id}`, template.id, template.question, template.helper);
    }
  }
  return null;
}

function getNextEndingQuestion(state: GuidedInterviewState): InterviewQuestion | null {
  if (!canEnterFinalDecisionMode(state)) return null;
  const ending = getStoryRoom(state).ending ?? {};
  for (const field of ENDING_FIELDS) {
    if (!isEndingFieldFilled(ending, field.key)) {
      return q(`story-ending-${field.key}`, `ending${field.key[0].toUpperCase()}${field.key.slice(1)}`, field.question, field.helper);
    }
  }
  return null;
}

export function getStoryRoomQuestionsForPhase(
  state: GuidedInterviewState,
  phase: "characters" | "decisions",
): InterviewQuestion[] {
  if (!isFiction(state)) return [];

  if (phase === "characters") {
    const classify = getAntagonistClassificationQuestion(state);
    if (classify) return [classify];
    const nonHuman = getNonHumanAntagonistQuestion(state);
    if (nonHuman) return [nonHuman];
    const antagonist = getAntagonistForgeQuestions(state);
    if (antagonist.length > 0) return antagonist;
    const scene = getNextSceneQuestion(state);
    return scene ? [scene] : [];
  }

  if (!canEnterFinalDecisionMode(state)) {
    const arc = getNextArcQuestion(state);
    return arc ? [arc] : [];
  }

  const decisions: InterviewQuestion[] = [];
  const arc = getNextArcQuestion(state);
  if (arc) decisions.push(arc);
  const ending = getNextEndingQuestion(state);
  if (ending) decisions.push(ending);
  return decisions.slice(0, 1);
}

export function getStoryRoomQuestions(state: GuidedInterviewState): InterviewQuestion[] {
  const charReport = getCharactersCompletionReport(state);
  if (charReport.required && !charReport.complete) return [];
  const antagonist = getAntagonistForgeQuestions(state);
  if (antagonist.length > 0) return antagonist;

  const scene = getNextSceneQuestion(state);
  if (scene) return [scene];

  const arc = getNextArcQuestion(state);
  if (arc) return [arc];

  const ending = getNextEndingQuestion(state);
  if (ending) return [ending];

  return [];
}

function upsertScene(room: StoryRoomState, role: ForgeSceneRole, beat: string): StoryRoomState {
  const scenes = [...room.scenes];
  const index = scenes.findIndex((s) => s.role === role);
  const nextScene: ForgeScene = {
    id: `scene-${role}`,
    role,
    beat: clean(beat),
    title: clean(beat).slice(0, 48),
  };
  if (index >= 0) scenes[index] = { ...scenes[index], ...nextScene };
  else scenes.push(nextScene);
  return { ...room, scenes };
}

function upsertArcBeat(room: StoryRoomState, templateId: string, change: string): StoryRoomState {
  const template = ARC_BEATS.find((b) => b.id === templateId);
  if (!template) return room;
  const arcBeats = [...room.arcBeats];
  const index = arcBeats.findIndex((b) => b.id === templateId);
  const nextBeat: NarrativeArcBeat = {
    id: templateId,
    act: template.act,
    label: template.label,
    change: clean(change),
  };
  if (index >= 0) arcBeats[index] = { ...arcBeats[index], ...nextBeat };
  else arcBeats.push(nextBeat);
  return { ...room, arcBeats };
}

function upsertEndingField(
  room: StoryRoomState,
  key: keyof StoryEndingVision,
  value: string,
): StoryRoomState {
  return {
    ...room,
    ending: {
      ...(room.ending ?? {}),
      [key]: clean(value),
    },
  };
}

export function applyStoryRoomAnswer(
  state: GuidedInterviewState,
  question: Pick<InterviewQuestion, "id" | "key">,
  answer: string,
): StoryRoomState {
  let room = getStoryRoom(state);
  const text = clean(answer);
  if (!text) return room;

  if (question.id.startsWith("story-scene-")) {
    const role = question.id.replace("story-scene-", "") as ForgeSceneRole;
    if (SCENE_ROLES.includes(role)) room = upsertScene(room, role, text);
  }

  if (question.id.startsWith("story-arc-")) {
    const beatId = question.id.replace("story-arc-", "");
    room = upsertArcBeat(room, beatId, text);
  }

  if (question.id.startsWith("story-ending-")) {
    const field = question.id.replace("story-ending-", "") as keyof StoryEndingVision;
    if (ENDING_FIELDS.some((f) => f.key === field)) {
      room = upsertEndingField(room, field, text);
    }
  }

  const sceneKeyMap: Record<string, ForgeSceneRole> = {
    sceneOpening: "opening",
    sceneCrisis: "crisis",
    sceneClimax: "climax",
    sceneClosing: "closing",
  };
  const sceneRole = sceneKeyMap[question.key];
  if (sceneRole) room = upsertScene(room, sceneRole, text);

  if (question.key.startsWith("arc")) {
    room = upsertArcBeat(room, question.key, text);
  }

  if (question.key.startsWith("ending")) {
    const field = question.key.replace(/^ending/, "");
    const normalized = `${field[0]?.toLowerCase() ?? ""}${field.slice(1)}` as keyof StoryEndingVision;
    if (ENDING_FIELDS.some((f) => f.key === normalized)) {
      room = upsertEndingField(room, normalized, text);
    }
  }

  return room;
}

export function syncStoryFutureFromRoom(room: StoryRoomState): Partial<import("./forge-evolution-types").StoryFutureState> {
  const ending = room.ending ?? {};
  const next: Partial<import("./forge-evolution-types").StoryFutureState> = {};
  const tone = clean(ending.tone).toLowerCase();
  const reader = clean(ending.readerFeeling).toLowerCase();
  const fate = clean(ending.protagonistFate).toLowerCase();

  if (/liber|speranza|redenz/.test(tone) || /speranza|hope/.test(reader)) next.endingTone = "hopeful";
  if (/devast|dolore|traged|crepa/.test(tone) || /dolore|inquiet/.test(reader)) next.endingTone = "unsettling";
  if (/sopravvive|vince|alive/.test(fate)) next.finalStatus = "alive";
  if (/muore|perde|caduta|lost/.test(fate)) next.finalStatus = "lost";
  if (/inquiet|dread/.test(reader)) next.hopeOrDread = "dread";
  if (/speranza|hope/.test(reader)) next.hopeOrDread = "hope";
  if (ending.readerFeeling) next.lastPageFeeling = ending.readerFeeling;
  return next;
}

export function getStoryRoomSectionLabel(section: StoryRoomSection): string {
  const map: Record<StoryRoomSection, string> = {
    characters: "Personaggi",
    scenes: "Scene",
    arcs: "Archi",
    ending: "Finale",
  };
  return map[section];
}
