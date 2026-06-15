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

function readConfigText(project: Pick<BookProject, "config" | "blueprint">): string {
  const config: any = project.config || {};
  return [
    config.genre,
    config.category,
    config.bookType,
    config.bookTypeFamily,
    config.type,
    config.niche,
    config.marketCategory,
    config.structureMode,
    config.title,
    config.subtitle,
    project.blueprint?.genre,
    project.blueprint?.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function isStructuralSubchapterProject(project: Pick<BookProject, "config" | "blueprint">): boolean {
  const text = readConfigText(project);

  return /\b(nonfiction|non-fiction|manual|manuale|study|studio|educational|education|scolastico|scolastica|universitario|universitaria|didattico|didattica|business|self-help|self help|guide|guida|course|corso|textbook|workbook|saggio)\b/i.test(text);
}

export function isNarrativeFictionProject(project: Pick<BookProject, "config" | "blueprint">): boolean {
  const text = readConfigText(project);

  if (isStructuralSubchapterProject(project)) return false;

  return /\b(fiction|narrativa|romance|dark romance|thriller|fantasy|horror|crime|sci-fi|sci fi|giallo|noir|romanzo|racconto|novel|small town|memoir narrativo)\b/i.test(text);
}

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
  const narrativeFiction = isNarrativeFictionProject(project);

  if (hasActiveBlueprint) {
    const diagnostics: string[] = [];

    if (configRequestsSubchapters && !blueprintHasSubchapters) {
      diagnostics.push("Config legacy richiede sottocapitoli, ma il blueprint attivo è chapter-only. Ignoro lo stato fantasma.");
    }

    if (blueprintHasSubchapters && narrativeFiction) {
      diagnostics.push("Il blueprint contiene sottocapitoli, ma il libro è narrativa/fiction: export consentito come capitoli lineari.");
    }

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

export function shouldRequireStructuralSubchapters(project: Pick<BookProject, "config" | "blueprint">): boolean {
  const truth = getBookStructureTruth(project);

  if (!truth.requiresSubchapters || truth.subchaptersPerChapter <= 0) return false;
  if (isStructuralSubchapterProject(project)) return true;
  if (isNarrativeFictionProject(project)) return false;

  // Preserve the previous safe behavior for unknown/generic projects:
  // if an active blueprint explicitly declares subchapters and the project is not
  // recognized as narrative fiction, treat those subchapters as structurally required.
  return true;
}

export function getActiveSubchaptersPerChapter(project: Pick<BookProject, "config" | "blueprint">): number {
  return getBookStructureTruth(project).subchaptersPerChapter;
}

export function getMissingActiveSubchapterRefs(project: StructureProject): Array<{ chapterIndex: number; subIndex: number }> {
  const truth = getBookStructureTruth(project);

  if (!truth.requiresSubchapters || truth.subchaptersPerChapter <= 0) return [];
  if (!shouldRequireStructuralSubchapters(project)) return [];

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
