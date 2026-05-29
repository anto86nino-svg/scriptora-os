export type {
  BookDomain,
  BookIntelligenceInput,
  BookIntelligenceLayers,
  BookIntelligenceReport,
  BookIntelligenceSnapshot,
  WritingBrainId,
} from "./types";

export { WRITING_BRAINS, getWritingBrain } from "./brains";
export type { WritingBrainProfile } from "./brains";

export {
  detectBookIntelligence,
  buildBookIntelligenceSnapshot,
  buildBookIntelligencePromptBlock,
  refineDetectedGenre,
} from "./detector";

import type { BookConfig } from "@/types/book";
import { buildBookIntelligenceSnapshot, detectBookIntelligence } from "./detector";
import type { BookIntelligenceSnapshot } from "./types";

/** Apply intelligence detection to config — surgical genre/subcategory correction */
export function applyBookIntelligenceToConfig(config: BookConfig): BookConfig {
  const report = detectBookIntelligence({
    idea: config.title,
    title: config.title,
    genre: config.genre,
    category: config.category,
    subcategory: config.subcategory,
    tone: config.tone,
  });

  const horticultureOverride =
    config.genre === "self-help" &&
    (report.layers.writingBrainId === "horticultural-guide-brain" ||
      report.layers.writingBrainId === "practical-manual-brain" ||
      report.layers.writingBrainId === "technical-manual-brain");

  const shouldCorrectGenre =
    report.confidence >= 0.65 &&
    report.resolvedGenre !== config.genre &&
    report.layers.writingBrainId !== "self-help-brain";

  const nextGenre = shouldCorrectGenre || horticultureOverride ? report.resolvedGenre : config.genre;

  return {
    ...config,
    genre: nextGenre,
    subcategory: report.subcategory || config.subcategory,
    tone: config.tone || report.tone,
    bookIntelligence: buildBookIntelligenceSnapshot({
      idea: config.title,
      title: config.title,
      genre: nextGenre,
      category: config.category,
      subcategory: report.subcategory || config.subcategory,
      tone: config.tone || report.tone,
    }),
  };
}

export function resolveBookIntelligenceFromConfig(
  config: BookConfig,
  lock?: BookIntelligenceSnapshot,
): BookIntelligenceSnapshot {
  if (lock) return lock;
  if (config.bookIntelligence) return config.bookIntelligence;
  return buildBookIntelligenceSnapshot({
    idea: config.title,
    title: config.title,
    genre: config.genre,
    category: config.category,
    subcategory: config.subcategory,
    tone: config.tone,
  });
}
