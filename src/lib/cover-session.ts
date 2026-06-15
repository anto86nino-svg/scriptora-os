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

export type CoverSaveResult = {
  ok: boolean;
  dataUrlSaved: boolean;
  compositionSaved: boolean;
  warning?: string;
  error?: string;
};

export function saveProjectCoverFull(
  projectId: string,
  dataUrl: string | null | undefined,
  compositionJson?: string,
): CoverSaveResult {
  if (!projectId) {
    return { ok: false, dataUrlSaved: false, compositionSaved: false, error: "Progetto non valido" };
  }

  let dataUrlSaved = false;
  let compositionSaved = false;
  let warning: string | undefined;
  let error: string | undefined;

  if (dataUrl?.startsWith("data:image")) {
    if (dataUrl.length > MAX_COVER_BYTES) {
      error = "Cover troppo pesante per il salvataggio locale. Riduci effetti o dimensioni.";
      return { ok: false, dataUrlSaved: false, compositionSaved: false, error };
    }
    dataUrlSaved = setProjectCoverDataUrl(projectId, dataUrl, compositionJson);
    compositionSaved = Boolean(compositionJson);
    if (!dataUrlSaved) {
      error = "Impossibile salvare l'anteprima cover. Spazio locale insufficiente.";
    }
  } else if (compositionJson) {
    compositionSaved = setProjectCoverComposition(projectId, compositionJson);
    warning = "Composizione salvata. L'anteprima verrà rigenerata al prossimo salvataggio.";
    dataUrlSaved = false;
  } else {
    error = "Nessuna cover da salvare.";
  }

  return {
    ok: dataUrlSaved || compositionSaved,
    dataUrlSaved,
    compositionSaved,
    warning,
    error,
  };
}

export function hasProjectCoverComposition(projectId: string): boolean {
  return Boolean(getProjectCoverComposition(projectId));
}

export function listProjectCoverUrls(): Record<string, string> {
  const store = readStore();
  return Object.fromEntries(
    Object.entries(store)
      .filter(([, entry]) => entry.dataUrl?.startsWith("data:image"))
      .map(([id, entry]) => [id, entry.dataUrl]),
  );
}
