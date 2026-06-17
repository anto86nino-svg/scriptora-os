/** Session context when opening Cover Studio from Writer / Export / Dashboard. */
export type CoverStudioContext = {
  returnTo: "writer" | "dashboard" | "export";
  projectId?: string;
  scrollY?: number;
  section?: string | null;
};

const KEY = "scriptora-cover-studio-context";

export function setCoverStudioContext(ctx: CoverStudioContext): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function readCoverStudioContext(): CoverStudioContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoverStudioContext;
  } catch {
    return null;
  }
}

export function clearCoverStudioContext(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
