import type { BookConfig, GenreLock } from "@/types/book";
import {
  buildGenreBlueprintBlock,
  buildGenreEditorialBlock,
  buildGenreSystemBlock,
  getGenreBlueprint,
  resolveGenreKey,
} from "@/lib/genre-intelligence";
import type { BookTypeContext } from "./types";
import { resolveBookTypeDefinition } from "./taxonomy";
import { buildTitleEnginePromptBlock } from "./title-engine";
import { buildSubchapterEnginePromptBlock } from "./subchapter-engine";

function buildHumanizationBlock(family: BookTypeContext["definition"]["family"]): string {
  const narrative = `HUMANIZATION: favor subtext, imperfect speech, silence, contradiction; avoid therapeutic dialogue and emotional labeling.`;
  const practical = `HUMANIZATION: favor clarity, concrete examples, practitioner voice; avoid hype and vague motivation.`;
  return family === "narrative" || family === "poetry" ? narrative : practical;
}

function buildValidationBlock(family: BookTypeContext["definition"]["family"]): string {
  return `VALIDATION: every scene/section must advance content, change state, or produce consequence — no spinning on the same idea. Family=${family}.`;
}

function buildEditorialRulesBlock(config: BookConfig, family: BookTypeContext["definition"]["family"]): string {
  const editorial = buildGenreEditorialBlock(config.genre, config.subcategory);
  const familyRules: Record<string, string> = {
    narrative: "Use scene continuity, character memory, and anti-repetition of emotional beats.",
    nonfiction: "Use frameworks, examples, and actionable takeaways — no filler anecdotes.",
    educational: "Use learning objectives, definitions, worked examples, and checks for understanding.",
    manual: "Use prerequisites, numbered steps, warnings, and troubleshooting.",
    cookbook: "Use ingredients, timing, technique notes, and serving guidance.",
    poetry: "Use image density, rhythm variation, and thematic coherence.",
  };
  return `${editorial}\nBOOK TYPE RULES (${family}): ${familyRules[family] || familyRules.narrative}`;
}

/** Build genre lock with book-type-aware subchapter defaults. */
export function buildBookTypeLock(config: BookConfig): GenreLock {
  const def = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const bp = getGenreBlueprint(config.genre, config.subcategory);
  return {
    bookTypeId: def.id,
    genre: config.genre,
    subcategory: config.subcategory,
    structure: bp.structure,
    rules: bp.contentRules,
    chapterStyle: bp.chapterStyle,
    tone: bp.tone,
    frontMatterTemplate: bp.frontMatterTemplate,
    backMatterTemplate: bp.backMatterTemplate,
    hasSubchapters: config.subchaptersEnabled ?? def.defaultSubchapters,
    lockedAt: new Date().toISOString(),
  };
}

export function resolveBookTypeContext(config: BookConfig): BookTypeContext {
  const definition = resolveBookTypeDefinition(config.genre, config.subcategory, config.subgenre, config.bookTypeId);
  const genreKey = resolveGenreKey(config.genre, config.subcategory);
  const lock = buildBookTypeLock(config);
  const subCount = config.subchaptersEnabled ? (config.subchaptersPerChapter || 3) : 0;

  return {
    definition,
    genreKey,
    lock,
    titleRulesBlock: buildTitleEnginePromptBlock(definition.family, config.language),
    subchapterRulesBlock: buildSubchapterEnginePromptBlock(definition.family, subCount, config.language),
    editorialRulesBlock: buildEditorialRulesBlock(config, definition.family),
    humanizationBlock: buildHumanizationBlock(definition.family),
    validationBlock: buildValidationBlock(definition.family),
  };
}

/** Unified prompt block for blueprint + chapter generation. */
export function buildBookTypeEngineBlock(config: BookConfig): string {
  const ctx = resolveBookTypeContext(config);
  return [
    `UNIVERSAL BOOK TYPE ENGINE — ${ctx.definition.label} (${ctx.definition.family})`,
    buildGenreSystemBlock(config.genre, config.subcategory),
    buildGenreBlueprintBlock(config.genre, config.subcategory),
    ctx.editorialRulesBlock,
    ctx.titleRulesBlock,
    ctx.subchapterRulesBlock,
    ctx.humanizationBlock,
    ctx.validationBlock,
  ].join("\n\n");
}

export function getBookTypeBlueprint(config: BookConfig) {
  return getGenreBlueprint(config.genre, config.subcategory);
}

export { resolveBookTypeDefinition, resolveBookTypeById, studioGenresFromRegistry, BOOK_TYPE_REGISTRY } from "./taxonomy";
export type { StudioGenreOption } from "./taxonomy";
export { isForbiddenGenericTitle, fallbackTitleForFamily, buildTitleEnginePromptBlock } from "./title-engine";
export { buildSubchapterEnginePromptBlock } from "./subchapter-engine";
