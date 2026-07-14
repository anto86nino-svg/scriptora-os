const CHAPTER_KEY = "scriptora-romanziere-last-chapter";

export function getLastRomanziereChapter(projectId: string): number | null {
  try {
    const raw = sessionStorage.getItem(`${CHAPTER_KEY}:${projectId}`);
    if (raw == null) return null;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function setLastRomanziereChapter(projectId: string, index: number): void {
  try {
    sessionStorage.setItem(`${CHAPTER_KEY}:${projectId}`, String(Math.max(0, index)));
  } catch {
    // Session persistence is an enhancement; the writer must remain usable without it.
  }
}
