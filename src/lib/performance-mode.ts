import { useEffect, useState } from "react";

export const SCRIPTORA_PERFORMANCE_MODE_KEY = "scriptora-performance-mode";
export const SCRIPTORA_PERFORMANCE_MODE_EVENT = "scriptora-performance-mode-change";
export const SCRIPTORA_PERFORMANCE_HINT_DISMISSED_KEY = "scriptora-performance-hint-dismissed";
export const SCRIPTORA_OPEN_APPEARANCE_KEY = "scriptora-open-appearance";

export function loadPerformanceMode(): boolean {
  try {
    return localStorage.getItem(SCRIPTORA_PERFORMANCE_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function savePerformanceMode(enabled: boolean): void {
  try {
    localStorage.setItem(SCRIPTORA_PERFORMANCE_MODE_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
  applyPerformanceMode(enabled);
  window.dispatchEvent(new Event(SCRIPTORA_PERFORMANCE_MODE_EVENT));
}

export function applyPerformanceMode(enabled: boolean = loadPerformanceMode()): void {
  document.documentElement.classList.toggle("scriptora-performance-mode", enabled);
}

export function isPerformanceHintDismissed(): boolean {
  try {
    return localStorage.getItem(SCRIPTORA_PERFORMANCE_HINT_DISMISSED_KEY) === "true";
  } catch {
    return false;
  }
}

export function dismissPerformanceHint(): void {
  try {
    localStorage.setItem(SCRIPTORA_PERFORMANCE_HINT_DISMISSED_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function usePerformanceMode(): boolean {
  const [enabled, setEnabled] = useState(loadPerformanceMode);

  useEffect(() => {
    const sync = () => setEnabled(loadPerformanceMode());
    window.addEventListener(SCRIPTORA_PERFORMANCE_MODE_EVENT, sync);
    return () => window.removeEventListener(SCRIPTORA_PERFORMANCE_MODE_EVENT, sync);
  }, []);

  return enabled;
}
