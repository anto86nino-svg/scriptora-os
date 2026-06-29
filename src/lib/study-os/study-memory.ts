import type { SpacedFlashcard } from "@/lib/study-os/study-flashcards";

const IDB_NAME = "scriptora-study-os";
const IDB_VERSION = 1;
const STORE_PROGRESS = "study-progress";

/** In-memory fallback when IndexedDB is unavailable (SSR, tests). */
const memoryFallback = new Map<string, StudyMemorySnapshot>();

export interface StudyQuizAttempt {
  sessionId: string;
  questionIndex: number;
  question: string;
  correct: boolean;
  selectedIndex: number;
  correctIndex: number;
  topic?: string;
  attemptedAt: string;
}

export interface StudyOralScore {
  questionIndex: number;
  score: number;
  evaluatedAt: string;
}

export interface StudyMemorySnapshot {
  sessionId: string;
  subjectLabel: string;
  topicsStudied: string[];
  weakTopics: string[];
  strongTopics: string[];
  quizAttempts: StudyQuizAttempt[];
  recentQuizAccuracy: number;
  totalQuizAttempts: number;
  flashcardDeck?: SpacedFlashcard[];
  oralScores?: StudyOralScore[];
  lastStudiedAt: string;
}

export interface StudyMemoryAdaptation {
  weakTopics: string[];
  recentQuizAccuracy: number;
}

function openStudyMemoryDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
          db.createObjectStore(STORE_PROGRESS, { keyPath: "sessionId" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openStudyMemoryDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PROGRESS, mode);
      const store = tx.objectStore(STORE_PROGRESS);
      const req = fn(store);
      req.onsuccess = () => {
        resolve(req.result ?? null);
        db.close();
      };
      req.onerror = () => {
        resolve(null);
        db.close();
      };
    } catch {
      resolve(null);
      db.close();
    }
  });
}

function computeAccuracy(attempts: StudyQuizAttempt[]): number {
  if (!attempts.length) return 1;
  const recent = attempts.slice(-20);
  const correct = recent.filter((a) => a.correct).length;
  return correct / recent.length;
}

function deriveTopicBuckets(attempts: StudyQuizAttempt[]): { weak: string[]; strong: string[] } {
  const byTopic = new Map<string, { correct: number; total: number }>();

  for (const attempt of attempts) {
    const topic = attempt.topic?.trim() || "generale";
    const bucket = byTopic.get(topic) ?? { correct: 0, total: 0 };
    bucket.total += 1;
    if (attempt.correct) bucket.correct += 1;
    byTopic.set(topic, bucket);
  }

  const weak: string[] = [];
  const strong: string[] = [];

  for (const [topic, stats] of byTopic) {
    const rate = stats.correct / stats.total;
    if (stats.total >= 2 && rate < 0.5) weak.push(topic);
    if (stats.total >= 2 && rate >= 0.8) strong.push(topic);
  }

  return { weak, strong };
}

export async function loadStudyMemory(sessionId: string): Promise<StudyMemorySnapshot | null> {
  const fromIdb = await withStore<StudyMemorySnapshot>("readonly", (store) => store.get(sessionId));
  if (fromIdb) return fromIdb;
  return memoryFallback.get(sessionId) ?? null;
}

export async function saveStudyMemory(snapshot: StudyMemorySnapshot): Promise<void> {
  memoryFallback.set(snapshot.sessionId, snapshot);
  await withStore("readwrite", (store) => store.put(snapshot));
}

export async function recordQuizAttempt(
  sessionId: string,
  subjectLabel: string,
  attempt: Omit<StudyQuizAttempt, "sessionId" | "attemptedAt">,
): Promise<StudyMemorySnapshot> {
  const existing = (await loadStudyMemory(sessionId)) ?? {
    sessionId,
    subjectLabel,
    topicsStudied: [],
    weakTopics: [],
    strongTopics: [],
    quizAttempts: [],
    recentQuizAccuracy: 1,
    totalQuizAttempts: 0,
    lastStudiedAt: new Date().toISOString(),
  };

  const fullAttempt: StudyQuizAttempt = {
    ...attempt,
    sessionId,
    attemptedAt: new Date().toISOString(),
  };

  const quizAttempts = [...existing.quizAttempts, fullAttempt].slice(-200);
  const topic = attempt.topic?.trim();
  const topicsStudied = topic
    ? Array.from(new Set([...existing.topicsStudied, topic]))
    : existing.topicsStudied;

  const { weak, strong } = deriveTopicBuckets(quizAttempts);
  const snapshot: StudyMemorySnapshot = {
    ...existing,
    subjectLabel,
    quizAttempts,
    topicsStudied,
    weakTopics: weak,
    strongTopics: strong,
    recentQuizAccuracy: computeAccuracy(quizAttempts),
    totalQuizAttempts: quizAttempts.length,
    lastStudiedAt: new Date().toISOString(),
  };

  await saveStudyMemory(snapshot);
  return snapshot;
}

export function getStudyMemoryAdaptation(snapshot: StudyMemorySnapshot | null): StudyMemoryAdaptation {
  if (!snapshot) return { weakTopics: [], recentQuizAccuracy: 1 };
  return {
    weakTopics: snapshot.weakTopics,
    recentQuizAccuracy: snapshot.recentQuizAccuracy,
  };
}

export async function listStudyMemorySessions(): Promise<StudyMemorySnapshot[]> {
  const rows = await withStore<StudyMemorySnapshot[]>("readonly", (store) => store.getAll());
  if (rows?.length) return rows;
  return Array.from(memoryFallback.values());
}

function emptyMemorySnapshot(sessionId: string, subjectLabel: string): StudyMemorySnapshot {
  return {
    sessionId,
    subjectLabel,
    topicsStudied: [],
    weakTopics: [],
    strongTopics: [],
    quizAttempts: [],
    recentQuizAccuracy: 1,
    totalQuizAttempts: 0,
    flashcardDeck: [],
    oralScores: [],
    lastStudiedAt: new Date().toISOString(),
  };
}

export async function saveFlashcardDeck(
  sessionId: string,
  subjectLabel: string,
  deck: SpacedFlashcard[],
): Promise<StudyMemorySnapshot> {
  const existing = (await loadStudyMemory(sessionId)) ?? emptyMemorySnapshot(sessionId, subjectLabel);
  const snapshot: StudyMemorySnapshot = {
    ...existing,
    flashcardDeck: deck,
    lastStudiedAt: new Date().toISOString(),
  };
  await saveStudyMemory(snapshot);
  return snapshot;
}

export async function recordOralEvaluation(
  sessionId: string,
  subjectLabel: string,
  evaluation: { questionIndex: number; score: number },
): Promise<StudyMemorySnapshot> {
  const existing = (await loadStudyMemory(sessionId)) ?? emptyMemorySnapshot(sessionId, subjectLabel);
  const oralScores = [
    ...(existing.oralScores ?? []).filter((item) => item.questionIndex !== evaluation.questionIndex),
    {
      questionIndex: evaluation.questionIndex,
      score: evaluation.score,
      evaluatedAt: new Date().toISOString(),
    },
  ].slice(-50);

  const snapshot: StudyMemorySnapshot = {
    ...existing,
    oralScores,
    lastStudiedAt: new Date().toISOString(),
  };
  await saveStudyMemory(snapshot);
  return snapshot;
}
