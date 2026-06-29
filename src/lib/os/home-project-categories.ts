import type { BookProject } from "@/types/book";
import { getProjectContinuityStatus } from "@/lib/project-continuity";
import { loadTrashEntries } from "@/lib/project-trash";

export type HomeProjectCategory = "in_corso" | "pronti" | "pubblicati" | "archiviati";

export const HOME_PROJECT_CATEGORY_LABELS: Record<HomeProjectCategory, string> = {
  in_corso: "In corso",
  pronti: "Pronti",
  pubblicati: "Pubblicati",
  archiviati: "Archiviati",
};

export function categorizeHomeProjects(projects: BookProject[]): Record<HomeProjectCategory, BookProject[]> {
  const buckets: Record<HomeProjectCategory, BookProject[]> = {
    in_corso: [],
    pronti: [],
    pubblicati: [],
    archiviati: [],
  };

  for (const project of projects) {
    const status = getProjectContinuityStatus(project);
    if (status === "publishing_ready") buckets.pubblicati.push(project);
    else if (status === "manuscript_ready") buckets.pronti.push(project);
    else buckets.in_corso.push(project);
  }

  buckets.archiviati = loadTrashEntries()
    .filter((entry) => entry.archived)
    .map((entry) => entry.project);

  return buckets;
}

export function countHomeProjectsByCategory(projects: BookProject[]): Record<HomeProjectCategory, number> {
  const categorized = categorizeHomeProjects(projects);
  return {
    in_corso: categorized.in_corso.length,
    pronti: categorized.pronti.length,
    pubblicati: categorized.pubblicati.length,
    archiviati: categorized.archiviati.length,
  };
}

function cleanContent(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getActiveChapterLabel(project: BookProject | null | undefined): string {
  if (!project) return "—";
  const chapters = project.chapters || [];
  if (chapters.length === 0) {
    return project.blueprint ? "Blueprint pronto" : "Configurazione iniziale";
  }

  const inProgressIdx = chapters.findIndex((chapter) => cleanContent(chapter.content).length <= 80);
  if (inProgressIdx >= 0) {
    return chapters[inProgressIdx].title?.trim() || `Capitolo ${inProgressIdx + 1}`;
  }

  const written = chapters.filter((chapter) => cleanContent(chapter.content).length > 80).length;
  if (written >= chapters.length) return "Manoscritto completo";
  return `Capitolo ${written + 1}`;
}
