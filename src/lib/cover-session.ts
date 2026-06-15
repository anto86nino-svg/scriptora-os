/**
 * Per-project cover persistence (localStorage).
 * Used by Cover Studio, Export, and gateway state.
 */

const STORAGE_KEY = "scriptora-project-covers-v1";
const MAX_COVER_BYTES = 900_000;

type CoverStore = Record<string, { dataUrl: string; savedAt: string; composition?: string }>;

function readStore(): CoverStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CoverStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CoverStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota — ignore */
  }
}

export function getProjectCoverDataUrl(projectId: string): string | null {
  if (!projectId) return null;
  return readStore()[projectId]?.dataUrl ?? null;
}

export function setProjectCoverDataUrl(projectId: string, dataUrl: string, compositionJson?: string): boolean {
  if (!projectId || !dataUrl?.startsWith("data:image")) return false;
  if (dataUrl.length > MAX_COVER_BYTES) return false;
  const store = readStore();
  store[projectId] = { dataUrl, savedAt: new Date().toISOString(), composition: compositionJson };
  writeStore(store);
  return true;
}

export function getProjectCoverComposition(projectId: string): string | null {
  if (!projectId) return null;
  return readStore()[projectId]?.composition ?? null;
}

export function setProjectCoverComposition(projectId: string, compositionJson: string): boolean {
  if (!projectId || !compositionJson) return false;
  const store = readStore();
  const entry = store[projectId];
  if (entry) {
    store[projectId] = { ...entry, composition: compositionJson, savedAt: new Date().toISOString() };
  } else {
    store[projectId] = { dataUrl: "", savedAt: new Date().toISOString(), composition: compositionJson };
  }
  writeStore(store);
  return true;
}

export function clearProjectCover(projectId: string): void {
  if (!projectId) return;
  const store = readStore();
  delete store[projectId];
  writeStore(store);
}

export function listProjectCoverUrls(): Record<string, string> {
  const store = readStore();
  return Object.fromEntries(
    Object.entries(store).map(([id, entry]) => [id, entry.dataUrl]),
  );
}
