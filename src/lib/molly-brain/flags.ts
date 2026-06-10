const STORAGE_KEY = "scriptora-molly-brain-os";

/** Feature flag — set localStorage `scriptora-molly-brain-os` to `"0"` to disable. */
export function isMollyBrainOsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "0") return false;
  if (stored === "1") return true;
  return true;
}

export function setMollyBrainOsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new Event("scriptora-molly-brain-os-change"));
}
