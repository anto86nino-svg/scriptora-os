/** Clear session/local residues when deleting or archiving a project. */
export function clearProjectSessionData(projectId: string): void {
  try {
    const openId = sessionStorage.getItem("scriptora-open-project");
    if (openId === projectId) {
      sessionStorage.removeItem("scriptora-open-project");
      sessionStorage.removeItem("scriptora-open-section");
      sessionStorage.removeItem("scriptora-open-voice-studio");
    }
    const newBookRaw = sessionStorage.getItem("scriptora-new-book");
    if (newBookRaw) {
      try {
        const parsed = JSON.parse(newBookRaw);
        if (parsed?.projectId === projectId || parsed?.id === projectId) {
          sessionStorage.removeItem("scriptora-new-book");
        }
      } catch {
        /* ignore */
      }
    }
    localStorage.removeItem(`scriptora-cover-${projectId}`);
    localStorage.removeItem(`scriptora-project-scroll-${projectId}`);
  } catch {
    /* private mode */
  }
}

export function saveWriterScrollPosition(projectId: string, scrollY: number): void {
  try {
    sessionStorage.setItem(`scriptora-writer-scroll-${projectId}`, String(Math.round(scrollY)));
  } catch {
    /* ignore */
  }
}

export function restoreWriterScrollPosition(projectId: string): void {
  try {
    const raw = sessionStorage.getItem(`scriptora-writer-scroll-${projectId}`);
    if (!raw) return;
    const y = parseInt(raw, 10);
    if (Number.isFinite(y)) {
      requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
    }
  } catch {
    /* ignore */
  }
}
