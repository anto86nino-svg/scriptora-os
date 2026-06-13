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
  const narrative = `HUMANIZATION:
- favor subtext, imperfect speech, silence, contradiction, physical gesture, and consequence;
- characters should often avoid saying exactly what they feel;
- avoid therapeutic dialogue, instant healing, and repeated confessions;
- every scene must move through a new choice, obstacle, discovery, or cost.`;
  const practical = `HUMANIZATION:
- favor clarity, concrete examples, practitioner voice, frameworks, checklists, and usable next steps;
- avoid hype, vague motivation, invented authority, and poetic dramatization;
- every section must add practical value that was not already stated.`;
  const educational = `HUMANIZATION:
- teach progressively: definition, explanation, example, worked application, recap, check question;
- use language suited to the reader level;
- avoid romance/narrative humanization unless the book type is explicitly fiction.`;
  const poetry = `HUMANIZATION:
- preserve musicality, image logic, rhythm variation, and emotional coherence;
- avoid generic AI-poem abstractions and repeated symbolic phrasing;
- each poem or section needs one concrete image anchoring the emotion.`;
  if (family === "educational") return educational;
  if (family === "poetry") return poetry;
  return family === "narrative" ? narrative : practical;
}

function buildValidationBlock(family: BookTypeContext["definition"]["family"]): string {
  const familyChecks: Record<string, string> = {
    narrative: "Scene advances plot/relationship; emotional beat is not recycled; dialogue carries subtext; chapter ends with new pressure.",
    nonfiction: "Concept is not repeated; examples are specific; reader receives a framework, checklist, exercise, or decision path.",
    educational: "Learning objective is clear; explanation builds step by step; includes example, recap, and verification question.",
    manual: "Steps are executable; prerequisites and warnings are clear; troubleshooting or edge cases are included.",
    cookbook: "Ingredients, timing, technique, substitutions, and serving outcome are specific.",
    poetry: "Images are specific; rhythm varies; emotion is embodied rather than explained.",
  };
  return `VALIDATION: every scene/section must advance content, change state, or produce consequence — no spinning on the same idea. Family=${family}. ${familyChecks[family] || familyChecks.narrative}`;
}

function buildEditorialRulesBlock(config: BookConfig, family: BookTypeContext["definition"]["family"]): string {
  const editorial = buildGenreEditorialBlock(config.genre, config.subcategory);
  const familyRules: Record<string, string> = {
    narrative: "Use scene continuity, character memory, and anti-repetition of emotional beats. Romance/dark romance must preserve slow burn; thriller/crime/horror must escalate danger, clues, or pressure; fantasy/sci-fi must protect world rules and reveal through action, not infodump.",
    nonfiction: "Use frameworks, examples, exercises, and actionable takeaways — no filler anecdotes or motivational fog.",
    educational: "Use learning objectives, definitions, worked examples, checks for understanding, summaries, and level-appropriate language.",
    manual: "Use prerequisites, numbered steps, warnings, troubleshooting, and concrete examples.",
    cookbook: "Use ingredients, timing, technique notes, and serving guidance.",
    poetry: "Use image density, rhythm variation, sonic control, and thematic coherence. Avoid generic abstractions.",
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
