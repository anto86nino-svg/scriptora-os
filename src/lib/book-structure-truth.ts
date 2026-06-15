import type { BookBlueprint, BookProject } from "@/types/book";
import { getSubchaptersPerChapter } from "@/types/book";

export interface BookStructureTruth {
  requiresSubchapters: boolean;
  subchaptersPerChapter: number;
  blueprintHasSubchapters: boolean;
  configRequestsSubchapters: boolean;
  reason: "active-blueprint-subchapters" | "active-blueprint-chapter-only" | "config-before-blueprint" | "chapter-only-config";
  diagnostics: string[];
}

type StructureProject = Pick<BookProject, "config" | "blueprint" | "chapters">;

export function getBlueprintSubchaptersPerChapter(blueprint: BookBlueprint | null | undefined): number {
  const outlines = blueprint?.chapterOutlines || [];
  return outlines.reduce((max, outline) => {
    const count = Array.isArray(outline?.subchapters) ? outline.subchapters.length : 0;
    return Math.max(max, count);
  }, 0);
}

export function getBookStructureTruth(project: Pick<BookProject, "config" | "blueprint">): BookStructureTruth {
  const configCount = getSubchaptersPerChapter(project.config);
  const blueprintCount = getBlueprintSubchaptersPerChapter(project.blueprint);
  const hasActiveBlueprint = Boolean(project.blueprint?.chapterOutlines?.length);
  const blueprintHasSubchapters = blueprintCount > 0;
  const configRequestsSubchapters = configCount > 0;

  if (hasActiveBlueprint) {
    const diagnostics = configRequestsSubchapters && !blueprintHasSubchapters
      ? ["Config legacy richiede sottocapitoli, ma il blueprint attivo e' chapter-only. Ignoro lo stato fantasma."]
      : [];

    return {
      requiresSubchapters: blueprintHasSubchapters,
      subchaptersPerChapter: blueprintHasSubchapters ? blueprintCount : 0,
      blueprintHasSubchapters,
      configRequestsSubchapters,
      reason: blueprintHasSubchapters ? "active-blueprint-subchapters" : "active-blueprint-chapter-only",
      diagnostics,
    };
  }

  return {
    requiresSubchapters: configRequestsSubchapters,
    subchaptersPerChapter: configRequestsSubchapters ? configCount : 0,
    blueprintHasSubchapters: false,
    configRequestsSubchapters,
    reason: configRequestsSubchapters ? "config-before-blueprint" : "chapter-only-config",
    diagnostics: [],
  };
}

export function getActiveSubchaptersPerChapter(project: Pick<BookProject, "config" | "blueprint">): number {
  return getBookStructureTruth(project).subchaptersPerChapter;
}

export function getMissingActiveSubchapterRefs(project: StructureProject): Array<{ chapterIndex: number; subIndex: number }> {
  const truth = getBookStructureTruth(project);
  if (!truth.requiresSubchapters || truth.subchaptersPerChapter <= 0) return [];

  const missing: Array<{ chapterIndex: number; subIndex: number }> = [];
  const totalChapters = Math.max(0, project.config?.numberOfChapters || 0);

  for (let chapterIndex = 0; chapterIndex < totalChapters; chapterIndex += 1) {
    const chapter = project.chapters?.[chapterIndex];
    if (!chapter?.content || chapter.content.trim().length <= 50) continue;

    for (let subIndex = 0; subIndex < truth.subchaptersPerChapter; subIndex += 1) {
      const sub = chapter.subchapters?.[subIndex];
      if (!sub?.content || sub.content.trim().length <= 50) {
        missing.push({ chapterIndex, subIndex });
      }
    }
  }

  return missing;
}
