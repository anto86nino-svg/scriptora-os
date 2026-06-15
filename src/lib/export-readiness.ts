import type { BookProject } from "@/types/book";
import { applyAuthorIdentityToConfig } from "@/lib/author-identity";
import { getBookStructureTruth, getMissingActiveSubchapterRefs } from "@/lib/book-structure-truth";
import { isProjectComplete } from "@/lib/project-status";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import { resolveExportAuthorName } from "@/lib/export-author";

export type ExportReadinessSeverity = "blocker" | "warning";

export interface ExportReadinessIssue {
  id: string;
  field: string;
  message: string;
  severity: ExportReadinessSeverity;
}

export class ExportBlockedError extends Error {
  readonly issues: ExportReadinessIssue[];

  constructor(issues: ExportReadinessIssue[]) {
    super(issues.map((issue) => issue.message).join(" · "));
    this.name = "ExportBlockedError";
    this.issues = issues;
  }
}

function isBlueprintUnreliable(project: BookProject): boolean {
  const outlines = project.blueprint?.chapterOutlines;
  if (!outlines?.length) return true;
  const weak = outlines.filter(
    (outline) =>
      !String(outline.summary || "").trim() ||
      outline.summary === "To be generated" ||
      String(outline.summary).length < 12,
  );
  return weak.length > Math.max(1, Math.floor(outlines.length * 0.5));
}

export function validateExportReadiness(project: BookProject): ExportReadinessIssue[] {
  const issues: ExportReadinessIssue[] = [];
  const config = applyAuthorIdentityToConfig({ ...project.config });
  const title = String(config.title || "").trim();
  const structure = getBookStructureTruth(project);
  const missingSubchapters = getMissingActiveSubchapterRefs(project);

  if (!title || title === "Senza titolo" || title === "Untitled") {
    issues.push({
      id: "title",
      field: "title",
      message: "Titolo del libro mancante.",
      severity: "blocker",
    });
  }

  if (!resolveExportAuthorName(config)) {
    issues.push({
      id: "author",
      field: "author",
      message: "Configura Identità Autore prima di esportare.",
      severity: "blocker",
    });
  }

  if (!project.blueprint) {
    issues.push({
      id: "blueprint",
      field: "blueprint",
      message: "Blueprint mancante — rigenera la struttura del libro.",
      severity: "blocker",
    });
  } else if (isBlueprintUnreliable(project)) {
    issues.push({
      id: "blueprint-quality",
      field: "blueprint",
      message: "Blueprint incompleto — rigenera la struttura prima di pubblicare.",
      severity: "blocker",
    });
  }

  if (!isProjectComplete(project)) {
    const missing: string[] = [];
    const target = project.config?.numberOfChapters || 0;
    const done = (project.chapters || []).filter((c) => (c.content || "").trim().length > 50).length;
    if (target > 0 && done < target) missing.push("capitoli");
    if (structure.requiresSubchapters && missingSubchapters.length > 0) missing.push("sottocapitoli");
    if (isFrontMatterEnabled(config) && !project.frontMatter) missing.push("front matter");
    if (isBackMatterEnabled(config) && !project.backMatter) missing.push("back matter");
    issues.push({
      id: missing.includes("sottocapitoli") ? "subchapters" : "chapters",
      field: missing.includes("sottocapitoli") ? "subchapters" : "chapters",
      message: missing.length
        ? `Completa prima: ${missing.join(", ")}.`
        : "Completa tutti i capitoli prima dell'export.",
      severity: "blocker",
    });
  }

  if (structure.diagnostics.length > 0) {
    issues.push({
      id: "structure-ghost-config",
      field: "structure",
      message: structure.diagnostics[0],
      severity: "warning",
    });
  }

  if (!String(config.language || "").trim()) {
    issues.push({
      id: "language",
      field: "language",
      message: "Lingua del libro non impostata.",
      severity: "warning",
    });
  }

  return issues;
}

export function getExportBlockers(project: BookProject): ExportReadinessIssue[] {
  return validateExportReadiness(project).filter((issue) => issue.severity === "blocker");
}

export function assertExportReady(project: BookProject): void {
  const blockers = getExportBlockers(project);
  if (blockers.length) throw new ExportBlockedError(blockers);
}
