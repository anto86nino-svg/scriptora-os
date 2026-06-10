export const HUMAN_READER_PROGRESS_KEY = "scriptora-human-reader-progress-v1";

export interface HumanReaderProgress {
  projectId: string;
  chapterIndex: number;
  segmentIndex: number;
  progressPercent: number;
  readingMode: string;
  updatedAt: string;
}

function storageKey(projectId: string): string {
  return `${HUMAN_READER_PROGRESS_KEY}:${projectId}`;
}

export function loadHumanReaderProgress(projectId: string): HumanReaderProgress | null {
  if (typeof window === "undefined" || !projectId) return null;
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HumanReaderProgress;
    return parsed?.projectId === projectId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveHumanReaderProgress(progress: HumanReaderProgress): void {
  if (typeof window === "undefined" || !progress.projectId) return;
  localStorage.setItem(
    storageKey(progress.projectId),
    JSON.stringify({
      ...progress,
      updatedAt: progress.updatedAt ?? new Date().toISOString(),
    }),
  );
}

export function clearHumanReaderProgress(projectId: string): void {
  if (typeof window === "undefined" || !projectId) return;
  localStorage.removeItem(storageKey(projectId));
}
