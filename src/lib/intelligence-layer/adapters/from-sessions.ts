import { getProjectCoverDataUrl } from "@/lib/cover-session";
import {
  loadKdpContextForRadar,
  loadTitleDominationState,
} from "@/lib/bestseller-radar/radar-adapters";
import type { BookProject } from "@/types/book";

export function hasProjectCover(project: BookProject | null): boolean {
  if (!project) return false;
  return Boolean(getProjectCoverDataUrl(project.id));
}

export function readKdpSession(project?: BookProject | null) {
  return loadKdpContextForRadar(project ?? null);
}

export function readTitleDominationSession() {
  return loadTitleDominationState();
}
