import type { BookCharacter } from "@/types/book";
import type { BookDnaLock } from "./dna-lock";
import type {
  CanonMaster,
  ForgeCharacter,
  NarrativeDecisionRecord,
  StoryFutureState,
  TitleIntelligence,
} from "./forge-evolution-types";
import type { GuidedInterviewState } from "./types";
import { buildFinalBookReview } from "./final-book-review";
import { deriveTitleIntelligence } from "./title-intelligence-engine";
import { sanitizeDnaText } from "./dna-cleaner";

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
};

export type ForgeBlueprintReadiness = {
  ready: boolean;
  missing: string[];
};

const ROLE_LABELS: Record<ForgeCharacter["role"], string> = {
  protagonist: "Protagonista",
  antagonist: "Antagonista",
  supporting: "Personaggio di supporto",
};

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
    characters: state.characters,
    titleIntelligence: state.titleIntelligence ?? title,
    narrativeDecisions: state.narrativeDecisions,
    storyFuture: state.storyFuture,
  };
}

export function resolveForgeTitle(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seed as GuidedInterviewState);
  const ex = seed.extracted ?? {};
  return (
    clean(ti.definitiveTitle) ||
    clean(ex.bookTitle) ||
    ""
  );
}

export function resolveForgeSubtitle(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seed as GuidedInterviewState);
  const ex = seed.extracted ?? {};
  return clean(ti.subtitle) || clean(ex.bookSubtitle) || "";
}

export function resolveForgeCommercialHook(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seed as GuidedInterviewState);
  const ex = seed.extracted ?? {};
  return clean(ti.commercialHook) || clean(ex.openingHook) || "";
}

export function resolveForgeCommercialPromise(seed: ForgeInterviewSeed): string {
  const ti = seed.titleIntelligence ?? deriveTitleIntelligence(seed as GuidedInterviewState);
  const ex = seed.extracted ?? {};
  return clean(ti.commercialPromise) || clean(ex.promise) || "";
}

export function mapForgeCharacterToBookCharacter(character: ForgeCharacter): BookCharacter {
  const name = clean(character.name);
  const traits = [
    character.contradiction && `Contraddizione: ${character.contradiction}`,
    character.obsession && `Ossessione: ${character.obsession}`,
    character.fear && `Paura: ${character.fear}`,
    character.arc && `Arco: ${character.arc}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    name,
    role: ROLE_LABELS[character.role] || character.role,
    wound: clean(character.wound),
    secret: clean(character.secret),
    externalDesire: clean(character.desire),
    personality: traits || clean(character.fear),
    internalNeed: clean(character.fear),
    relationships: character.obsession ? `Ossessione: ${character.obsession}` : undefined,
    strictRules: character.arc
      ? `Arco narrativo bloccato: ${character.arc}. Non rinominare ${name || "questo personaggio"}.`
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

export function validateForgeHandoffForBlueprint(seed: ForgeInterviewSeed): ForgeBlueprintReadiness {
  const missing: string[] = [];
  const ex = seed.extracted ?? {};
  const fiction = (seed.characters?.length ?? 0) > 0;

  if (!seed.canon || !seed.canon.story.facts.length) missing.push("canon");
  if (fiction && !mapForgeCharactersToBookCharacters(seed.characters).length) {
    missing.push("characters");
  }
  if (!resolveForgeTitle(seed)) missing.push("titolo");
  if (!resolveForgeSubtitle(seed)) missing.push("sottotitolo");
  if (!resolveForgeCommercialHook(seed)) missing.push("hook");
  if (!resolveForgeCommercialPromise(seed)) missing.push("promessa");
  if (!buildForgeEndingLine(seed) && fiction) missing.push("ending");
  if (!clean(ex.centralConflict)) missing.push("conflitto");

  return { ready: missing.length === 0, missing };
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
  return buildFinalBookReview(seed as GuidedInterviewState);
}
