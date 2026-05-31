import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { LongBookMemorySnapshot } from "@/lib/long-book-memory/types";
import { detectGenreBrainId, resolveGenreBrainProfile } from "@/lib/GenreBrain";
import { getGenreBlueprint, getGenreProfile } from "@/lib/genre-intelligence";
import { buildSupremeGenrePromptBlock, getSupremeGenreProfile } from "@/lib/genre-brain-supreme";
import {
  buildNarrativeMemoryCore,
  buildNarrativeMemoryPromptBlock,
} from "@/lib/narrative-memory-core";
import { getClichePreventionBlock } from "@/lib/cliche-engine";
import {
  buildCharacterIntentPromptBlock,
  buildCharacterIntentSheets,
  buildCharacterSupremacyProfiles,
  detectPresentCharacters,
} from "@/lib/character-supremacy";
import { buildTensionPreventionBlock } from "@/lib/tension-engine-v2";
import type { ChapterArcPhase, EditorialIntentSheet } from "./types";
import { EDITORIAL_ORCHESTRATOR_VERSION } from "./types";

function resolveChapterArc(chapterIndex: number, totalChapters: number): ChapterArcPhase {
  if (chapterIndex === 0) return "opening";
  if (chapterIndex >= Math.max(0, totalChapters - 2)) return "closing";
  return "middle";
}

function arcDirectives(arc: ChapterArcPhase): string[] {
  switch (arc) {
    case "opening":
      return [
        "Open in scene — no meta throat-clearing, no 'in this chapter'.",
        "Establish voice and stakes within the first 120 words.",
        "End with forward pull, not tidy resolution.",
      ];
    case "closing":
      return [
        "Escalate or complicate — avoid premature emotional closure.",
        "Pay off at least one setup from earlier chapters if present.",
        "Close on tension, question, or irreversible change.",
      ];
    default:
      return [
        "Every scene must change something — emotion, relationship, or plot.",
        "Delay gratification; no premature reconciliation or full reveals.",
        "Prefer subtext over explained emotion.",
      ];
  }
}

export function buildEditorialIntentSheet(input: {
  config: BookConfig;
  blueprint: BookBlueprint;
  chapterIndex: number;
  chapterTitle: string;
  chapterSummary: string;
  previousChapters: Chapter[];
  longBookMemory?: LongBookMemorySnapshot;
}): EditorialIntentSheet {
  const { config, chapterIndex, chapterTitle, chapterSummary } = input;
  const totalChapters = config.numberOfChapters || input.blueprint.chapterOutlines.length || 1;
  const genreBrainId = detectGenreBrainId(config);
  const brain = resolveGenreBrainProfile({ config, previousChapters: input.previousChapters });
  const genreBp = getGenreBlueprint(config.genre, (config as { subcategory?: string }).subcategory);
  const genreProfile = getGenreProfile(config.genre, (config as { subcategory?: string }).subcategory);
  const chapterArc = resolveChapterArc(chapterIndex, totalChapters);

  const characterDirectives: string[] = [];
  for (const state of input.longBookMemory?.characterStates?.slice(0, 4) || []) {
    if (!state.name) continue;
    const bits = [
      state.emotionalState && `emotion: ${state.emotionalState}`,
      state.traumaState && `wound: ${state.traumaState}`,
      state.relationshipState && `relationships: ${state.relationshipState}`,
    ].filter(Boolean);
    if (bits.length) characterDirectives.push(`${state.name} — ${bits.join("; ")}`);
  }

  for (const psych of input.longBookMemory?.characterPsychology?.slice(0, 3) || []) {
    if (!psych.name) continue;
    if (psych.behavioralDirectives?.length) {
      characterDirectives.push(`${psych.name}: ${psych.behavioralDirectives.slice(0, 2).join("; ")}`);
    }
    if (psych.fear) {
      characterDirectives.push(`${psych.name} core fear: ${psych.fear}`);
    }
  }

  const preventionDirectives = [
    ...arcDirectives(chapterArc),
    ...brain.notes.slice(0, 4),
    `Chapter plan: ${chapterSummary}`,
    brain.weights.subtextLevel > 0.05
      ? "Increase subtext — show emotion through gesture, silence, contradiction."
      : "Keep clarity high — concrete examples over abstraction.",
    brain.weights.tensionSensitivity > 0.05
      ? "Maintain unresolved tension — no early emotional payoff."
      : "Maintain momentum — avoid filler transitions.",
  ];

  const tensionFloor = Math.round(38 + brain.weights.tensionSensitivity * 120);
  const hookMin = genreBrainId === "nonfiction" ? 48 : 52;
  const bingeMin = genreBrainId === "romance" ? 50 : 46;

  const supremacyProfiles = buildCharacterSupremacyProfiles({
    config,
    blueprint: input.blueprint,
    chapters: input.previousChapters,
    longBookMemory: input.longBookMemory,
  });
  const presentProfiles = detectPresentCharacters(
    `${chapterSummary} ${input.previousChapters.at(-1)?.content?.slice(-800) || ""}`,
    supremacyProfiles,
  );
  const characterIntentSheets = buildCharacterIntentSheets({
    profiles: supremacyProfiles,
    chapterIndex,
    presentOnly: presentProfiles.length ? presentProfiles : supremacyProfiles.slice(0, 4),
  });

  const narrativeMemory = buildNarrativeMemoryCore({
    config,
    blueprint: input.blueprint,
    chapters: input.previousChapters,
  });

  return {
    version: EDITORIAL_ORCHESTRATOR_VERSION,
    chapterIndex,
    chapterTitle,
    genreBrainId,
    pacingStyle: brain.pacingStyle,
    chapterArc,
    genreRules: genreBp.contentRules.slice(0, 6),
    genreDonts: genreProfile.donts.slice(0, 6),
    preventionDirectives,
    characterDirectives: characterDirectives.slice(0, 6),
    tensionFloor: Math.max(30, Math.min(85, tensionFloor)),
    marketFloor: { hookMin, bingeMin },
    genre: config.genre,
    characterIntentSheets,
    narrativeMemoryBlock: buildNarrativeMemoryPromptBlock(narrativeMemory),
    supremeGenreBlock: buildSupremeGenrePromptBlock(getSupremeGenreProfile({ config })),
  };
}

export function buildCharacterIntentBlockFromSheet(sheet: EditorialIntentSheet): string {
  return buildCharacterIntentPromptBlock(sheet.characterIntentSheets || []);
}

export function buildEditorialIntentPromptBlock(
  sheet: EditorialIntentSheet,
  config?: import("@/types/book").BookConfig,
): string {
  const lines = [
    "EDITORIAL INTENT SHEET (invisible pre-generation contract — obey strictly):",
    `Arc: ${sheet.chapterArc} · Genre brain: ${sheet.genreBrainId} · Pacing: ${sheet.pacingStyle}`,
    "",
    "PREVENT before writing (do not fix later):",
    ...sheet.preventionDirectives.map(d => `• ${d}`),
  ];

  if (sheet.genreDonts.length) {
    lines.push("", "NEVER in this chapter:");
    lines.push(...sheet.genreDonts.map(d => `• ${d}`));
  }

  if (sheet.genreRules.length) {
    lines.push("", "Genre rules (mandatory):");
    lines.push(...sheet.genreRules.map(r => `• ${r}`));
  }

  if (sheet.characterDirectives.length) {
    lines.push("", "Character continuity:");
    lines.push(...sheet.characterDirectives.map(c => `• ${c}`));
  }

  lines.push(
    "",
    sheet.supremeGenreBlock || buildSupremeGenrePromptBlock(getSupremeGenreProfile({ genre: sheet.genre } as import("@/types/book").BookConfig)),
    "",
    sheet.narrativeMemoryBlock || "",
    "",
    buildCharacterIntentBlockFromSheet(sheet),
    "",
    buildTensionPreventionBlock(config || ({ genre: sheet.genre } as import("@/types/book").BookConfig)),
    "",
    getClichePreventionBlock(),
    "",
    `Quality floor — hook ≥ ${sheet.marketFloor.hookMin}/100, binge pull ≥ ${sheet.marketFloor.bingeMin}/100, tension ≥ ${sheet.tensionFloor}/100.`,
    "Deliver prose that passes pre-delivery with ZERO critical issues.",
  );

  return lines.join("\n");
}
