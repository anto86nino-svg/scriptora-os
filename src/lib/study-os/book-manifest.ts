import type { StudySessionResult } from "@/lib/study-session";
import { createStudyChunkPlan, type StudyChunk } from "@/lib/study-os/chunk-planner";
import type { StudySourceType } from "@/lib/study-os/session-store";

export type StudyBookChunkStatus = "not_started" | "analyzing" | "ready" | "error";

export interface StudyBookChunkManifest {
  id: string;
  index: number;
  title: string;
  wordCount: number;
  contentPreview: string;
  kind: StudyChunk["kind"];
  storageKey: string;
  resultKey?: string;
  status: StudyBookChunkStatus;
  errorMessage?: string;
}

export interface StudyBookManifest {
  id: string;
  title: string;
  sourceName: string;
  sourceType: StudySourceType;
  totalWords: number;
  mode: "chapters" | "blocks" | "huge";
  createdAt: string;
  updatedAt: string;
  chunks: StudyBookChunkManifest[];
}

const INDEX_KEY = "scriptora-study-book-manifest-index-v1";
const CURRENT_MANIFEST_KEY = "scriptora-study-current-book-manifest-id-v1";
const CURRENT_CHUNK_KEY = "scriptora-study-current-book-chunk-id-v1";
const MANIFEST_PREFIX = "scriptora-study-book-manifest-";
const CHUNK_PREFIX = "scriptora-study-book-chunk-";
const RESULT_PREFIX = "scriptora-study-book-result-";
const MAX_MANIFESTS = 4;

function storage(): Storage | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

function uid(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function readJson<T>(key: string): T | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeItem(key: string, value: string): void {
  const store = storage();
  if (!store) throw new Error("Storage Study OS non disponibile.");
  store.setItem(key, value);
}

function manifestKey(id: string): string {
  return `${MANIFEST_PREFIX}${id}`;
}

function chunkKey(manifestId: string, chunkId: string): string {
  return `${CHUNK_PREFIX}${manifestId}-${chunkId}`;
}

function resultKey(manifestId: string, chunkId: string): string {
  return `${RESULT_PREFIX}${manifestId}-${chunkId}`;
}

function listKeysByPrefix(prefix: string): string[] {
  const store = storage();
  if (!store) return [];
  const keys: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

function getManifestIndex(): string[] {
  return readJson<string[]>(INDEX_KEY)?.filter(Boolean) || [];
}

function saveManifestIndex(ids: string[]): void {
  writeItem(INDEX_KEY, JSON.stringify([...new Set(ids)].slice(0, MAX_MANIFESTS)));
}

function cleanupManifest(id: string): void {
  const store = storage();
  if (!store) return;
  store.removeItem(manifestKey(id));
  listKeysByPrefix(`${CHUNK_PREFIX}${id}-`).forEach((key) => store.removeItem(key));
  listKeysByPrefix(`${RESULT_PREFIX}${id}-`).forEach((key) => store.removeItem(key));
}

function pruneOldManifests(keepId: string): void {
  const index = getManifestIndex();
  const keep = index.filter((id) => id === keepId || getStudyBookManifest(id)).slice(0, MAX_MANIFESTS);
  const overflow = index.filter((id) => id !== keepId && !keep.includes(id));
  overflow.forEach(cleanupManifest);
  saveManifestIndex(keep.includes(keepId) ? keep : [keepId, ...keep].slice(0, MAX_MANIFESTS));
}

function writeWithPrune(key: string, value: string, manifestId: string): void {
  try {
    writeItem(key, value);
  } catch (error) {
    pruneOldManifests(manifestId);
    try {
      writeItem(key, value);
    } catch {
      throw new Error("Spazio locale insufficiente per salvare questo libro. Rimuovi vecchie sessioni Study OS e riprova.");
    }
  }
}

function saveManifestOnly(manifest: StudyBookManifest): StudyBookManifest {
  const updated = { ...manifest, updatedAt: new Date().toISOString() };
  writeWithPrune(manifestKey(updated.id), JSON.stringify(updated), updated.id);
  saveManifestIndex([updated.id, ...getManifestIndex().filter((id) => id !== updated.id)]);
  writeItem(CURRENT_MANIFEST_KEY, updated.id);
  return updated;
}

export function getCurrentStudyBookManifestId(): string | null {
  const store = storage();
  return store?.getItem(CURRENT_MANIFEST_KEY) || null;
}

export function setCurrentStudyBookManifestId(id: string | null): void {
  const store = storage();
  if (!store) return;
  if (id) store.setItem(CURRENT_MANIFEST_KEY, id);
  else store.removeItem(CURRENT_MANIFEST_KEY);
}

export function getCurrentStudyBookChunkId(): string | null {
  const store = storage();
  return store?.getItem(CURRENT_CHUNK_KEY) || null;
}

export function setCurrentStudyBookChunkId(id: string | null): void {
  const store = storage();
  if (!store) return;
  if (id) store.setItem(CURRENT_CHUNK_KEY, id);
  else store.removeItem(CURRENT_CHUNK_KEY);
}

export function clearCurrentStudyBook(): void {
  setCurrentStudyBookManifestId(null);
  setCurrentStudyBookChunkId(null);
}

export function getStudyBookManifest(id: string): StudyBookManifest | null {
  return readJson<StudyBookManifest>(manifestKey(id));
}

export function buildStudyBookManifest(
  text: string,
  sourceName: string,
  sourceType: StudySourceType = "file",
): { manifest: StudyBookManifest; chunks: StudyChunk[] } | null {
  const plan = createStudyChunkPlan(text, sourceName);
  if (!plan.shouldUseChunks) return null;

  const id = uid("book");
  const now = new Date().toISOString();
  const manifest: StudyBookManifest = {
    id,
    title: sourceName.replace(/\.[a-z0-9]+$/i, "") || "Libro Study OS",
    sourceName,
    sourceType,
    totalWords: plan.totalWords,
    mode: plan.mode === "single" ? "blocks" : plan.mode,
    createdAt: now,
    updatedAt: now,
    chunks: plan.chunks.map((chunk) => ({
      id: chunk.id,
      index: chunk.index,
      title: chunk.title,
      wordCount: chunk.wordCount,
      contentPreview: chunk.contentPreview,
      kind: chunk.kind,
      storageKey: chunkKey(id, chunk.id),
      status: "not_started",
    })),
  };

  return { manifest, chunks: plan.chunks };
}

export function saveStudyBookManifestWithChunks(manifest: StudyBookManifest, chunks: StudyChunk[]): StudyBookManifest {
  const writtenKeys: string[] = [];
  try {
    chunks.forEach((chunk) => {
      const key = chunkKey(manifest.id, chunk.id);
      writeWithPrune(key, chunk.content, manifest.id);
      writtenKeys.push(key);
    });
    return saveManifestOnly(manifest);
  } catch (error) {
    const store = storage();
    writtenKeys.forEach((key) => store?.removeItem(key));
    cleanupManifest(manifest.id);
    throw error;
  }
}

export function createAndSaveStudyBookManifest(
  text: string,
  sourceName: string,
  sourceType: StudySourceType = "file",
): StudyBookManifest | null {
  const built = buildStudyBookManifest(text, sourceName, sourceType);
  if (!built) return null;
  return saveStudyBookManifestWithChunks(built.manifest, built.chunks);
}

export function readStudyBookChunkText(manifest: StudyBookManifest, chunkId: string): string {
  const chunk = manifest.chunks.find((item) => item.id === chunkId);
  if (!chunk) throw new Error("Sessione libro non trovata.");
  const text = storage()?.getItem(chunk.storageKey) || "";
  if (!text.trim()) throw new Error("Testo della sessione non disponibile. Ricarica il libro.");
  return text;
}

export function readStudyBookChunkResult(manifest: StudyBookManifest, chunkId: string): StudySessionResult | null {
  const chunk = manifest.chunks.find((item) => item.id === chunkId);
  if (!chunk?.resultKey) return null;
  return readJson<StudySessionResult>(chunk.resultKey);
}

export function updateStudyBookChunk(
  manifestId: string,
  chunkId: string,
  patch: Partial<Pick<StudyBookChunkManifest, "status" | "resultKey" | "errorMessage">>,
): StudyBookManifest | null {
  const manifest = getStudyBookManifest(manifestId);
  if (!manifest) return null;
  const next: StudyBookManifest = {
    ...manifest,
    chunks: manifest.chunks.map((chunk) =>
      chunk.id === chunkId
        ? {
            ...chunk,
            ...patch,
            errorMessage: patch.status === "error" ? patch.errorMessage : patch.errorMessage || undefined,
          }
        : chunk,
    ),
  };
  return saveManifestOnly(next);
}

export function saveStudyBookChunkResult(
  manifestId: string,
  chunkId: string,
  result: StudySessionResult,
): StudyBookManifest | null {
  const key = resultKey(manifestId, chunkId);
  writeWithPrune(key, JSON.stringify(result), manifestId);
  return updateStudyBookChunk(manifestId, chunkId, {
    status: "ready",
    resultKey: key,
    errorMessage: undefined,
  });
}
