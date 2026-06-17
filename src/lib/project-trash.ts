import type { BookProject } from "@/types/book";
import { deleteProject as deleteLocal } from "@/lib/storage";
import { deleteProjectAsync, saveProjectAsync } from "@/services/storageService";
import { clearProjectSessionData } from "@/mobile/clearProjectSession";

const TRASH_KEY = "scriptora-project-trash-v1";
export const TRASH_RECOVERY_DAYS = 7;
const RECOVERY_MS = TRASH_RECOVERY_DAYS * 24 * 60 * 60 * 1000;

export type TrashEntry = {
  project: BookProject;
  deletedAt: string;
  archived?: boolean;
};

function readTrashRaw(): TrashEntry[] {
  try {
    const raw = localStorage.getItem(TRASH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TrashEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrash(entries: TrashEntry[]): void {
  try {
    if (entries.length === 0) localStorage.removeItem(TRASH_KEY);
    else localStorage.setItem(TRASH_KEY, JSON.stringify(entries));
  } catch {
    /* private mode */
  }
}

export function purgeExpiredTrash(): TrashEntry[] {
  const now = Date.now();
  const kept: TrashEntry[] = [];
  const expired: TrashEntry[] = [];
  for (const entry of readTrashRaw()) {
    const age = now - new Date(entry.deletedAt).getTime();
    if (age > RECOVERY_MS) expired.push(entry);
    else kept.push(entry);
  }
  writeTrash(kept);
  for (const entry of expired) {
    void deleteProjectAsync(entry.project.id).catch(() => {});
    clearProjectSessionData(entry.project.id);
  }
  return kept;
}

export function loadTrashEntries(): TrashEntry[] {
  return purgeExpiredTrash();
}

export function getTrashEntry(projectId: string): TrashEntry | null {
  return loadTrashEntries().find((e) => e.project.id === projectId) ?? null;
}

export async function softDeleteProjectAsync(
  project: BookProject,
  opts?: { archived?: boolean },
): Promise<void> {
  purgeExpiredTrash();
  const entries = readTrashRaw().filter((e) => e.project.id !== project.id);
  entries.unshift({
    project,
    deletedAt: new Date().toISOString(),
    archived: opts?.archived,
  });
  writeTrash(entries);
  deleteLocal(project.id);
  clearProjectSessionData(project.id);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("scriptora-projects-change"));
  }
}

export async function recoverProjectFromTrash(projectId: string): Promise<boolean> {
  const entries = loadTrashEntries();
  const entry = entries.find((e) => e.project.id === projectId);
  if (!entry) return false;
  writeTrash(entries.filter((e) => e.project.id !== projectId));
  await saveProjectAsync(entry.project);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("scriptora-projects-change"));
  }
  return true;
}

export async function permanentlyDeleteTrashEntry(projectId: string): Promise<void> {
  writeTrash(readTrashRaw().filter((e) => e.project.id !== projectId));
  await deleteProjectAsync(projectId);
  clearProjectSessionData(projectId);
}
