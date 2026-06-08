export {
  type StructureMode,
  type SubchaptersPerChapterSetting,
  type ProjectStructureSettings,
  inferStructureMode,
  normalizeStructureSettings,
  autoSubchapterCountForGenre,
  resolveSubchapterCount,
  blueprintPlansSubchapters,
  shouldEnforceSubchapterContent,
  getPlannedSubchapterCountForChapter,
  needsBlueprintSubchapterSync,
  resolveEffectiveStructureMode,
  applyStructureToConfig,
  structureModeFromSubchapterToggle,
} from "./structure-settings";

export {
  type SubchapterWordBudget,
  distributeChapterWords,
  getSubchapterWordBudget,
} from "./word-distribution";

export {
  type SubchapterNarrativeMeta,
  buildSubchapterMetadata,
  enrichSubchapterOutline,
  metadataToPromptBlock,
} from "./subchapter-metadata";

export { buildGenreMasterBlock } from "./genre-master";
export {
  ensureBlueprintStructure,
  syncBlueprintSubchapterStructure,
  chapterNeedsStructureSync,
} from "./ensure-blueprint-structure";
export { planChapterScenes, buildScenePlannerPromptBlock, autoSceneCountForGenre } from "./scene-planner";
export { isForbiddenSubchapterTitle, sanitizeSubchapterTitle } from "./subchapter-titles-guard";

export type SubchapterGenerationProgress = {
  chapterIndex: number;
  subIndex: number;
  totalSubs: number;
  title: string;
  status: "pending" | "generating" | "done";
};

import { resolveSubchapterCount } from "./structure-settings";

export function buildSubchapterProgressList(
  chapterIndex: number,
  blueprint: import("@/types/book").BookBlueprint | null | undefined,
  config: import("@/types/book").BookConfig,
  activeSubIndex?: number,
): SubchapterGenerationProgress[] {
  const outline = blueprint?.chapterOutlines?.[chapterIndex];
  const subs = outline?.subchapters ?? [];
  const total = subs.length || resolveSubchapterCount(config);
  if (total <= 0) return [];

  return Array.from({ length: total }, (_, subIndex) => {
    const title = subs[subIndex]?.title || `${chapterIndex + 1}.${subIndex + 1}`;
    let status: SubchapterGenerationProgress["status"] = "pending";
    if (activeSubIndex === subIndex) status = "generating";
    else if (activeSubIndex != null && subIndex < activeSubIndex) status = "done";
    return { chapterIndex, subIndex, totalSubs: total, title, status };
  });
}
