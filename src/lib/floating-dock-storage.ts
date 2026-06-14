export type FloatingDockPosition = {
  left: number;
  top: number;
};

export type FloatingDockState = {
  collapsed: boolean;
  position: FloatingDockPosition | null;
};

const STORAGE_KEY = "scriptora-floating-dock-v1";

export function isMobileDockViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
}

export function defaultDockPosition(): FloatingDockPosition {
  if (typeof window === "undefined") return { left: 12, top: 72 };
  const safeTop = 12;
  const safeBottom = 80;
  if (isMobileDockViewport()) {
    return { left: 12, top: Math.max(safeTop, window.innerHeight - 220 - safeBottom) };
  }
  return {
    left: Math.max(12, window.innerWidth - 380),
    top: Math.max(safeTop, window.innerHeight - 120),
  };
}

export function loadFloatingDockState(): FloatingDockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { collapsed: isMobileDockViewport(), position: null };
    }
    const parsed = JSON.parse(raw) as FloatingDockState;
    return {
      collapsed: Boolean(parsed.collapsed),
      position: parsed.position ?? null,
    };
  } catch {
    return { collapsed: isMobileDockViewport(), position: null };
  }
}

export function saveFloatingDockState(state: FloatingDockState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function guideSessionDismissKey(route: string): string {
  return `scriptora-guide-session-dismiss:${route}`;
}

export function isGuideSessionDismissed(route: string): boolean {
  try {
    return sessionStorage.getItem(guideSessionDismissKey(route)) === "1";
  } catch {
    return false;
  }
}

export function dismissGuideForSession(route: string): void {
  try {
    sessionStorage.setItem(guideSessionDismissKey(route), "1");
  } catch {
    /* ignore */
  }
}

export function clampDockPosition(
  left: number,
  top: number,
  width: number,
  height: number,
): FloatingDockPosition {
  if (typeof window === "undefined") return { left, top };
  const pad = 12;
  const safeTop = 48;
  const safeBottom = 88;
  return {
    left: Math.max(pad, Math.min(left, window.innerWidth - width - pad)),
    top: Math.max(safeTop, Math.min(top, window.innerHeight - height - safeBottom)),
  };
}
