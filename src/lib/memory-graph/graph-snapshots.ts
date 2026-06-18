import type { MemoryGraphSnapshot } from "./types";

export type MemoryGraphStoredSnapshot = {
  snapshotId: string;
  projectId: string;
  timestamp: string;
  reason: MemoryGraphSnapshotReason;
  snapshot: MemoryGraphSnapshot;
};

export type MemoryGraphSnapshotReason =
  | "forge"
  | "blueprint"
  | "writer"
  | "rewrite"
  | "diagnostics"
  | "export"
  | "chapter_checkpoint"
  | "manual";

const MAX_SNAPSHOTS_PER_PROJECT = 24;

function storageKey(projectId: string): string {
  return `scriptora-memory-graph-snapshots:${projectId}`;
}

export function createMemoryGraphSnapshotRecord(
  snapshot: MemoryGraphSnapshot,
  reason: MemoryGraphSnapshotReason,
): MemoryGraphStoredSnapshot {
  return {
    snapshotId: `mg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: snapshot.projectId,
    timestamp: new Date().toISOString(),
    reason,
    snapshot,
  };
}

/** @deprecated No production callers — recovery snapshots cover project state. */
export function saveMemoryGraphSnapshot(
  record: MemoryGraphStoredSnapshot,
): MemoryGraphStoredSnapshot {
  if (typeof localStorage === "undefined") return record;
  const key = storageKey(record.projectId);
  const existing = loadMemoryGraphSnapshots(record.projectId);
  const next = [record, ...existing].slice(0, MAX_SNAPSHOTS_PER_PROJECT);
  localStorage.setItem(key, JSON.stringify(next));
  return record;
}

export function loadMemoryGraphSnapshots(projectId: string): MemoryGraphStoredSnapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MemoryGraphStoredSnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLatestMemoryGraphSnapshot(
  projectId: string,
): MemoryGraphStoredSnapshot | null {
  return loadMemoryGraphSnapshots(projectId)[0] ?? null;
}
