import type { BookCharacter } from "@/types/book";
import type { BookDnaLock } from "./dna-lock";
import type {
  BookPromises,
  CanonMaster,
  ForgeCharacter,
  NarrativeDecisionRecord,
  StoryFutureState,
  StoryRoomState,
  TitleIntelligence,
} from "./forge-evolution-types";
import type { AntagonistForceType } from "./antagonist-intelligence";
import type { GuidedInterviewState } from "./types";
import { buildFinalBookReview } from "./final-book-review";
import { deriveTitleIntelligence } from "./title-intelligence-engine";
import { sanitizeDnaText } from "./dna-cleaner";
import { isMetadataOnly } from "./blueprint-ready-summary";
import { validateFoundationFieldsFromSeed } from "./book-foundation-lock";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

export type ForgeInterviewSeed = {
  extracted?: Record<string, string | undefined>;
  selectedGenre?: string;
  selectedBookType?: string;
  dnaLock?: BookDnaLock;
  canon?: CanonMaster;
  canonLocked?: boolean;
  characters?: ForgeCharacter[];
  titleIntelligence?: TitleIntelligence;
  narrativeDecisions?: NarrativeDecisionRecord[];
  storyFuture?: StoryFutureState;
  storyRoom?: StoryRoomState;
  antagonistForce?: AntagonistForceType;
  bookPromises?: BookPromises;
  bookFoundationLocked?: boolean;
};

export function seedToInterviewState(seed: ForgeInterviewSeed): GuidedInterviewState {
  return {
    completed: false,
    currentStep: 0,
    confidence: 0,
    messages: [],
    extracted: seed.extracted ?? {},
    selectedGenre: seed.selectedGenre,
    selectedBookType: seed.selectedBookType,
    dnaLock: seed.dnaLock,
    canon: seed.canon,
    canonLocked: seed.canonLocked,
    characters: seed.characters,
    titleIntelligence: seed.titleIntelligence,
    narrativeDecisions: seed.narrativeDecisions,
    storyFuture: seed.storyFuture,
    storyRoom: seed.storyRoom,
    antagonistForce: seed.antagonistForce,
    bookPromises: seed.bookPromises,
    bookFoundationLocked: seed.bookFoundationLocked,
  };
}

export type ForgeBlueprintReadiness = {
  ready: boolean;
  missing: string[];
};

const ROLE_LABELS: Record<ForgeCharacter["role"], string> = {
  protagonist: "Protagonista",
  antagonist: "Antagonista",
  supporting: "Personaggio di supporto",
  love_interest: "Interesse amoroso",
};

function inferDeepPsychology(character: ForgeCharacter): ForgeCharacter {
  return {
    ...character,
    emotionalTriggers:
      character.emotionalTriggers ||
      (character.obsession ? `Si attiva quando: ${character.obsession}` : undefined),
    dominantFlaw:
      character.dominantFlaw ||
      (character.contradiction ? `Difetto dominante: ${character.contradiction}` : undefined),
    blindSpot:
      character.blindSpot ||
      (character.secret ? `Punto cieco: ${character.secret}` : undefined),
    vulnerability: character.vulnerability || character.fear,
    recurringBehavior:
      character.recurringBehavior ||
      (character.obsession ? `Comportamento ricorrente: ${character.obsession}` : undefined),
    personalLanguage: character.personalLanguage,
  };
}

export function enrichForgeCharactersForWriter(
  characters?: ForgeCharacter[],
): ForgeCharacter[] {
  return (characters ?? []).map(inferDeepPsychology);
}

export function buildForgeInterviewSeed(state: GuidedInterviewState): ForgeInterviewSeed {
  const title = deriveTitleIntelligence(state);
  return {
    extracted: state.extracted as Record<string, string | undefined>,
    selectedGenre:
      state.selectedGenre ||
      state.extracted?.genre ||
      state.inferredProfile?.genre,
    selectedBookType: state.selectedBookType || state.extracted?.bookType,
    dnaLock: state.dnaLock,
    canon: state.canon,
    canonLocked: state.canonLocked,
    characters: enrichForgeCharactersForWriter(state.characters),
    titleIntelligence: state.titleIntelligence ?? title,
    narrativeDecisions: state.narrativeDecisions,
    storyFuture: state.storyFuture,
    storyRoom: state.storyRoom,
    antagonistForce: state.antagonistForce,
    bookPromises: state.bookPromises,
    bookFoundationLocked: state.bookFoundationLocked,
  };
}

export function resolveForgeTitle(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seedToInterviewState(seed));
  const ex = seed.extracted ?? {};
  return (
    clean(ti.definitiveTitle) ||
    clean(ex.bookTitle) ||
    ""
  );
}

export function resolveForgeSubtitle(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seedToInterviewState(seed));
  const ex = seed.extracted ?? {};
  return clean(ti.subtitle) || clean(ex.bookSubtitle) || "";
}

export function resolveForgeCommercialHook(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seedToInterviewState(seed));
  const ex = seed.extracted ?? {};
  return clean(ti.commercialHook) || clean(ex.openingHook) || "";
}

export function resolveForgeCommercialPromise(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seedToInterviewState(seed));
  const ex = seed.extracted ?? {};
  return clean(ti.commercialPromise) || clean(ex.promise) || "";
}

export function mapForgeCharacterToBookCharacter(character: ForgeCharacter): BookCharacter {
  const deep = character;
  const name = clean(character.name);
  const traits = [
    deep.contradiction && `Contraddizione: ${deep.contradiction}`,
    deep.obsession && `Ossessione: ${deep.obsession}`,
    deep.fear && `Paura: ${deep.fear}`,
    deep.arc && `Arco: ${deep.arc}`,
    deep.emotionalTriggers && `Trigger: ${deep.emotionalTriggers}`,
    deep.dominantFlaw && `Difetto: ${deep.dominantFlaw}`,
    deep.blindSpot && `Punto cieco: ${deep.blindSpot}`,
    deep.recurringBehavior && `Comportamento: ${deep.recurringBehavior}`,
    deep.personalLanguage && `Linguaggio: ${deep.personalLanguage}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    name,
    role: ROLE_LABELS[character.role] || character.role,
    wound: clean(deep.wound),
    secret: clean(deep.secret),
    externalDesire: clean(deep.desire),
    personality: traits || clean(deep.fear),
    internalNeed: clean(deep.fear),
    vulnerability: clean(deep.vulnerability || deep.fear),
    emotionalTriggers: clean(deep.emotionalTriggers),
    dominantFlaw: clean(deep.dominantFlaw || deep.contradiction),
    blindSpot: clean(deep.blindSpot || deep.secret),
    recurringBehavior: clean(deep.recurringBehavior || deep.obsession),
    personalLanguage: clean(deep.personalLanguage),
    relationships: deep.obsession ? `Ossessione: ${deep.obsession}` : undefined,
    strictRules: deep.arc
      ? `Arco narrativo bloccato: ${deep.arc}. Non rinominare ${name || "questo personaggio"}.`
      : name
        ? `Non rinominare ${name}.`
        : undefined,
  };
}

export function mapForgeCharactersToBookCharacters(
  characters?: ForgeCharacter[],
): BookCharacter[] {
  if (!characters?.length) return [];
  return characters
    .map(mapForgeCharacterToBookCharacter)
    .filter((c) => clean(c.name).length >= 2);
}

export function buildCharacterTruthBlock(
  characters?: ForgeCharacter[],
  canonLocked?: boolean,
): string {
  if (!characters?.length) return "";
  const lines: string[] = [];
  if (canonLocked) {
    lines.push("CHARACTER TRUTH BLOCK (CANON LOCKED — ZERO RENAME DRIFT):");
  } else {
    lines.push("CHARACTER TRUTH BLOCK:");
  }

  for (const character of characters) {
    const name = clean(character.name);
    if (!name) continue;
    const header =
      character.role === "protagonist"
        ? "PROTAGONISTA"
        : character.role === "antagonist"
          ? "ANTAGONISTA"
          : "PERSONAGGIO";
    lines.push("");
    lines.push(`${header}`);
    lines.push(name);
    if (character.wound) lines.push(`Ferita: ${character.wound}`);
    if (character.fear) lines.push(`Paura: ${character.fear}`);
    if (character.desire) lines.push(`Desiderio: ${character.desire}`);
    if (character.contradiction) lines.push(`Contraddizione: ${character.contradiction}`);
    if (character.obsession) lines.push(`Ossessione: ${character.obsession}`);
    if (character.secret) lines.push(`Segreto: ${character.secret}`);
    if (character.arc) lines.push(`Arco: ${character.arc}`);
    if (character.emotionalTriggers) lines.push(`Trigger emotivi: ${character.emotionalTriggers}`);
    if (character.dominantFlaw) lines.push(`Difetto dominante: ${character.dominantFlaw}`);
    if (character.blindSpot) lines.push(`Punto cieco: ${character.blindSpot}`);
    if (character.vulnerability) lines.push(`Vulnerabilità: ${character.vulnerability}`);
    if (character.recurringBehavior) lines.push(`Comportamento ricorrente: ${character.recurringBehavior}`);
    if (character.personalLanguage) lines.push(`Linguaggio personale: ${character.personalLanguage}`);
    lines.push(`REGOLA: Se il canon dice ${name}, non usare altri nomi per questo ruolo.`);
  }

  return lines.join("\n").trim();
}

function formatCanonLayer(label: string, facts: string[]): string[] {
  if (!facts.length) return [];
  return [label, ...facts.map((f) => `- ${f}`)];
}

export function buildBlueprintCanonBrief(seed: ForgeInterviewSeed): string {
  const canon = seed.canon;
  if (!canon) return "";

  const sections = [
    ...formatCanonLayer("WORLD CANON", canon.world.facts),
    ...formatCanonLayer("CHARACTER CANON", canon.characters.facts),
    ...formatCanonLayer("RELATIONSHIP CANON", canon.relationships.facts),
    ...formatCanonLayer("STORY CANON", canon.story.facts),
    ...formatCanonLayer("ENDING CANON", canon.ending.facts),
    ...formatCanonLayer("BOOK CANON", canon.book.facts),
  ];

  if (!sections.length) return "";

  const locked = seed.canonLocked ? " (LOCKED)" : "";
  return [
    `BLUEPRINT CANON BRIEF${locked}`,
    "Il blueprint deve rispettare questo canon — non reinterpretare le risposte sparse.",
    "",
    ...sections,
  ].join("\n");
}

export function buildForgeEndingLine(seed: ForgeInterviewSeed): string {
  const endingFacts = seed.canon?.ending.facts ?? [];
  if (endingFacts.length) return endingFacts[0];
  const decision = seed.narrativeDecisions?.find((d) => clean(d.answer).length >= 4);
  if (decision?.answer) return clean(decision.answer);
  if (seed.storyFuture?.endingTone) return `Tono finale: ${seed.storyFuture.endingTone}`;
  return "";
}

function parseChapterCountValue(value?: string): number {
  const match = String(value || "").match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function validateForgeHandoffForBlueprint(seed: ForgeInterviewSeed): ForgeBlueprintReadiness {
  const missing: string[] = [];
  const ex = seed.extracted ?? {};
  const state = seedToInterviewState(seed);
  const fiction = (seed.characters?.length ?? 0) > 0;
  const foundationMissing = validateFoundationFieldsFromSeed({
    extracted: ex,
    characters: seed.characters,
    titleIntelligence: seed.titleIntelligence,
    bookFoundationLocked: state.bookFoundationLocked,
    selectedGenre: seed.selectedGenre,
  });
  const hook = resolveForgeCommercialHook(seed);

  if (!seed.canon || !seed.canon.story.facts.length) missing.push("canon");
  if (foundationMissing.length > 0) {
    missing.push(...foundationMissing);
  }
  if (fiction && !mapForgeCharactersToBookCharacters(seed.characters).length) {
    missing.push("characters");
  }
  if (!resolveForgeTitle(seed)) missing.push("titolo");
  if (!resolveForgeSubtitle(seed)) missing.push("sottotitolo");
  if (!hook || hook.length < 20 || isMetadataOnly(hook)) missing.push("hook");
  if (!resolveForgeCommercialPromise(seed)) missing.push("promessa");
  if (!clean(ex.language)) missing.push("language");
  if (!Number(parseChapterCountValue(ex.chapterCount)) && !foundationMissing.includes("chapterCount")) {
    missing.push("chapterCount");
  }
  if (!buildForgeEndingLine(seed) && fiction) missing.push("ending");
  if (!clean(ex.centralConflict) && !ex.readerTransformation) {
    missing.push("conflitto");
  }

  return { ready: missing.length === 0, missing: [...new Set(missing)] };
}

export function buildForgeGuidedBriefExtras(seed: ForgeInterviewSeed): {
  canonBrief: string;
  characterTruthBlock: string;
  characterBibleText: string;
} {
  const canonBrief = buildBlueprintCanonBrief(seed);
  const characterTruthBlock = buildCharacterTruthBlock(seed.characters, seed.canonLocked);
  const characterBibleText = [characterTruthBlock, canonBrief].filter(Boolean).join("\n\n");
  return { canonBrief, characterTruthBlock, characterBibleText };
}

/** Review snapshot for parity checks — Forge vs wizard vs blueprint source. */
export function buildForgeHandoffReview(seed: ForgeInterviewSeed) {
  return buildFinalBookReview(seedToInterviewState(seed));
}
