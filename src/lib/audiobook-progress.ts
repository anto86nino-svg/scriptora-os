export const AUDIOBOOK_PROGRESS_STORAGE_KEY = "scriptora-audiobook-progress-v1";

export interface AudiobookProgress {
  projectId: string;
  chapterIndex: number;
  sentenceIndex: number;
  progress: number;
  updatedAt: string;
}

function projectKey(projectId: string): string {
  return `${AUDIOBOOK_PROGRESS_STORAGE_KEY}:${projectId}`;
}

export function loadAudiobookProgress(projectId: string): AudiobookProgress | null {
  if (typeof window === "undefined" || !projectId) return null;
  try {
    const raw = localStorage.getItem(projectKey(projectId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AudiobookProgress;
    if (parsed?.projectId !== projectId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAudiobookProgress(progress: AudiobookProgress): void {
  if (typeof window === "undefined" || !progress.projectId) return;
  localStorage.setItem(
    projectKey(progress.projectId),
    JSON.stringify({
      ...progress,
      updatedAt: progress.updatedAt ?? new Date().toISOString(),
    }),
  );
}

export function clearAudiobookProgress(projectId: string): void {
  if (typeof window === "undefined" || !projectId) return;
  localStorage.removeItem(projectKey(projectId));
}
