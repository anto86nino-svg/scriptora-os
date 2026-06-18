import type { BookConfig } from "@/types/book";
import type {
  CanonMaster,
  ForgeCharacter,
  NarrativeDecisionRecord,
  StoryFutureState,
  StoryRoomState,
  TitleIntelligence,
} from "./forge-evolution-types";
import type { BookDnaLock } from "./dna-lock";
import type { GuidedInterviewState } from "./types";
import { buildFinalBookReview } from "./final-book-review";
import { getStoryRoom } from "./story-room-engine";
import { sanitizeDnaText } from "./dna-cleaner";
import {
  buildForgeGuidedBriefExtras,
  enrichForgeCharactersForWriter,
  mapForgeCharactersToBookCharacters,
  type ForgeInterviewSeed,
} from "./forge-blueprint-handoff";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

export type ForgeWriterHandoff = {
  characterBibleText: string;
  canonBrief: string;
  storyArchitecture: string;
  antiDriftRules: string[];
  guidedBrief: string;
};

export function buildStoryArchitectureBrief(
  seed: ForgeInterviewSeed | GuidedInterviewState,
): string {
  const state = seed as GuidedInterviewState;
  const room: StoryRoomState =
    (seed as ForgeInterviewSeed).storyRoom ??
    ("messages" in state ? getStoryRoom(state) : { scenes: [], arcBeats: [], ending: {} });
  const review = buildFinalBookReview(state);
  const lines: string[] = ["STORY ARCHITECTURE (FORGE):"];

  if (room.scenes.length > 0) {
    lines.push("Scene chiave:");
    for (const scene of room.scenes) {
      if (!scene.beat && !scene.stakes) continue;
      const line = scene.stakes
        ? `${scene.role}: ${scene.beat || "—"} (posta in gioco: ${scene.stakes})`
        : `${scene.role}: ${scene.beat}`;
      lines.push(`- ${line}`);
    }
  }
  if (room.arcBeats.length > 0) {
    lines.push("Archi narrativi:");
    for (const beat of room.arcBeats) {
      if (beat.change) lines.push(`- ${beat.label}: ${beat.change}`);
    }
  }
  if (room.ending) {
    const ending = room.ending;
    if (ending.tone) lines.push(`Finale — tono: ${ending.tone}`);
    if (ending.protagonistFate) lines.push(`Finale — destino protagonista: ${ending.protagonistFate}`);
    if (ending.readerFeeling) lines.push(`Finale — sensazione lettore: ${ending.readerFeeling}`);
  }
  if (review.ending && review.ending !== "—") lines.push(`Finale editoriale: ${review.ending}`);
  if (review.arcs && review.arcs !== "—") lines.push(`Archi: ${review.arcs}`);

  const decisions = (seed as ForgeInterviewSeed).narrativeDecisions ?? state.narrativeDecisions ?? [];
  for (const decision of decisions) {
    if (clean(decision.answer)) {
      lines.push(`Decisione: ${decision.question} → ${decision.answer}`);
    }
  }

  const future = (seed as ForgeInterviewSeed).storyFuture ?? state.storyFuture;
  if (future?.endingTone) lines.push(`Tono finale: ${future.endingTone}`);

  return lines.length > 1 ? lines.join("\n") : "";
}

export function buildForgeExtendedHandoffLines(seed: ForgeInterviewSeed): string[] {
  const ex = (seed.extracted ?? {}) as Record<string, string | undefined>;
  const lines: string[] = [];

  const subgenre = clean(ex.subgenre || seed.dnaLock?.inferredSubgenre);
  if (subgenre) lines.push(`Sottogenere: ${subgenre}`);

  const atmosphere = [ex.setting, ex.emotionalTone].map(clean).filter(Boolean);
  if (atmosphere.length) lines.push(`Atmosfera: ${atmosphere.join(" — ")}`);

  const stakes = clean(ex.stakes || ex.readerTransformation);
  const conflict = clean(ex.centralConflict);
  if (stakes && stakes !== conflict) lines.push(`Posta in gioco: ${stakes}`);
  if (conflict) lines.push(`Conflitto centrale: ${conflict}`);

  const structure = clean(ex.structurePreference);
  if (structure) lines.push(`Struttura narrativa (Forge): ${structure}`);

  if (seed.dnaLock?.whatBookIs?.length) {
    lines.push(
      `COS'È IL LIBRO:\n${seed.dnaLock.whatBookIs.map((w) => `- ${w}`).join("\n")}`,
    );
  }

  const promises = seed.bookPromises;
  if (promises) {
    const buckets = [
      ...promises.emotional.map((p) => `Emotiva: ${p}`),
      ...promises.relationship.map((p) => `Relazione: ${p}`),
      ...promises.plot.map((p) => `Trama: ${p}`),
      ...promises.character.map((p) => `Personaggio: ${p}`),
      ...promises.scene.map((p) => `Scena: ${p}`),
    ].filter(Boolean);
    if (buckets.length) {
      lines.push(`PROMESSE NARRATIVE (FORGE):\n${buckets.map((p) => `- ${p}`).join("\n")}`);
    }
  }

  const relationshipFacts = seed.canon?.relationships?.facts ?? [];
  if (relationshipFacts.length) {
    lines.push(
      `RELAZIONI CANON:\n${relationshipFacts.map((f) => `- ${f}`).join("\n")}`,
    );
  }

  return lines;
}

export function buildForgeWriterHandoff(seed: ForgeInterviewSeed): ForgeWriterHandoff {
  const enrichedSeed: ForgeInterviewSeed = {
    ...seed,
    characters: enrichForgeCharactersForWriter(seed.characters),
  };
  const extras = buildForgeGuidedBriefExtras(enrichedSeed);
  const storyArchitecture = buildStoryArchitectureBrief(enrichedSeed);
  const extendedLines = buildForgeExtendedHandoffLines(enrichedSeed);
  const antiDriftRules = [
    ...(seed.dnaLock?.antiDriftRules ?? []),
    ...(seed.dnaLock?.forbiddenPatterns ?? []),
    ...(seed.dnaLock?.whatBookIsNot ?? []),
  ].filter(Boolean);

  const canonBrief = [extras.canonBrief, extendedLines.join("\n")].filter(Boolean).join("\n\n");

  const guidedBrief = [
    extras.characterBibleText && `FORGE CHARACTER & CANON LOCK:\n${extras.characterBibleText}`,
    canonBrief,
    storyArchitecture,
    antiDriftRules.length > 0 &&
      `ANTI-DRIFT RULES:\n${antiDriftRules.map((r) => `- ${r}`).join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    characterBibleText: extras.characterBibleText,
    canonBrief,
    storyArchitecture,
    antiDriftRules,
    guidedBrief,
  };
}

export function enrichBookConfigFromForgeSeed(
  config: BookConfig,
  seed: ForgeInterviewSeed,
): BookConfig {
  const handoff = buildForgeWriterHandoff(seed);
  const forgedCharacters = mapForgeCharactersToBookCharacters(
    enrichForgeCharactersForWriter(seed.characters),
  );
  const editorialSynopsis = clean(seed.extracted?.editorialSynopsis);
  const ideaFromSynopsis =
    editorialSynopsis && editorialSynopsis.length >= 80 ? editorialSynopsis : "";

  return {
    ...config,
    subgenre:
      clean(seed.extracted?.subgenre || seed.dnaLock?.inferredSubgenre) || config.subgenre,
    characters: forgedCharacters.length > 0 ? forgedCharacters : config.characters,
    characterBibleText: handoff.characterBibleText || config.characterBibleText,
    forgeCanonBrief: handoff.canonBrief || config.forgeCanonBrief,
    forgeStoryArchitecture: handoff.storyArchitecture || config.forgeStoryArchitecture,
    forgeAntiDriftRules: handoff.antiDriftRules.length
      ? handoff.antiDriftRules
      : config.forgeAntiDriftRules,
    idea: ideaFromSynopsis || handoff.guidedBrief || config.idea,
  };
}

export function buildForgeWriterContextBlock(config: BookConfig): string {
  const parts: string[] = [];

  if (config.subgenre?.trim()) {
    parts.push(`SUBGENRE / SOTTOGENERE: ${config.subgenre.trim()}`);
  }
  if (config.subcategory?.trim() && config.subcategory !== config.subgenre) {
    parts.push(`CATEGORIA EDITORIALE: ${config.subcategory.trim()}`);
  }
  if (config.targetReader?.trim()) {
    parts.push(`LETTOR IDEALE: ${config.targetReader.trim()}`);
  }

  if (config.characterBibleText?.trim()) {
    parts.push(config.characterBibleText.trim());
  }
  if (config.forgeCanonBrief?.trim()) {
    parts.push(config.forgeCanonBrief.trim());
  }
  if (config.forgeStoryArchitecture?.trim()) {
    parts.push(config.forgeStoryArchitecture.trim());
  }
  if (config.forgeAntiDriftRules?.length) {
    parts.push(
      `ANTI-DRIFT RULES (FORGE DNA LOCK):\n${config.forgeAntiDriftRules.map((r) => `- ${r}`).join("\n")}`,
    );
  }
  if (config.idea?.trim() && !parts.some((p) => p.includes(config.idea!.trim().slice(0, 24)))) {
    parts.push(`FORGE BOOK BRIEF:\n${config.idea.trim()}`);
  }

  if (!parts.length) return "";

  return `
FORGE → WRITER HANDOFF (CANON LAW):
Everything below was locked during Book Forge. Never contradict it.

${parts.join("\n\n")}

CHARACTER REACTION RULE:
Before writing any scene, ask: "Does each character's reaction match their wound, fear, desire, contradiction, and recurring behavior?"
Never make every character react the same way.
`.trim();
}
