import type { BookBlueprint, BookConfig } from "@/types/book";
import { extractNarrativeIdeaSignals, hasRichNarrativeIdea } from "@/lib/narrative-promise-intelligence";
import {
  buildFantasyChapterBeats,
  buildMemoirChapterTitles,
  buildPsychologicalThrillerChapterTitles,
  buildSelfHelpChapterTitles,
  buildSupernaturalThrillerChapterTitles,
  expandConceptBeatsToCount,
  hasHighConceptFantasySignals,
  hasSupernaturalThrillerSignals,
} from "@/lib/concept-dominance";

export interface BlueprintEntityAnchor {
  label: string;
  kind: "place" | "object" | "mystery" | "stake" | "character";
}

const GENERIC_BEAT_MARKERS = [
  "normalità",
  "crepa",
  "escalation",
  "punto di non ritorno",
  "discesa",
  "rivelazione parziale",
  "arrivo nel luogo malato",
  "primi segni e presenze",
];

function clean(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function extractBlueprintEntityAnchors(idea: string): BlueprintEntityAnchor[] {
  const signals = extractNarrativeIdeaSignals(idea);
  const anchors: BlueprintEntityAnchor[] = [];

  if (signals.protagonist) {
    anchors.push({ label: signals.protagonist, kind: "character" });
  }
  for (const label of signals.places) anchors.push({ label, kind: "place" });
  for (const label of signals.objects) anchors.push({ label, kind: "object" });
  for (const label of signals.mysteries) anchors.push({ label, kind: "mystery" });
  for (const label of signals.stakes) anchors.push({ label, kind: "stake" });

  return anchors;
}

export function hasRichIdeaEntities(idea: string): boolean {
  return hasRichNarrativeIdea(idea);
}

export function isGenericBlueprintBeat(text: string): boolean {
  const hay = normalize(text);
  return GENERIC_BEAT_MARKERS.some((marker) => hay.includes(normalize(marker)));
}

function chapterBeatForIndex(
  index: number,
  total: number,
  anchors: BlueprintEntityAnchor[],
  protagonist: string,
): { title: string; summary: string } {
  const a = (offset: number) => anchors[offset % Math.max(1, anchors.length)]?.label || "il mistero centrale";
  const chapter = index + 1;
  const isOpening = index === 0;
  const isMid = index === Math.floor(total / 2);
  const isFinal = index === total - 1;

  if (isOpening) {
    return {
      title: `${protagonist} e ${a(0)}`,
      summary: `${protagonist} incontra il primo segnale legato a ${a(0)} e ${a(1)}: la routine si incrina quando ${a(2)} non combacia con ciò che ricorda.`,
    };
  }
  if (isMid) {
    return {
      title: `La verità dietro ${a(1)}`,
      summary: `Midpoint: ${a(3)} rivela un legame tra ${a(0)}, ${a(1)} e ${a(2)}. ${protagonist} capisce che ${a(4)} non è un dettaglio — è la chiave del mistero.`,
    };
  }
  if (isFinal) {
    return {
      title: `Sul ${a(2)}`,
      summary: `Finale: ${protagonist} affronta ${a(1)} e ${a(3)} nel punto dove ${a(0)} e ${a(4)} convergono. La scelta sul ${a(2)} decide se la memoria può essere salvata o riscritta per sempre.`,
    };
  }

  if (index === 1) {
    return {
      title: `Memoria e ${a(1)}`,
      summary: `Capitolo ${chapter}: ${protagonist} nota che la memoria non coincide con ${a(0)} — ${a(1)} e ${a(2)} si contraddicono mentre ${a(3)} osserva in silenzio.`,
    };
  }

  return {
    title: `${a(index)} — capitolo ${chapter}`,
    summary: `Capitolo ${chapter}: ${protagonist} segue ${a(index)} verso ${a(index + 1)} mentre ${a(index + 2)} altera ciò che credeva certo. ${a(index + 3)} aumenta la posta in gioco.`,
  };
}

export function buildFormatAwareChapterScaffold(
  idea: string,
  chapterCount: number,
  opts: { genre?: string; bookFormat?: string } = {},
): Array<{ title: string; summary: string }> {
  const genre = String(opts.genre || "");
  const bookFormat = String(opts.bookFormat || "");

  if (hasSupernaturalThrillerSignals(idea)) {
    return expandConceptBeatsToCount(buildSupernaturalThrillerChapterTitles(idea), chapterCount);
  }
  if (hasHighConceptFantasySignals(idea)) {
    return expandConceptBeatsToCount(buildFantasyChapterBeats(idea), chapterCount);
  }
  if (/thriller|giallo|noir/i.test(genre) && /\b(serial killer|omicid|indagine|colpevole|psicolog)/i.test(idea)) {
    return expandConceptBeatsToCount(buildPsychologicalThrillerChapterTitles(idea), chapterCount);
  }
  if (/memoir|memorie|autobiograf/i.test(genre) || bookFormat === "memoir") {
    return expandConceptBeatsToCount(buildMemoirChapterTitles(idea), chapterCount);
  }
  if (/self-help|self help|manuale|business|guida/i.test(genre) || bookFormat === "self_help") {
    return expandConceptBeatsToCount(buildSelfHelpChapterTitles(idea), chapterCount);
  }
  if (hasRichIdeaEntities(idea)) {
    return buildEntityAwareChapterScaffold(idea, chapterCount);
  }
  return [];
}

export function buildEntityAwareChapterScaffold(
  idea: string,
  chapterCount: number,
): Array<{ title: string; summary: string }> {
  const anchors = extractBlueprintEntityAnchors(idea);
  const protagonist = anchors.find((a) => a.kind === "character")?.label || "Il protagonista";
  return Array.from({ length: chapterCount }, (_, index) =>
    chapterBeatForIndex(index, chapterCount, anchors, protagonist),
  );
}

export function buildBlueprintEntityPromptBlock(idea: string): string {
  const anchors = extractBlueprintEntityAnchors(idea);
  if (anchors.length < 3) return "";

  const lines = anchors.map((anchor) => `- ${anchor.kind}: ${anchor.label}`);
  return `IDEA ENTITY LOCK — MANDATORY IN EVERY CHAPTER OUTLINE:
Each chapter title and summary MUST reference at least TWO of these concrete story elements from the user's idea. Do NOT use generic beats like "Normalità", "Crepa", "Escalation" without naming these entities.
${lines.join("\n")}`;
}

export function enrichBlueprintFromIdeaSeed(
  blueprint: BookBlueprint,
  config: BookConfig,
  ideaSeed?: string,
): BookBlueprint {
  const idea = clean(ideaSeed || (config as BookConfig & { idea?: string }).idea || "");
  if (!idea) return blueprint;

  const formatScaffold = buildFormatAwareChapterScaffold(idea, config.numberOfChapters, {
    genre: config.genre,
    bookFormat: (config as BookConfig & { bookFormat?: string }).bookFormat,
  });
  const scaffold = formatScaffold.length > 0
    ? formatScaffold
    : hasRichIdeaEntities(idea)
      ? buildEntityAwareChapterScaffold(idea, config.numberOfChapters)
      : [];
  if (scaffold.length === 0) return blueprint;

  const enrichedOutlines = blueprint.chapterOutlines.map((outline, index) => {
    const entityBeat = scaffold[index];
    if (!entityBeat) return outline;

    const summary = clean(outline.summary);
    const title = clean(outline.title);
    const needsEnrichment =
      !summary ||
      summary.length < 40 ||
      isGenericBlueprintBeat(summary) ||
      isGenericBlueprintBeat(title);

    if (!needsEnrichment) return outline;

    return {
      ...outline,
      title: isGenericBlueprintBeat(title) ? entityBeat.title : title,
      summary: `${entityBeat.summary} ${summary && !isGenericBlueprintBeat(summary) ? summary : ""}`.trim(),
    };
  });

  const anchorLabels = extractBlueprintEntityAnchors(idea).map((a) => a.label).slice(0, 6);
  const overview = clean(blueprint.overview);
  const enrichedOverview = overview && !isGenericBlueprintBeat(overview)
    ? overview
    : `Struttura narrativa ancorata all'idea: ${anchorLabels.join(", ")}. Ogni capitolo avanza mistero, posta in gioco e rivelazioni legate a questi elementi concreti.`;

  return {
    ...blueprint,
    overview: enrichedOverview,
    chapterOutlines: enrichedOutlines,
  };
}

export function validateBlueprintEntityCoverage(
  blueprint: BookBlueprint,
  idea: string,
  requiredTerms: string[],
): { pass: boolean; missing: string[] } {
  const hay = normalize([
    blueprint.overview,
    ...(blueprint.chapterOutlines || []).map((o) => `${o.title} ${o.summary}`),
  ].join(" "));

  const missing = requiredTerms.filter((term) => !hay.includes(normalize(term)));
  return { pass: missing.length === 0, missing };
}
