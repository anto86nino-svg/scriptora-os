import type { BookBlueprint, BookChapterOutline, BookConfig, BookSubchapterOutline } from "@/types/book";
import { deriveSubchapterTitle } from "@/lib/subchapter-titles";
import { enrichSubchapterOutline } from "./subchapter-metadata";
import {
  resolveEffectiveStructureMode,
  resolveSubchapterCount,
} from "./structure-settings";
import { isForbiddenSubchapterTitle } from "./subchapter-titles-guard";
import { planChapterScenes } from "./scene-planner";

function outlineNeedsStructureSync(
  outline: BookChapterOutline | undefined,
): boolean {
  const existing = outline?.subchapters ?? [];
  if (existing.length === 0) return true;
  return !existing.some((s) => s?.title && !isForbiddenSubchapterTitle(s.title));
}

export function chapterNeedsStructureSync(
  config: BookConfig,
  blueprint: BookBlueprint | null | undefined,
  chapterIndex: number,
): boolean {
  if (resolveSubchapterCount(config) <= 0) return false;
  return outlineNeedsStructureSync(blueprint?.chapterOutlines?.[chapterIndex]);
}

function planUnitsForChapter(
  outline: BookChapterOutline,
  chapterIndex: number,
  config: BookConfig,
): BookSubchapterOutline[] {
  const title = outline.title || `Chapter ${chapterIndex + 1}`;
  const summary = outline.summary || "";
  const count = resolveSubchapterCount(config);
  const mode = resolveEffectiveStructureMode(config);
  const existing = Array.isArray(outline.subchapters) ? outline.subchapters : [];

  if (mode === "scene_based") {
    const planned = planChapterScenes(title, summary, chapterIndex, count, config);
    return planned.map((scene, subIndex) => {
      const raw = existing[subIndex];
      if (raw?.title && !isForbiddenSubchapterTitle(raw.title)) {
        return { ...scene, ...raw, title: raw.title.trim() };
      }
      return scene;
    });
  }

  return Array.from({ length: count }, (_, subIndex) => {
    const raw = existing[subIndex];
    const subSummary = String(raw?.summary || "").trim();
    const fallbackTitle = deriveSubchapterTitle(title, summary, subIndex, subSummary, count, config.language);
    const resolvedTitle =
      raw?.title && !isForbiddenSubchapterTitle(raw.title) ? raw.title.trim() : fallbackTitle;
    const base = {
      title: resolvedTitle,
      summary: subSummary || `${summary} Develop this beat: ${resolvedTitle}.`,
      purpose: raw?.purpose,
      emotionalFunction: raw?.emotionalFunction,
      narrativeProgression: raw?.narrativeProgression,
      conflictProgression: raw?.conflictProgression,
      tensionProgression: raw?.tensionProgression,
    };
    return enrichSubchapterOutline(base, subIndex, count, config.genre);
  });
}

/** Sync blueprint structure for one chapter or the full book. */
export function ensureBlueprintStructure(
  blueprint: BookBlueprint,
  config: BookConfig,
  chapterIndex?: number,
): BookBlueprint {
  const count = resolveSubchapterCount(config);
  if (count <= 0) return blueprint;

  const outlines = [...(blueprint.chapterOutlines || [])];
  const indices =
    chapterIndex != null
      ? [chapterIndex]
      : Array.from({ length: Math.max(outlines.length, config.numberOfChapters) }, (_, i) => i);

  for (const i of indices) {
    const outline = outlines[i] || {
      title: `Chapter ${i + 1}`,
      summary: `Develop chapter ${i + 1}.`,
    };
    if (!outlineNeedsStructureSync(outline)) continue;
    outlines[i] = { ...outline, subchapters: planUnitsForChapter(outline, i, config) };
  }

  return { ...blueprint, chapterOutlines: outlines };
}

export function syncBlueprintSubchapterStructure(
  blueprint: BookBlueprint,
  config: BookConfig,
): BookBlueprint {
  return ensureBlueprintStructure(blueprint, config);
}
