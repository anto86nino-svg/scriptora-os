const COVER_KEY_PREFIX = "scriptora-project-cover:";

function storageKey(projectId: string): string {
  return `${COVER_KEY_PREFIX}${projectId}`;
}

export function getProjectCoverDataUrl(projectId: string): string | null {
  if (!projectId) return null;
  try {
    const fromLocal = localStorage.getItem(storageKey(projectId));
    if (fromLocal) return fromLocal;
    const fromSession = sessionStorage.getItem(storageKey(projectId));
    if (fromSession) {
      try {
        localStorage.setItem(storageKey(projectId), fromSession);
      } catch {
        /* quota — session copy still readable this tab */
      }
      return fromSession;
    }
  } catch {
    return null;
  }
  return null;
}

export function setProjectCoverDataUrl(projectId: string, dataUrl: string): void {
  if (!projectId || !dataUrl) return;
  try {
    localStorage.setItem(storageKey(projectId), dataUrl);
  } catch {
    /* quota — fall back to session for this tab */
  }
  try {
    sessionStorage.setItem(storageKey(projectId), dataUrl);
  } catch {
    /* session quota */
  }
}

export function hasProjectCover(projectId: string): boolean {
  return !!getProjectCoverDataUrl(projectId);
}

export function loadProjectCoverMap(projectIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of projectIds) {
    const url = getProjectCoverDataUrl(id);
    if (url) map[id] = url;
  }
  return map;
}
