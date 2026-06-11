import { BookProject } from "@/types/book";
import LZString from "lz-string";

const STORAGE_KEY = "scriptora-projects";
const STORAGE_KEY_LZ = "scriptora-projects-lz";
const BACKUP_KEY = "scriptora-projects-backup";
const LAST_PROJECT_KEY = "scriptora-last-project";

// =====================================================================
// IndexedDB fallback (for projects too large for localStorage)
// =====================================================================
const IDB_NAME = "scriptora-db";
const IDB_STORE = "projects";

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPutAll(projects: BookProject[]): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      for (const p of projects) store.put(p);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
  db.close();
}

async function idbGetAll(): Promise<BookProject[]> {
  const db = await openDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const req = store.getAll();
      req.onsuccess = () => { resolve((req.result || []) as BookProject[]); db.close(); };
      req.onerror = () => { resolve([]); db.close(); };
    } catch { resolve([]); }
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch { resolve(); }
  });
  db.close();
}

// In-memory cache for sync API while IDB loads
let memCache: BookProject[] | null = null;

// =====================================================================
// Public sync API (kept for backwards compat — async layer underneath)
// =====================================================================

export function loadProjects(): BookProject[] {
  // 1. Memory cache (fastest)
  if (memCache) return memCache;

  // 2. Try compressed localStorage
  try {
    const lz = localStorage.getItem(STORAGE_KEY_LZ);
    if (lz) {
      const json = LZString.decompressFromUTF16(lz);
      if (json) {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memCache = parsed;
          // Trigger async IDB hydration in background
          idbGetAll().then(idb => {
            if (idb.length > parsed.length) memCache = idb;
          }).catch(() => {});
          return parsed;
        }
      }
    }
  } catch { /* fallthrough */ }

  // 3. Try legacy uncompressed
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memCache = parsed;
        // Migrate to compressed
        try {
          const lz = LZString.compressToUTF16(data);
          localStorage.setItem(STORAGE_KEY_LZ, lz);
          localStorage.removeItem(STORAGE_KEY);
        } catch { /* keep legacy */ }
        return parsed;
      }
    }
  } catch { /* fallthrough */ }

  // 4. Backup
  try {
    const backup = localStorage.getItem(BACKUP_KEY);
    if (backup) {
      const parsed = JSON.parse(backup);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memCache = parsed;
        return parsed;
      }
    }
  } catch { /* noop */ }

  return [];
}

/**
 * Hydrate the in-memory cache from IndexedDB at app startup.
 * Call this once early (e.g. in main.tsx) so the sync loadProjects()
 * returns the full dataset even when localStorage was cleared/oversized.
 */
export async function hydrateFromIndexedDB(): Promise<void> {
  try {
    const idb = await idbGetAll();
    if (idb.length > 0) {
      const ls = memCache || [];
      // Merge: prefer the most recently updated version per id
      const map = new Map<string, BookProject>();
      for (const p of ls) map.set(p.id, p);
      for (const p of idb) {
        const ex = map.get(p.id);
        if (!ex || (p.updatedAt && (!ex.updatedAt || p.updatedAt > ex.updatedAt))) {
          map.set(p.id, p);
        }
      }
      memCache = Array.from(map.values());
    }
  } catch { /* ignore */ }
}

function tryWriteCompressed(projects: BookProject[]): boolean {
  try {
    const json = JSON.stringify(projects);
    const lz = LZString.compressToUTF16(json);
    localStorage.setItem(STORAGE_KEY_LZ, lz);
    return true;
  } catch (e) {
    console.warn("[storage] Compressed write failed, falling back to IndexedDB:", e);
    return false;
  }
}

export function saveProject(project: BookProject): void {
  const projects = loadProjects();
  const idx = projects.findIndex(p => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.push(project);

  if (projects.length === 0) return;
  memCache = projects;

  // Heavy work (LZString compress + localStorage.setItem of full list + IDB
  // write) is debounced & deferred to idle so streaming AI generation —
  // which calls saveProject() many times per chapter — never blocks the UI.
  // memCache is already updated synchronously above, so subsequent reads
  // from loadProjects() return the latest data immediately.
  setLastProjectId(project.id);
  schedulePersist();
}

// ---------------------------------------------------------------------------
// Debounced background persistence
// ---------------------------------------------------------------------------
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight = false;
const PERSIST_DEBOUNCE_MS = 600;

function persistNow() {
  if (persistInFlight || !memCache) return;
  persistInFlight = true;
  const projects = memCache;
  try {
    // Skip backup write during streaming — too costly to read+write the
    // entire compressed blob just to keep a stale copy.
    const ok = tryWriteCompressed(projects);
    if (!ok) {
      try {
        localStorage.removeItem(BACKUP_KEY);
        localStorage.removeItem(STORAGE_KEY);
      } catch { /* noop */ }
      tryWriteCompressed(projects);
    }
  } catch { /* IDB still mirrors below */ }
  // Mirror to IndexedDB (no quota issues, async).
  idbPutAll(projects).catch(() => {}).finally(() => {
    persistInFlight = false;
  });
}

function schedulePersist() {
  if (persistTimer) return;
  const idle = (cb: () => void) =>
    (window as any).requestIdleCallback
      ? (window as any).requestIdleCallback(cb, { timeout: 1500 })
      : setTimeout(cb, 0);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    idle(persistNow);
  }, PERSIST_DEBOUNCE_MS);
}

/** Force-flush pending writes (call before unload / navigation). */
export function flushPendingWrites(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistNow();
}

// Best-effort flush on tab close so no data is lost.
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    if (persistTimer || !persistInFlight) {
      try {
        if (memCache) tryWriteCompressed(memCache);
      } catch { /* noop */ }
    }
  });
}

export function deleteProject(id: string): void {
  const projects = loadProjects().filter(p => p.id !== id);
  memCache = projects;
  try {
    if (projects.length === 0) {
      localStorage.removeItem(STORAGE_KEY_LZ);
      localStorage.removeItem(STORAGE_KEY);
    } else {
      tryWriteCompressed(projects);
    }
  } catch { /* noop */ }
  idbDelete(id).catch(() => {});
  if (getLastProjectId() === id) {
    localStorage.removeItem(LAST_PROJECT_KEY);
  }
}

export function createProjectId(): string {
  return crypto.randomUUID();
}

export function getLastProjectId(): string | null {
  return localStorage.getItem(LAST_PROJECT_KEY);
}

export function setLastProjectId(id: string): void {
  try { localStorage.setItem(LAST_PROJECT_KEY, id); } catch { /* noop */ }
}
