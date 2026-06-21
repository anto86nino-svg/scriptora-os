import type {
  LiteraryGenreIntent,
  StudyDifficultyLevel,
  StudyGoalIntent,
  StudyMaterialIntentType,
  StudySessionResult,
  StudySubjectIntent,
} from "@/lib/study-session";

export type StudySourceType = "paste" | "file" | "pdf" | "docx" | "txt" | "manual" | "image";
export type StudySessionStatus = "draft" | "analyzing" | "ready" | "error";

export interface StudyResultEnvelope {
  sourceHash: string;
  result: StudySessionResult;
  createdAt: string;
}

export interface StudySessionRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceType: StudySourceType;
  sourceName?: string;
  sourceHash: string;
  sourceText: string;
  sourceTextPreview?: string;
  sourceTextLength?: number;
  sourceTextStoredLength?: number;
  sourceTextTruncatedForStorage?: boolean;
  storageMode?: "full" | "preview" | "ultra-light";
  language: string;
  level?: string;
  objective?: string;
  studyMaterialType?: StudyMaterialIntentType;
  studySubject?: StudySubjectIntent;
  literaryGenre?: LiteraryGenreIntent;
  studyGoal?: StudyGoalIntent;
  difficultyLevel?: StudyDifficultyLevel;
  status: StudySessionStatus;
  results: {
    analysis?: StudyResultEnvelope;
  };
}

const INDEX_KEY = "scriptora-study-sessions-v2";
const CURRENT_KEY = "scriptora-study-current-session-id";
const LEGACY_KEY = "scriptora-study-session-v1";
const LEGACY_IMPORTED_KEY = "scriptora-study-legacy-imported-v1";
const SESSION_PREFIX = "scriptora-study-session-";

function nowIso(): string {
  return new Date().toISOString();
}

function safeUuid(): string {
  try {
    return (
typeof crypto !== "undefined" &&
typeof crypto.randomUUID === "function"
? crypto.randomUUID()
: `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
);
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function normalizeText(value: unknown): string {
  return String(value || "").replace(/\r\n?/g, "\n").trim();
}

function makeStorageSafeSourceText(text: string, mode: "full" | "preview" | "ultra-light" = "full"): string {
  const clean = normalizeText(text);
  if (mode === "full" && clean.length <= 50000) return clean;

  const head = mode === "ultra-light" ? 9000 : 20000;
  const tail = mode === "ultra-light" ? 3000 : 8000;

  if (clean.length <= head + tail + 500) return clean;

  return [
    clean.slice(0, head).trim(),
    "",
    `[...testo completo troppo lungo per lo storage locale: salvata anteprima. Caratteri originali: ${clean.length.toLocaleString("it-IT")}...]`,
    "",
    clean.slice(-tail).trim(),
  ].join("\n\n");
}

function prepareStudySessionForStorage(
  session: StudySessionRecord,
  mode: "full" | "preview" | "ultra-light" = "full",
): StudySessionRecord {
  const originalSourceText = normalizeText(session.sourceText || "");
  const safeSourceText = makeStorageSafeSourceText(originalSourceText, mode);
  const storageMode = safeSourceText.length < originalSourceText.length ? mode === "full" ? "preview" : mode : "full";

  return {
    ...session,
    sourceText: safeSourceText,
    sourceTextPreview: safeSourceText.slice(0, 4000),
    sourceTextLength: originalSourceText.length,
    sourceTextStoredLength: safeSourceText.length,
    sourceTextTruncatedForStorage: safeSourceText.length < originalSourceText.length,
    storageMode,
  };
}

function isQuotaExceededError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  const name = error instanceof DOMException ? error.name : "";
  return /QuotaExceededError|quota|exceeded/i.test(`${name} ${message}`);
}

function pruneOldStudySessionStorage(keepId?: string): void {
  try {
    const ids = readIndex().filter((id) => id && id !== keepId);
    ids.slice(6).forEach((id) => {
      localStorage.removeItem(`${SESSION_PREFIX}${id}`);
    });

    const allStudySessionKeys = Object.keys(localStorage)
      .filter((key) => key.startsWith(SESSION_PREFIX))
      .filter((key) => !keepId || key !== `${SESSION_PREFIX}${keepId}`);

    allStudySessionKeys.slice(8).forEach((key) => localStorage.removeItem(key));

    writeIndex(keepId ? [keepId, ...ids.slice(0, 5)] : ids.slice(0, 6));
  } catch {
    // Storage cleanup must never block Study OS.
  }
}

function forcePruneStudySessionStorage(keepId?: string): void {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(SESSION_PREFIX))
      .filter((key) => !keepId || key !== `${SESSION_PREFIX}${keepId}`)
      .forEach((key) => localStorage.removeItem(key));

    writeIndex(keepId ? [keepId] : []);
  } catch {
    // Last-resort cleanup must never throw.
  }
}

export function computeStudySourceHash(text: string, sourceName = ""): string {
  const normalized = `${sourceName.trim().toLowerCase()}\n${normalizeText(text).replace(/\s+/g, " ")}`;
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `study-${(hash >>> 0).toString(16).padStart(8, "0")}-${normalized.length}`;
}

export function detectStudySourceType(sourceName = "", explicit?: StudySourceType): StudySourceType {
  if (explicit) return explicit;
  const lower = sourceName.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "docx";
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown")) return "txt";
  if (/\.(png|jpe?g|webp|heic|heif)$/i.test(lower)) return "image";
  if (sourceName) return "file";
  return "paste";
}

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(Array.from(new Set(ids))));
}

function readSession(id: string): StudySessionRecord | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(`${SESSION_PREFIX}${id}`) || "null");
    if (!parsed?.id) return null;
    return {
      ...parsed,
      sourceText: parsed.sourceText || parsed.sourceTextPreview || "",
      sourceTextLength: parsed.sourceTextLength || String(parsed.sourceText || parsed.sourceTextPreview || "").length,
      sourceTextStoredLength: parsed.sourceTextStoredLength || String(parsed.sourceText || parsed.sourceTextPreview || "").length,
      sourceTextTruncatedForStorage: Boolean(parsed.sourceTextTruncatedForStorage),
      storageMode: parsed.storageMode || "full",
    } as StudySessionRecord;
  } catch {
    return null;
  }
}

function writeSession(session: StudySessionRecord): StudySessionRecord {
  let stored = prepareStudySessionForStorage(session, session.sourceText.length > 250000 ? "preview" : "full");
  let persisted = false;

  const tryPersist = (record: StudySessionRecord): boolean => {
    try {
      localStorage.setItem(`${SESSION_PREFIX}${record.id}`, JSON.stringify(record));
      return true;
    } catch {
      return false;
    }
  };

  persisted = tryPersist(stored);

  if (!persisted) {
    pruneOldStudySessionStorage(stored.id);
    stored = prepareStudySessionForStorage(session, "ultra-light");
    persisted = tryPersist(stored);
  }

  if (!persisted) {
    forcePruneStudySessionStorage(stored.id);
    stored = {
      ...prepareStudySessionForStorage(session, "ultra-light"),
      sourceText: "",
      sourceTextPreview: session.sourceText.slice(0, 1000),
      results: {},
      storageMode: "ultra-light",
      sourceTextTruncatedForStorage: true,
    };
    persisted = tryPersist(stored);
  }

  if (persisted) {
    writeIndex([stored.id, ...readIndex().filter((id) => id !== stored.id)].slice(0, 8));
    window.dispatchEvent(new Event("scriptora-study-sessions-change"));
    return stored;
  }

  // Never create ghost session ids in the index. Keep UI alive with in-memory record only.
  return {
    ...stored,
    status: "draft",
    sourceTextTruncatedForStorage: true,
    storageMode: "ultra-light",
  };
}

export function createEmptyStudySession(input: {
  language?: string;
  sourceName?: string;
  sourceText?: string;
  sourceType?: StudySourceType;
} = {}): StudySessionRecord {
  const sourceText = normalizeText(input.sourceText || "");
  const sourceName = input.sourceName || (sourceText ? "testo-incollato.txt" : "Nuova sessione");
  const createdAt = nowIso();
  return {
    id: `study-session-${safeUuid()}`,
    title: sourceName,
    createdAt,
    updatedAt: createdAt,
    sourceType: detectStudySourceType(sourceName, input.sourceType),
    sourceName,
    sourceHash: computeStudySourceHash(sourceText, sourceName),
    sourceText,
    sourceTextPreview: sourceText.slice(0, 4000),
    sourceTextLength: sourceText.length,
    sourceTextStoredLength: sourceText.length,
    sourceTextTruncatedForStorage: false,
    storageMode: "full",
    language: input.language || "Italian",
    status: sourceText ? "draft" : "draft",
    results: {},
  };
}

export function listStudySessions(): StudySessionRecord[] {
  return readIndex()
    .map(readSession)
    .filter(Boolean)
    .sort((a, b) => b!.updatedAt.localeCompare(a!.updatedAt)) as StudySessionRecord[];
}

export function getStudySession(id: string): StudySessionRecord | null {
  return readSession(id);
}

export function saveStudySession(session: StudySessionRecord): StudySessionRecord {
  return writeSession({ ...session, updatedAt: nowIso() });
}

export function deleteStudySession(id: string): void {
  localStorage.removeItem(`${SESSION_PREFIX}${id}`);
  writeIndex(readIndex().filter((item) => item !== id));
  if (localStorage.getItem(CURRENT_KEY) === id) localStorage.removeItem(CURRENT_KEY);
  window.dispatchEvent(new Event("scriptora-study-sessions-change"));
}

export function setCurrentStudySessionId(id: string | null): void {
  if (id) localStorage.setItem(CURRENT_KEY, id);
  else localStorage.removeItem(CURRENT_KEY);
}

export function getCurrentStudySessionId(): string | null {
  try {
    return localStorage.getItem(CURRENT_KEY);
  } catch {
    return null;
  }
}

export function attachStudyResult(
  session: StudySessionRecord,
  result: StudySessionResult,
): StudySessionRecord {
  const sourceHash = computeStudySourceHash(session.sourceText, session.sourceName || "");
  return saveStudySession({
    ...session,
    title: result.title || session.title,
    sourceHash,
    status: "ready",
    results: {
      ...session.results,
      analysis: {
        sourceHash,
        result,
        createdAt: nowIso(),
      },
    },
  });
}

export function updateStudySessionSource(
  session: StudySessionRecord,
  input: {
    sourceText: string;
    sourceName?: string;
    sourceType?: StudySourceType;
  },
): { session: StudySessionRecord; sourceChanged: boolean; previousHash: string } {
  const sourceText = normalizeText(input.sourceText);
  const sourceName = input.sourceName || session.sourceName || "testo-incollato.txt";
  const sourceHash = computeStudySourceHash(sourceText, sourceName);
  const sourceChanged = sourceHash !== session.sourceHash;
  return {
    previousHash: session.sourceHash,
    sourceChanged,
    session: {
      ...session,
      title: sourceName || session.title,
      sourceName,
      sourceType: detectStudySourceType(sourceName, input.sourceType),
      sourceText,
      sourceHash,
      status: sourceChanged ? "draft" : session.status,
      results: sourceChanged ? {} : session.results,
      updatedAt: nowIso(),
    },
  };
}

export function isStudyResultFresh(session: Pick<StudySessionRecord, "sourceHash">, envelope?: StudyResultEnvelope | null): boolean {
  return Boolean(envelope?.result && envelope.sourceHash === session.sourceHash);
}

export function getFreshStudyResult(session: StudySessionRecord): StudySessionResult | null {
  return isStudyResultFresh(session, session.results.analysis) ? session.results.analysis!.result : null;
}

export function migrateLegacyStudySession(): StudySessionRecord | null {
  try {
    if (localStorage.getItem(LEGACY_IMPORTED_KEY) === "1") return null;
    const parsed = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (!parsed?.result) {
      localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
      return null;
    }
    const sourceText = normalizeText(parsed.rawText || "");
    const sourceName = String(parsed.result?.sourceName || "Sessione precedente importata");
    const base = createEmptyStudySession({
      sourceText,
      sourceName,
      sourceType: detectStudySourceType(sourceName),
    });
    const imported = attachStudyResult(base, parsed.result);
    const labeled = writeSession({
      ...imported,
      title: `Sessione precedente importata — ${String(parsed.result?.title || sourceName)}`,
    });
    localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
    return labeled;
  } catch {
    try {
      localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
    } catch {
      /* ignore */
    }
    return null;
  }
}
