import type { GuidedInterviewState } from "./types";
import type { CanonLayer, CanonMaster } from "./forge-evolution-types";
import { detectEditorialBookMode } from "./book-understanding-engine";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function layer(facts: string[]): CanonLayer {
  const unique = Array.from(new Set(facts.map(clean).filter((f) => f.length >= 3)));
  return { facts: unique, locked: false };
}

export function createEmptyCanon(): CanonMaster {
  const empty = (): CanonLayer => ({ facts: [], locked: false });
  return {
    world: empty(),
    characters: empty(),
    relationships: empty(),
    story: empty(),
    ending: empty(),
    book: empty(),
    version: 1,
  };
}

function pushUnique(layerRef: CanonLayer, fact: string): void {
  const f = clean(fact);
  if (!f || layerRef.facts.includes(f)) return;
  layerRef.facts.push(f);
}

export function buildCanonFromState(state: GuidedInterviewState): CanonMaster {
  const ex = state.extracted ?? {};
  const canon = state.canon ? structuredClone(state.canon) : createEmptyCanon();

  if (ex.setting) pushUnique(canon.world, `Mondo: ${ex.setting}`);
  if (ex.emotionalTone) pushUnique(canon.world, `Atmosfera: ${ex.emotionalTone}`);
  if (ex.genreDNA) pushUnique(canon.world, `DNA editoriale: ${ex.genreDNA}`);

  for (const character of state.characters ?? []) {
    if (character.name) pushUnique(canon.characters, `${character.role}: ${character.name}`);
    if (character.wound) pushUnique(canon.characters, `Ferita ${character.name ?? ""}: ${character.wound}`);
    if (character.desire) pushUnique(canon.characters, `Desiderio ${character.name ?? ""}: ${character.desire}`);
    if (character.fear) pushUnique(canon.characters, `Paura ${character.name ?? ""}: ${character.fear}`);
    if (character.secret) pushUnique(canon.characters, `Segreto ${character.name ?? ""}: ${character.secret}`);
    if (character.arc) pushUnique(canon.characters, `Arco ${character.name ?? ""}: ${character.arc}`);
    if (character.contradiction) {
      pushUnique(canon.relationships, `Contraddizione ${character.name ?? ""}: ${character.contradiction}`);
    }
    if (character.obsession) {
      pushUnique(canon.relationships, `Ossessione ${character.name ?? ""}: ${character.obsession}`);
    }
  }

  if (ex.centralConflict) pushUnique(canon.story, `Conflitto: ${ex.centralConflict}`);
  if (ex.promise) pushUnique(canon.story, `Promessa: ${ex.promise}`);
  if (ex.narrativeDrive) pushUnique(canon.story, `Motore: ${ex.narrativeDrive}`);

  for (const decision of state.narrativeDecisions ?? []) {
    if (decision.answer) {
      pushUnique(canon.story, `Decisione — ${decision.question}: ${decision.answer}`);
      pushUnique(canon.ending, decision.impact ?? decision.answer);
    }
  }

  const storyRoom = state.storyRoom;
  if (storyRoom) {
    for (const scene of storyRoom.scenes) {
      if (scene.beat) pushUnique(canon.story, `Scena ${scene.role}: ${scene.beat}`);
    }
    for (const beat of storyRoom.arcBeats) {
      if (beat.change) pushUnique(canon.story, `Arco ${beat.label}: ${beat.change}`);
    }
    const ending = storyRoom.ending ?? {};
    if (ending.tone) pushUnique(canon.ending, `Tono finale: ${ending.tone}`);
    if (ending.protagonistFate) pushUnique(canon.ending, `Destino protagonista: ${ending.protagonistFate}`);
    if (ending.readerFeeling) pushUnique(canon.ending, `Sensazione finale lettore: ${ending.readerFeeling}`);
    if (ending.irreversibleChoice) pushUnique(canon.ending, `Scelta irreversibile: ${ending.irreversibleChoice}`);
  }

  const future = state.storyFuture ?? {};
  if (future.finalStatus) pushUnique(canon.ending, `Stato finale protagonista: ${future.finalStatus}`);
  if (future.endingTone) pushUnique(canon.ending, `Tono finale: ${future.endingTone}`);
  if (future.kingdomFate) pushUnique(canon.ending, `Destino del mondo: ${future.kingdomFate}`);
  if (future.betrayalArc) pushUnique(canon.ending, "Arco tradimento: attivo");
  if (future.lastPageFeeling) pushUnique(canon.ending, `Ultima pagina: ${future.lastPageFeeling}`);

  if (ex.readerTransformation) pushUnique(canon.book, `Trasformazione lettore: ${ex.readerTransformation}`);
  if (ex.targetReader) pushUnique(canon.book, `Lettore: ${ex.targetReader}`);
  if (ex.bookTitle || state.titleIntelligence?.definitiveTitle) {
    pushUnique(canon.book, `Titolo: ${ex.bookTitle ?? state.titleIntelligence?.definitiveTitle}`);
  }
  if (ex.bookSubtitle || state.titleIntelligence?.subtitle) {
    pushUnique(canon.book, `Sottotitolo: ${ex.bookSubtitle ?? state.titleIntelligence?.subtitle}`);
  }
  if (ex.authorName) pushUnique(canon.book, `Autore: ${ex.authorName}`);
  if (ex.language) pushUnique(canon.book, `Lingua: ${ex.language}`);
  if (ex.chapterCount) pushUnique(canon.book, `Capitoli: ${ex.chapterCount}`);
  if (ex.subchaptersPreference) pushUnique(canon.book, `Sottocapitoli: ${ex.subchaptersPreference}`);
  if (ex.frontMatter) pushUnique(canon.book, `Front matter: ${ex.frontMatter}`);
  if (ex.backMatter) pushUnique(canon.book, `Back matter: ${ex.backMatter}`);
  if (ex.marketplace) pushUnique(canon.book, `Marketplace: ${ex.marketplace}`);

  canon.version += state.canon ? 0 : 0;
  return canon;
}

export function isCanonComplete(state: GuidedInterviewState): boolean {
  const canon = buildCanonFromState(state);
  const mode = detectEditorialBookMode(state);
  const minStory = mode === "fiction" ? 2 : 1;
  return (
    canon.world.facts.length >= 1 &&
    canon.story.facts.length >= minStory &&
    canon.ending.facts.length >= 1 &&
    canon.book.facts.length >= 3
  );
}

export function lockCanonMaster(canon: CanonMaster): CanonMaster {
  const lockLayer = (l: CanonLayer): CanonLayer => ({ ...l, locked: true });
  return {
    ...canon,
    world: lockLayer(canon.world),
    characters: lockLayer(canon.characters),
    relationships: lockLayer(canon.relationships),
    story: lockLayer(canon.story),
    ending: lockLayer(canon.ending),
    book: lockLayer(canon.book),
    lockedAt: Date.now(),
    version: canon.version + 1,
  };
}
