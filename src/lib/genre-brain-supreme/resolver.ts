import type { BookConfig } from "@/types/book";
import type { SupremeGenreId, SupremeGenreProfile } from "./types";
import { SUPREME_GENRE_PROFILES } from "./profiles";

export function resolveSupremeGenreId(genre?: string, subcategory?: string): SupremeGenreId {
  const g = String(genre || "").toLowerCase();
  const sub = String(subcategory || "").toLowerCase();
  const combined = `${g} ${sub}`;

  if (/dark-romance|dark romance/.test(combined)) return "dark-romance";
  if (/cozy|cosy/.test(combined)) return "cozy";
  if (/\b(ya|young adult|young-adult)\b/.test(combined)) return "young-adult";
  if (/romance/.test(combined)) return "romance";
  if (/thriller|suspense/.test(combined)) return "thriller";
  if (/mystery/.test(combined) && !/cozy/.test(combined)) return "mystery";
  if (/crime|mafia|noir/.test(combined)) return "crime";
  if (/fantasy|epic/.test(combined)) return "fantasy";
  if (/sci-fi|science fiction|scifi/.test(combined)) return "sci-fi";
  if (/horror/.test(combined)) return "horror";
  if (/self-help|self help|psychology|productivity|spirituality|memoir/.test(combined)) return "self-help";
  if (/business|finance|marketing/.test(combined)) return "business";

  return "default";
}

export function resolveSupremeGenreIdFromConfig(config?: Partial<BookConfig>): SupremeGenreId {
  const brainId = String(config?.bookIntelligence?.layers?.writingBrainId || "");
  if (/dark-romance|dark romance/.test(brainId)) return "dark-romance";
  if (/romance/.test(brainId)) return "romance";
  if (/thriller|psychological/.test(brainId)) return "thriller";
  if (/cozy/.test(brainId)) return "cozy";
  if (/ya|young/.test(brainId)) return "young-adult";
  if (/fantasy|epic/.test(brainId)) return "fantasy";
  if (/crime|mafia/.test(brainId)) return "crime";
  if (/mystery/.test(brainId)) return "mystery";
  if (/horror/.test(brainId)) return "horror";
  if (/sci-fi|scifi/.test(brainId)) return "sci-fi";
  if (/self-help|memoir|productivity/.test(brainId)) return "self-help";
  if (/business/.test(brainId)) return "business";

  return resolveSupremeGenreId(config?.genre, (config as { subcategory?: string })?.subcategory);
}

export function getSupremeGenreProfile(input: {
  genre?: string;
  subcategory?: string;
  config?: Partial<BookConfig>;
}): SupremeGenreProfile {
  const id = input.config
    ? resolveSupremeGenreIdFromConfig(input.config)
    : resolveSupremeGenreId(input.genre, input.subcategory);
  return SUPREME_GENRE_PROFILES[id] || SUPREME_GENRE_PROFILES.default;
}

/** @deprecated Use getSupremeGenreProfile — single source of truth for genre rules */
export const LEGACY_GENRE_SOURCES_SUPERSEDED = [
  "GenreBrain.ts standalone notes (merged into supreme)",
  "genre-intelligence.ts dos/donts (supreme rules take precedence in orchestrator)",
  "editorial-orchestrator intent-sheet genre duplication (reads supreme first)",
] as const;
