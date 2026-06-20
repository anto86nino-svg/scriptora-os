import type { BookBlueprint, BookConfig, BookProject } from "@/types/book";
import { createProjectId } from "@/lib/storage";
import { isProjectUnlocked } from "@/lib/pay-per-project";
import { safeParseStorage } from "@/lib/user-friendly-error";

export type ProjectContinuityStatus =
  | "draft_config"
  | "blueprint_ready"
  | "writing_locked"
  | "writing_unlocked"
  | "writing_in_progress"
  | "manuscript_ready"
  | "publishing_ready";

export type ProjectLibraryFilter =
  | "all"
  | "blueprint_ready"
  | "writing_locked"
  | "writing_in_progress"
  | "manuscript_ready"
  | "publishing_ready";

export const FREE_BLUEPRINT_PREVIEW_LIMIT = 3;

export const BLUEPRINT_PREVIEW_LIMITS_BY_PLAN: Record<string, number> = {
  free: 3,
  starter: 12,
  pro_author: 30,
  studio: 100,
  publisher: 250,
  beta: 30,
  premium: 100,
};

export interface BlueprintPreviewGate {
  allowed: boolean;
  used: number;
  limit: number;
  message?: string;
}

export interface ProjectLibrarySummary {
  total: number;
  blueprintReady: number;
  writingLocked: number;
  writingUnlocked: number;
  writingInProgress: number;
  manuscriptReady: number;
  publishingReady: number;
}

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getProjectContinuityStatus(project: BookProject): ProjectContinuityStatus {
  if (project.phase === "complete") return "publishing_ready";
  const hasBlueprint = Boolean(project.blueprint?.chapterOutlines?.length);
  const written = project.chapters?.filter((chapter) => clean(chapter.content).length > 80).length || 0;
  const targetChapters =
    project.config.numberOfChapters ||
    project.blueprint?.chapterOutlines?.length ||
    project.chapters?.length ||
    1;
  if (written > 0) return written >= targetChapters ? "manuscript_ready" : "writing_in_progress";
  const metaStatus = clean((project as any).scriptoraProjectMeta?.status) as ProjectContinuityStatus;
  if (metaStatus && metaStatus !== "writing_in_progress" && metaStatus !== "manuscript_ready" && metaStatus !== "publishing_ready") {
    return metaStatus;
  }
  if (hasBlueprint && (project.blueprintApproved || isProjectUnlocked(project.id))) return "writing_unlocked";
  if (hasBlueprint) return "writing_locked";
  return "draft_config";
}

export function getProjectHumanStatus(project: BookProject): string {
  const status = getProjectContinuityStatus(project);
  const map: Record<ProjectContinuityStatus, string> = {
    draft_config: "Bozza iniziata",
    blueprint_ready: "Blueprint pronto",
    writing_locked: "Scrittura da sbloccare",
    writing_unlocked: "Scrittura sbloccata",
    writing_in_progress: "In scrittura",
    manuscript_ready: "Manoscritto pronto",
    publishing_ready: "Pronto per pubblicazione",
  };
  return map[status];
}

export function summarizeProjectLibrary(projects: BookProject[]): ProjectLibrarySummary {
  const summary: ProjectLibrarySummary = {
    total: projects.length,
    blueprintReady: 0,
    writingLocked: 0,
    writingUnlocked: 0,
    writingInProgress: 0,
    manuscriptReady: 0,
    publishingReady: 0,
  };
  for (const project of projects) {
    const status = getProjectContinuityStatus(project);
    if (status === "blueprint_ready") summary.blueprintReady += 1;
    if (status === "writing_locked") summary.writingLocked += 1;
    if (status === "writing_unlocked") summary.writingUnlocked += 1;
    if (status === "writing_in_progress") summary.writingInProgress += 1;
    if (status === "manuscript_ready") summary.manuscriptReady += 1;
    if (status === "publishing_ready") summary.publishingReady += 1;
  }
  return summary;
}

function updatedAtMs(project: BookProject): number {
  const parsed = Date.parse(project.updatedAt || project.createdAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function selectContinuityProject(
  projects: BookProject[],
  opts: { lastProjectId?: string | null; flowProjectId?: string | null } = {},
): BookProject | null {
  if (!Array.isArray(projects) || projects.length === 0) return null;

  const flowProject = opts.flowProjectId
    ? projects.find((project) => project.id === opts.flowProjectId)
    : null;
  if (flowProject) return flowProject;

  const lastProject = opts.lastProjectId
    ? projects.find((project) => project.id === opts.lastProjectId)
    : null;
  if (lastProject) return lastProject;

  return [...projects].sort((a, b) => updatedAtMs(b) - updatedAtMs(a))[0] || projects[0] || null;
}

export function filterProjectsByLibraryTab(projects: BookProject[], filter: ProjectLibraryFilter): BookProject[] {
  if (filter === "all") return projects;
  return projects.filter((project) => getProjectContinuityStatus(project) === filter);
}

export function formatProjectUpdatedAt(value?: string): string {
  if (!value) return "Aggiornato di recente";
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "Aggiornato di recente";
  const diffDays = Math.floor((Date.now() - time) / 86_400_000);
  if (diffDays <= 0) return "Aggiornato oggi";
  if (diffDays === 1) return "Aggiornato ieri";
  if (diffDays < 30) return `Aggiornato ${diffDays} giorni fa`;
  return new Date(time).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function getBlueprintPreviewUsage(projects: BookProject[]): number {
  return projects.filter((project) => {
    const meta = (project as any).scriptoraProjectMeta;
    return meta?.blueprintPreview === true || (project.blueprint?.chapterOutlines?.length && !project.blueprintApproved);
  }).length;
}

export function canGenerateBlueprintPreview(planId: string, projects: BookProject[]): BlueprintPreviewGate {
  const limit = BLUEPRINT_PREVIEW_LIMITS_BY_PLAN[planId] ?? BLUEPRINT_PREVIEW_LIMITS_BY_PLAN.free;
  const used = getBlueprintPreviewUsage(projects);
  const allowed = used < limit;
  return {
    allowed,
    used,
    limit,
    message: allowed
      ? undefined
      : `Hai già creato ${used} Blueprint Preview. Passa a un piano autore o sblocca il singolo progetto prima di generare altri Blueprint.`,
  };
}

export function buildBlueprintPreviewProject(input: {
  config: BookConfig;
  blueprint: BookBlueprint;
  projectId?: string | null;
  sourceTool?: string;
  planId?: string;
}): BookProject {
  const now = new Date().toISOString();
  const id = clean(input.projectId) || createProjectId();
  return {
    id,
    config: { ...input.config, configStatus: "validated" },
    blueprint: input.blueprint,
    frontMatter: null,
    chapters: [],
    backMatter: null,
    phase: "blueprint",
    blueprintApproved: false,
    blueprintStatus: "completed",
    blueprintSource: "ai",
    configStatus: "validated",
    createdAt: now,
    updatedAt: now,
    ...( {
      scriptoraProjectMeta: {
        sourceTool: input.sourceTool || "book-forge",
        status: "writing_locked",
        blueprintPreview: true,
        planId: input.planId || "free",
        createdAt: now,
        updatedAt: now,
      },
      writingUnlockStatus: "locked",
    } as any),
  };
}

export function markProjectWritingUnlocked(project: BookProject): BookProject {
  const now = new Date().toISOString();
  return {
    ...project,
    updatedAt: now,
    ...( {
      ...((project as any) || {}),
      writingUnlockStatus: "unlocked",
      scriptoraProjectMeta: {
        ...((project as any).scriptoraProjectMeta || {}),
        status: "writing_unlocked",
        updatedAt: now,
      },
    } as any),
  };
}

export function safeReadContinuityStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  return safeParseStorage<T>(localStorage.getItem(key), fallback);
}
