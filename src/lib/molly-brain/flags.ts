import { isMobileDevice } from "@/lib/mobile-performance";

const STORAGE_KEY = "scriptora-molly-brain-os";

/** Feature flag — explicit "1" enables; "0" disables; default off on mobile. */
export function isMollyBrainOsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "0") return false;
  if (stored === "1") return true;
  return !isMobileDevice();
}

export function setMollyBrainOsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new Event("scriptora-molly-brain-os-change"));
}
