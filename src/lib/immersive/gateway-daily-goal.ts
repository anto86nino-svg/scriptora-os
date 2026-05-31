const GOAL_KEY = "scriptora-daily-word-goal";
const PROGRESS_PREFIX = "scriptora-daily-words:";

export function resolveDailyWordGoal(targetWords: number): number {
  if (typeof window === "undefined") return 1200;
  try {
    const stored = localStorage.getItem(GOAL_KEY);
    if (stored) {
      const n = Number(stored);
      if (Number.isFinite(n) && n >= 200) return Math.round(n);
    }
  } catch {
    /* ignore */
  }
  if (targetWords > 0) {
    return Math.max(400, Math.min(2500, Math.round(targetWords / 45)));
  }
  return 1200;
}

export function getTodayProgressKey(): string {
  return `${PROGRESS_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

export function loadTodayWordProgress(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(getTodayProgressKey());
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  } catch {
    return 0;
  }
}

export function recordDailyWords(delta: number): void {
  if (typeof window === "undefined" || delta <= 0) return;
  try {
    const key = getTodayProgressKey();
    const current = loadTodayWordProgress();
    localStorage.setItem(key, String(current + delta));
  } catch {
    /* ignore */
  }
}

export function dailyGoalProgress(goal: number): { current: number; goal: number; percent: number } {
  const current = loadTodayWordProgress();
  const safeGoal = Math.max(1, goal);
  return {
    current,
    goal: safeGoal,
    percent: Math.min(100, Math.round((current / safeGoal) * 100)),
  };
}
