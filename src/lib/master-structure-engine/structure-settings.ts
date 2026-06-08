import type { BookBlueprint, BookConfig, Genre } from "@/types/book";
import { DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";

export type StructureMode =
  | "chapter_only"
  | "chapter_subchapter"
  | "scene_based"
  | "auto_intelligent";

export type SubchaptersPerChapterSetting = number | "auto";

export interface ProjectStructureSettings {
  structureMode: StructureMode;
  subchaptersEnabled: boolean;
  subchaptersPerChapter: SubchaptersPerChapterSetting;
}

import { autoSceneCountForGenre } from "./scene-planner";

const FICTION_SCENE_GENRES: Genre[] = [
  "horror",
  "thriller",
  "romance",
  "dark-romance",
  "fantasy",
  "sci-fi",
  "historical",
  "memoir",
  "fairy-tale",
];

const GENRE_AUTO_SUBCOUNTS: Partial<Record<Genre, number>> = {
  horror: 5,
  thriller: 5,
  "dark-romance": 4,
  romance: 4,
  fantasy: 4,
  "sci-fi": 4,
  "self-help": 4,
  business: 4,
  productivity: 4,
  memoir: 3,
  historical: 4,
};

export function resolveEffectiveStructureMode(config: BookConfig): StructureMode {
  const explicit = config.structureMode ?? inferStructureMode(config);
  if (explicit !== "auto_intelligent") return explicit;
  return FICTION_SCENE_GENRES.includes(config.genre) ? "scene_based" : "chapter_subchapter";
}

export function inferStructureMode(config: Pick<BookConfig, "subchaptersEnabled" | "structureMode">): StructureMode {
  if (config.structureMode) return config.structureMode;
  return config.subchaptersEnabled ? "chapter_subchapter" : "chapter_only";
}

export function normalizeStructureSettings(config: BookConfig): ProjectStructureSettings {
  const structureMode = inferStructureMode(config);
  const subchaptersEnabled =
    structureMode !== "chapter_only" &&
    (config.subchaptersEnabled ?? structureMode !== "chapter_only");
  const raw = config.subchaptersPerChapter;
  const subchaptersPerChapter: SubchaptersPerChapterSetting =
    raw === "auto" ? "auto" : Math.max(1, Math.min(8, Number(raw || DEFAULT_SUBCHAPTERS_PER_CHAPTER) || DEFAULT_SUBCHAPTERS_PER_CHAPTER));

  return { structureMode, subchaptersEnabled, subchaptersPerChapter };
}

export function autoSubchapterCountForGenre(genre: Genre): number {
  return GENRE_AUTO_SUBCOUNTS[genre] ?? DEFAULT_SUBCHAPTERS_PER_CHAPTER;
}

/** Effective subchapter count from project settings (ignores blueprint). */
export function resolveSubchapterCount(config: BookConfig): number {
  const settings = normalizeStructureSettings(config);
  const effectiveMode = resolveEffectiveStructureMode(config);
  if (!settings.subchaptersEnabled || effectiveMode === "chapter_only") return 0;

  if (settings.subchaptersPerChapter === "auto") {
    return effectiveMode === "scene_based"
      ? autoSceneCountForGenre(config.genre)
      : autoSubchapterCountForGenre(config.genre);
  }
  const raw = Number(settings.subchaptersPerChapter);
  return Math.max(1, Math.min(8, Number.isFinite(raw) ? Math.round(raw) : DEFAULT_SUBCHAPTERS_PER_CHAPTER));
}

export function blueprintPlansSubchapters(
  blueprint: BookBlueprint | null | undefined,
  config: BookConfig,
): boolean {
  if (resolveSubchapterCount(config) <= 0) return false;
  const outlines = blueprint?.chapterOutlines;
  if (!Array.isArray(outlines) || outlines.length === 0) return false;
  return outlines.some((o) => Array.isArray(o.subchapters) && o.subchapters.length > 0);
}

/** Only enforce subchapter content when blueprint actually planned them. */
export function shouldEnforceSubchapterContent(
  config: BookConfig,
  blueprint: BookBlueprint | null | undefined,
): boolean {
  return resolveSubchapterCount(config) > 0 && blueprintPlansSubchapters(blueprint, config);
}

export function getPlannedSubchapterCountForChapter(
  config: BookConfig,
  blueprint: BookBlueprint | null | undefined,
  chapterIndex: number,
): number {
  if (!shouldEnforceSubchapterContent(config, blueprint)) return 0;
  const outline = blueprint?.chapterOutlines?.[chapterIndex];
  const planned = outline?.subchapters?.length ?? 0;
  return planned > 0 ? planned : 0;
}

export function needsBlueprintSubchapterSync(
  config: BookConfig,
  blueprint: BookBlueprint | null | undefined,
): boolean {
  return resolveSubchapterCount(config) > 0 && !blueprintPlansSubchapters(blueprint, config);
}

export function applyStructureToConfig(config: BookConfig): BookConfig {
  const settings = normalizeStructureSettings(config);
  return {
    ...config,
    structureMode: settings.structureMode,
    subchaptersEnabled: settings.subchaptersEnabled,
    subchaptersPerChapter: settings.subchaptersPerChapter,
  };
}

export function structureModeFromSubchapterToggle(enabled: boolean, current?: StructureMode): StructureMode {
  if (!enabled) return "chapter_only";
  if (current && current !== "chapter_only") return current;
  return "chapter_subchapter";
}
