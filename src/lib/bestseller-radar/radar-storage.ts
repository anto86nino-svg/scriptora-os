import type { BestsellerRadarSnapshot } from "./types";

const STORAGE_PREFIX = "scriptora:bestseller-radar:";
const MAX_HISTORY = 12;

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}${projectId}`;
}

export function saveRadarSnapshot(snapshot: BestsellerRadarSnapshot): void {
  if (!snapshot.projectId) return;
  try {
    const existing = loadRadarHistory(snapshot.projectId);
    const next = [snapshot, ...existing.filter((s) => s.id !== snapshot.id)].slice(0, MAX_HISTORY);
    localStorage.setItem(storageKey(snapshot.projectId), JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function loadRadarHistory(projectId: string): BestsellerRadarSnapshot[] {
  if (!projectId) return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadLatestRadarSnapshot(projectId: string): BestsellerRadarSnapshot | null {
  const history = loadRadarHistory(projectId);
  return history[0] ?? null;
}

export function computeRadarDelta(
  currentOverall: number,
  previousOverall: number | null | undefined,
): number | null {
  if (previousOverall == null || !Number.isFinite(previousOverall)) return null;
  return Math.round(currentOverall - previousOverall);
}

export function clearRadarHistory(projectId: string): void {
  try {
    localStorage.removeItem(storageKey(projectId));
  } catch {
    /* ignore */
  }
}
