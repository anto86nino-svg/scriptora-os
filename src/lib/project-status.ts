import { BookProject } from "@/types/book";

/**
 * Single source of truth for "is this project complete?"
 *
 * A project is considered complete if EITHER:
 *  - phase === "complete" (explicitly marked by the engine)
 *  - it has reached its target chapter count (the front/back matter are optional
 *    and shouldn't keep a finished book stuck in "in progress" forever).
 *
 * This prevents desync between InProgressSection and LibrarySection where a
 * fully-written book stays visible as "in corso" because the final phase
 * transition never fired (user left the page, network blip, etc.).
 */
export function isProjectComplete(p: BookProject): boolean {
  if (p.phase === "complete") return true;
  const target = p.config?.numberOfChapters || 0;
  const done = (p.chapters || []).filter((c) => (c.content || "").trim().length > 50).length;
  if (target > 0 && done >= target) return true;
  return false;
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

/** Incomplete project the user is actively writing (last opened, not finished). */
export function isActiveWritingProject(
  p: BookProject,
  activeWritingId: string | null,
): boolean {
  if (!activeWritingId || p.id !== activeWritingId) return false;
  return !isProjectComplete(p);
}

/** Completed books plus paused drafts — everything except the active manuscript. */
export function isOnFinishShelf(
  p: BookProject,
  activeWritingId: string | null,
): boolean {
  if (isProjectComplete(p)) return true;
  if (!activeWritingId) return true;
  return p.id !== activeWritingId;
}
