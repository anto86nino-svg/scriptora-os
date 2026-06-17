import type { GuidedInterviewState } from "./types";
import type { FinalBookReview, FinalBookReviewField } from "./forge-evolution-types";
import { deriveCopyrightConfig } from "./copyright-engine";
import { deriveTitleIntelligence } from "./title-intelligence-engine";
import { getStoryRoom } from "./story-room-engine";
import { sanitizeDnaText } from "./dna-cleaner";

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function pick(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = clean(v);
    if (t.length >= 2) return t;
  }
  return "—";
}

export function buildFinalBookReview(state: GuidedInterviewState): FinalBookReview {
  const ex = state.extracted ?? {};
  const title = deriveTitleIntelligence(state);
  const copyright = deriveCopyrightConfig(state);
  const lead = state.characters?.find((c) => c.role === "protagonist");
  const villain = state.characters?.find((c) => c.role === "antagonist");
  const storyRoom = getStoryRoom(state);
  const endingFacts = state.canon?.ending.facts ?? [];
  const characterLine = lead?.name
    ? `${lead.name}${villain?.name ? ` vs ${villain.name}` : ""}${lead.arc ? ` — ${lead.arc}` : ""}`
    : pick(ex.protagonistWound, ex.centralConflict);
  const sceneLine =
    storyRoom.scenes
      .map((scene) => scene.beat)
      .filter(Boolean)
      .slice(0, 2)
      .join(" · ") || "—";
  const arcLine =
    storyRoom.arcBeats
      .map((beat) => beat.change)
      .filter(Boolean)
      .slice(0, 2)
      .join(" · ") || "—";

  const review: FinalBookReview = {
    title: pick(title.definitiveTitle, ex.bookTitle),
    subtitle: pick(title.subtitle, ex.bookSubtitle),
    author: pick(ex.authorName),
    language: pick(ex.language, "Italiano"),
    genre: pick(ex.genre, ex.genreDNA, state.selectedGenre),
    subgenre: pick(ex.subgenre, state.inferredProfile?.subgenre),
    targetReader: pick(ex.targetReader),
    promise: pick(title.commercialPromise, ex.promise),
    conflict: pick(ex.centralConflict),
    transformation: pick(ex.readerTransformation),
    characters: characterLine,
    scenes: sceneLine,
    arcs: arcLine,
    ending: endingFacts[0] ?? pick(storyRoom.ending?.tone, storyRoom.ending?.readerFeeling, state.storyFuture?.endingTone, ex.readerTransformation),
    chapters: pick(ex.chapterCount),
    subchapters: pick(ex.subchaptersPreference),
    frontMatter: pick(ex.frontMatter),
    backMatter: pick(ex.backMatter),
    marketplace: pick(ex.marketplace),
    copyright:
      copyright.mode === "custom"
        ? pick(copyright.customText)
        : `© ${copyright.year ?? new Date().getFullYear()} ${pick(copyright.holder, ex.authorName)}`,
    commercialHook: pick(title.commercialHook, ex.openingHook),
    fields: [],
  };

  const fields: FinalBookReviewField[] = [
    { label: "Titolo", value: review.title, key: "bookTitle" },
    { label: "Sottotitolo", value: review.subtitle, key: "bookSubtitle" },
    { label: "Autore", value: review.author, key: "authorName" },
    { label: "Lingua", value: review.language, key: "language" },
    { label: "Genere", value: review.genre, key: "genre" },
    { label: "Sottogenere", value: review.subgenre, key: "subgenre" },
    { label: "Lettore ideale", value: review.targetReader, key: "targetReader" },
    { label: "Promessa", value: review.promise, key: "promise" },
    { label: "Conflitto", value: review.conflict, key: "centralConflict" },
    { label: "Trasformazione", value: review.transformation, key: "readerTransformation" },
    { label: "Personaggi", value: review.characters },
    { label: "Scene chiave", value: review.scenes },
    { label: "Archi narrativi", value: review.arcs },
    { label: "Finale", value: review.ending },
    { label: "Capitoli", value: review.chapters, key: "chapterCount" },
    { label: "Sottocapitoli", value: review.subchapters, key: "subchaptersPreference" },
    { label: "Front Matter", value: review.frontMatter, key: "frontMatter" },
    { label: "Back Matter", value: review.backMatter, key: "backMatter" },
    { label: "Marketplace", value: review.marketplace, key: "marketplace" },
    { label: "Hook commerciale", value: review.commercialHook, key: "openingHook" },
    { label: "Copyright", value: review.copyright },
  ];

  review.fields = fields.filter((f) => f.value !== "—");
  return review;
}
