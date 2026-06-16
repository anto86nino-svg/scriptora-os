import type { BookConfig, Chapter } from "@/types/book";
import { resolveBookTypeContext } from "@/lib/book-type-engine";
import { buildCharacterObsessionEngineBlock } from "./character-obsession-engine";
import { buildHumanImperfectionV4Block, applyHumanImperfectionV4Postprocess } from "./human-imperfection-v4";
import {
  buildPageTurnEngineBlock,
  buildEndingEchoSystemBlock,
  applyPageTurnPostprocess,
} from "./page-turn-engine";
import {
  buildNarrativeBeatDeduplicatorBlock,
  applyNarrativeBeatDeduplicatorPostprocess,
} from "./narrative-beat-deduplicator";
import { buildBestsellerRhythmEngineBlock } from "./bestseller-rhythm-engine";
import { buildCanonLockV2Block, applyCanonLockV2Postprocess } from "./canon-lock-v2";
import { buildDialogueHumanizerBlock, applyDialogueHumanizerPostprocess } from "./dialogue-humanizer";
import {
  buildShowDontTellEnforcerBlock,
  applyShowDontTellEnforcerPostprocess,
} from "./show-dont-tell-enforcer";
import { normalizeManuscriptSpacing } from "./shared-utils";
import type { WritingEngineContext, WritingEngineMode } from "./types";

export const WRITING_ENGINE_V12_STORAGE_KEY = "scriptora-writing-engine-v12-enabled";

export type { CharacterPsychology, WritingEngineContext, WritingEngineMode } from "./types";
export * from "./character-obsession-engine";
export * from "./human-imperfection-v4";
export * from "./page-turn-engine";
export * from "./narrative-beat-deduplicator";
export * from "./bestseller-rhythm-engine";
export * from "./canon-lock-v2";
export * from "./dialogue-humanizer";
export * from "./show-dont-tell-enforcer";

const V12_LEAKAGE_PATTERNS: RegExp[] = [
  /^(HUMAN BESTSELLER MODE V12|CHARACTER OBSESSION ENGINE|PAGE TURN ENGINE|SCENE TURN MATRIX|VOICE FRICTION ENGINE|CONCRETE SPECIFICITY ENGINE|BESTSELLER RHYTHM ENGINE|CANON LOCK V2|ANTI-REPETITION ENGINE V2|DIALOGUE HUMANIZER|SHOW DON'T TELL ENFORCER|ENDING ECHO SYSTEM|FINAL V12 CHECK)[:\s—-].*$/gim,
  /\b(HUMAN BESTSELLER MODE V12|CHARACTER OBSESSION ENGINE|PAGE TURN ENGINE|SCENE TURN MATRIX|VOICE FRICTION ENGINE|CONCRETE SPECIFICITY ENGINE|BESTSELLER RHYTHM ENGINE|CANON LOCK V2|ANTI-REPETITION ENGINE V2|DIALOGUE HUMANIZER|SHOW DON'T TELL ENFORCER|ENDING ECHO SYSTEM)\b/gi,
];

export function isWritingEngineV12Enabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_WRITING_ENGINE_V12 === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(WRITING_ENGINE_V12_STORAGE_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}

function practicalV12Rules(family: string): string {
  if (family === "educational") {
    return `EDUCATIONAL V12: definition → explanation → example → practice → recap. Progressive difficulty.`;
  }
  if (family === "manual") {
    return `MANUAL V12: steps, warnings, examples, troubleshooting, decision checkpoints.`;
  }
  if (family === "poetry") {
    return `POETRY V12: image logic, silence, line tension. Concrete image over abstract explanation.`;
  }
  return `NONFICTION V12: human authority, concrete framework, cut motivational fog.`;
}

export function buildWritingEngineV12Block(
  config: BookConfig,
  opts: WritingEngineContext & { previousChapters?: Chapter[] } = {},
): string {
  if (!isWritingEngineV12Enabled()) return "";

  const family = resolveBookTypeContext(config).definition.family;
  const mode = opts.mode || "generation";
  const chapterLabel = typeof opts.chapterIndex === "number" ? `Chapter ${opts.chapterIndex + 1}` : "This section";

  if (family !== "narrative") {
    return `
HUMAN BESTSELLER MODE V12 — PRACTICAL PAGE-TURNING (${family}, ${mode}):
- Reader must feel: "useful, clear, I want the next section."
- Value loop: problem → insight → example → action → next reason to continue.

${practicalV12Rules(family)}

${chapterLabel} FINAL CHECK: Did the reader gain concrete capability or clearer understanding?`;
  }

  return [
    `HUMAN BESTSELLER MODE V12 — MODULAR WRITING ENGINE (${mode}):`,
    "Mission: sound like a human bestseller author, not a good AI writer.",
    buildCharacterObsessionEngineBlock(config, opts),
    buildPageTurnEngineBlock(config, opts),
    buildEndingEchoSystemBlock(config),
    buildBestsellerRhythmEngineBlock(config, opts),
    buildCanonLockV2Block(config, opts),
    buildNarrativeBeatDeduplicatorBlock(config, opts),
    buildHumanImperfectionV4Block(config, opts),
    buildDialogueHumanizerBlock(config, opts),
    buildShowDontTellEnforcerBlock(config.language),
    `FINAL V12 CHECK: Increase pull, obsession, tension, realism or commercial momentum. Return only clean manuscript prose in ${config.language}.`,
  ].join("\n\n");
}

function stripV12Leakage(text: string): string {
  let next = text;
  for (const pattern of V12_LEAKAGE_PATTERNS) next = next.replace(pattern, "");
  return next;
}

export function applyWritingEngineV12Postprocess(
  text: string,
  opts: WritingEngineContext = {},
): string {
  if (!text?.trim() || !isWritingEngineV12Enabled()) return text || "";

  const family = opts.config ? resolveBookTypeContext(opts.config).definition.family : "narrative";
  let next = stripV12Leakage(text);

  if (family === "narrative") {
    next = applyHumanImperfectionV4Postprocess(next, opts);
    next = applyNarrativeBeatDeduplicatorPostprocess(next, opts);
    next = applyDialogueHumanizerPostprocess(next, opts);
    next = applyShowDontTellEnforcerPostprocess(next, opts);
    next = applyPageTurnPostprocess(next, opts);
    next = applyCanonLockV2Postprocess(next, opts);
  }

  return normalizeManuscriptSpacing(next);
}

/** Back-compat facade aliases */
export const buildHumanBestsellerModeV12Block = buildWritingEngineV12Block;
export const applyHumanBestsellerModeV12Postprocess = applyWritingEngineV12Postprocess;
