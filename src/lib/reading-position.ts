import { mapSentenceToParagraph } from "@/lib/reading-session/paragraph-map";

export type ReadingPositionMode = "audio" | "reading";

export interface ReadingPosition {
  projectId: string;
  chapterId: string;
  chapterIndex: number;
  offset: number;
  paragraphIndex: number;
  sentenceIndex: number;
  progress: number;
  updatedAt: string;
  mode: ReadingPositionMode;
}

export function readingPositionStorageKey(projectId: string, chapterId: string): string {
  return `scriptora-reading-position:${projectId}:${chapterId}`;
}

export function chapterIdFromIndex(chapterIndex: number): string {
  return String(chapterIndex);
}

export function loadReadingPosition(
  projectId: string,
  chapterIndex: number,
): ReadingPosition | null {
  if (typeof window === "undefined" || !projectId) return null;
  const chapterId = chapterIdFromIndex(chapterIndex);
  const raw = localStorage.getItem(readingPositionStorageKey(projectId, chapterId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ReadingPosition;
    if (parsed?.projectId !== projectId || parsed.chapterIndex !== chapterIndex) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasReadingBookmark(position: ReadingPosition | null | undefined): boolean {
  if (!position) return false;
  return position.progress > 0 || position.sentenceIndex > 0;
}

/** Most recently saved bookmark for a project (any chapter). */
export function loadLatestReadingPosition(projectId: string): ReadingPosition | null {
  if (typeof window === "undefined" || !projectId) return null;
  const prefix = `scriptora-reading-position:${projectId}:`;
  let latest: ReadingPosition | null = null;

  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "") as ReadingPosition;
      if (parsed?.projectId !== projectId) continue;
      if (
        !latest
        || new Date(parsed.updatedAt).getTime() > new Date(latest.updatedAt).getTime()
      ) {
        latest = parsed;
      }
    } catch {
      /* ignore malformed entries */
    }
  }

  return latest;
}

export function saveReadingPosition(position: ReadingPosition): void {
  if (typeof window === "undefined" || !position.projectId) return;
  const payload: ReadingPosition = {
    ...position,
    chapterId: position.chapterId || chapterIdFromIndex(position.chapterIndex),
    updatedAt: position.updatedAt ?? new Date().toISOString(),
  };
  localStorage.setItem(
    readingPositionStorageKey(payload.projectId, payload.chapterId),
    JSON.stringify(payload),
  );
}

export function clearReadingPosition(projectId: string, chapterIndex: number): void {
  if (typeof window === "undefined" || !projectId) return;
  const chapterId = chapterIdFromIndex(chapterIndex);
  localStorage.removeItem(readingPositionStorageKey(projectId, chapterId));
}

export function buildReadingPosition(input: {
  projectId: string;
  chapterIndex: number;
  sentenceIndex: number;
  progress: number;
  chapterContent: string;
  sentences: string[];
  mode?: ReadingPositionMode;
}): ReadingPosition {
  const chapterId = chapterIdFromIndex(input.chapterIndex);
  const excerpt = input.sentences[input.sentenceIndex] || "";
  const paragraphIndex = mapSentenceToParagraph(
    input.chapterContent,
    input.sentenceIndex,
    excerpt,
  );

  return {
    projectId: input.projectId,
    chapterId,
    chapterIndex: input.chapterIndex,
    offset: input.sentenceIndex,
    paragraphIndex,
    sentenceIndex: input.sentenceIndex,
    progress: input.progress,
    updatedAt: new Date().toISOString(),
    mode: input.mode ?? "audio",
  };
}

let scheduledSaveTimer: number | null = null;
let pendingPosition: ReadingPosition | null = null;

export function scheduleSaveReadingPosition(position: ReadingPosition, delayMs = 3000): void {
  if (typeof window === "undefined") return;
  pendingPosition = position;
  if (scheduledSaveTimer != null) {
    window.clearTimeout(scheduledSaveTimer);
  }
  scheduledSaveTimer = window.setTimeout(() => {
    if (pendingPosition) saveReadingPosition(pendingPosition);
    pendingPosition = null;
    scheduledSaveTimer = null;
  }, delayMs);
}

export function flushReadingPosition(position?: ReadingPosition | null): void {
  if (typeof window === "undefined") return;
  if (scheduledSaveTimer != null) {
    window.clearTimeout(scheduledSaveTimer);
    scheduledSaveTimer = null;
  }
  const toSave = position ?? pendingPosition;
  if (toSave) saveReadingPosition(toSave);
  pendingPosition = null;
}

export function cancelScheduledReadingPositionSave(): void {
  if (typeof window === "undefined") return;
  if (scheduledSaveTimer != null) {
    window.clearTimeout(scheduledSaveTimer);
    scheduledSaveTimer = null;
  }
  pendingPosition = null;
}
