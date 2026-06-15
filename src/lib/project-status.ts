import { BookProject } from "@/types/book";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import { areChaptersComplete } from "@/lib/project-progress";

/**
 * Single source of truth for "is this project complete?"
 * Respects matterOptions — disabled front/back matter is not required.
 */
export function isProjectComplete(p: BookProject): boolean {
  if (!areChaptersComplete(p)) return false;
  if (isFrontMatterEnabled(p.config) && !p.frontMatter) return false;
  if (isBackMatterEnabled(p.config) && !p.backMatter) return false;
  return true;
}

/**
 * Returns a normalized copy of the project where `phase` is forced to
 * "complete" if `isProjectComplete` says so. Used when loading lists so the UI
 * stays consistent even if older rows weren't promoted.
 */
export function withNormalizedPhase(p: BookProject): BookProject {
  if (p.phase !== "complete" && isProjectComplete(p)) {
    return { ...p, phase: "complete" };
  }
  return p;
}
