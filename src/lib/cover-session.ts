const COVER_SESSION_PREFIX = "scriptora-project-cover:";

export function getProjectCoverDataUrl(projectId: string): string | null {
  if (!projectId) return null;
  try {
    return sessionStorage.getItem(`${COVER_SESSION_PREFIX}${projectId}`);
  } catch {
    return null;
  }
}

export function setProjectCoverDataUrl(projectId: string, dataUrl: string): void {
  if (!projectId || !dataUrl) return;
  try {
    sessionStorage.setItem(`${COVER_SESSION_PREFIX}${projectId}`, dataUrl);
  } catch {
    /* session quota — in-memory fallbacks still work in parent state */
  }
}

export function loadProjectCoverMap(projectIds: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const id of projectIds) {
    const url = getProjectCoverDataUrl(id);
    if (url) map[id] = url;
  }
  return map;
}
