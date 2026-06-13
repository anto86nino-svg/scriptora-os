import { isExcellencePhaseActive } from "@/lib/generation-excellence-roadmap";

export type GreatnessMode = "off" | "passive" | "active";

export const GREATNESS_MODE_KEY = "scriptora-greatness-mode";
/** @deprecated Use GREATNESS_MODE_KEY */
export const LEGACY_GREATNESS_ENGINE_KEY = "scriptora-greatness-engine";

export function getGreatnessMode(): GreatnessMode {
  try {
    if (!isExcellencePhaseActive("greatness")) return "off";
    if (import.meta.env.VITE_SCRIPTORA_GREATNESS === "off") return "off";

    if (typeof window === "undefined") return "passive";

    const mode = localStorage.getItem(GREATNESS_MODE_KEY);
    if (mode === "off") return "off";
    if (mode === "active") return "active";
    if (mode === "passive") return "passive";

    const legacy = localStorage.getItem(LEGACY_GREATNESS_ENGINE_KEY);
    if (legacy === "off" || legacy === "false") return "off";
    if (legacy === "active") return "active";

    return "passive";
  } catch {
    return "passive";
  }
}

export function isGreatnessDiagnosticsEnabled(): boolean {
  return getGreatnessMode() !== "off";
}

export function isGreatnessPromptActive(): boolean {
  return getGreatnessMode() === "active";
}

export function setGreatnessMode(mode: GreatnessMode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GREATNESS_MODE_KEY, mode);
}
