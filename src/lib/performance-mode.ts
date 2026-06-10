import { useEffect, useState } from "react";

export type VisualPerformancePreset = "premium" | "balanced" | "performance";

export const SCRIPTORA_PERFORMANCE_MODE_KEY = "scriptora-performance-mode";
export const SCRIPTORA_PERFORMANCE_MODE_EVENT = "scriptora-performance-mode-change";
export const SCRIPTORA_PERFORMANCE_HINT_DISMISSED_KEY = "scriptora-performance-hint-dismissed";
export const SCRIPTORA_OPEN_APPEARANCE_KEY = "scriptora-open-appearance";

export const VISUAL_PRESETS: VisualPerformancePreset[] = ["premium", "balanced", "performance"];

export function normalizeVisualPreset(raw: string | null): VisualPerformancePreset {
  if (raw === "premium" || raw === "balanced" || raw === "performance") return raw;
  if (raw === "true") return "performance";
  if (raw === "false") return "premium";
  return "premium";
}

export function loadVisualPreset(): VisualPerformancePreset {
  try {
    return normalizeVisualPreset(localStorage.getItem(SCRIPTORA_PERFORMANCE_MODE_KEY));
  } catch {
    return "premium";
  }
}

/** @deprecated Use loadVisualPreset — kept for callers expecting boolean turbo state */
export function loadPerformanceMode(): boolean {
  return loadVisualPreset() !== "premium";
}

export function applyVisualPreset(preset: VisualPerformancePreset = loadVisualPreset()): void {
  const root = document.documentElement;
  for (const p of VISUAL_PRESETS) root.classList.remove(`scriptora-visual-${p}`);
  root.classList.remove("scriptora-performance-mode", "scriptora-turbo-mode");

  root.classList.add(`scriptora-visual-${preset}`);

  if (preset === "balanced" || preset === "performance") {
    root.classList.add("scriptora-performance-mode");
  }
  if (preset === "performance") {
    root.classList.add("scriptora-turbo-mode");
  }
}

/** @deprecated Use applyVisualPreset */
export function applyPerformanceMode(enabled: boolean = loadPerformanceMode()): void {
  applyVisualPreset(enabled ? "performance" : "premium");
}

export function saveVisualPreset(preset: VisualPerformancePreset): void {
  try {
    localStorage.setItem(SCRIPTORA_PERFORMANCE_MODE_KEY, preset);
  } catch {
    /* ignore */
  }
  applyVisualPreset(preset);
  window.dispatchEvent(new Event(SCRIPTORA_PERFORMANCE_MODE_EVENT));
}

/** @deprecated Use saveVisualPreset */
export function savePerformanceMode(enabled: boolean): void {
  saveVisualPreset(enabled ? "performance" : "premium");
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

export function useVisualPreset(): VisualPerformancePreset {
  const [preset, setPreset] = useState(loadVisualPreset);

  useEffect(() => {
    const sync = () => setPreset(loadVisualPreset());
    window.addEventListener(SCRIPTORA_PERFORMANCE_MODE_EVENT, sync);
    return () => window.removeEventListener(SCRIPTORA_PERFORMANCE_MODE_EVENT, sync);
  }, []);

  return preset;
}

export function usePerformanceMode(): boolean {
  const preset = useVisualPreset();
  return preset !== "premium";
}

export function isLiteVisual(preset: VisualPerformancePreset = loadVisualPreset()): boolean {
  return preset !== "premium";
}

export function isTurboVisual(preset: VisualPerformancePreset = loadVisualPreset()): boolean {
  return preset === "performance";
}
