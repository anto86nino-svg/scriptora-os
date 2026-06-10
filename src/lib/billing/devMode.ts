import { isDevMode as baseDevMode } from "@/lib/dev-mode";

const UNLIMITED_KEY = "scriptora-dev-unlimited-credits";

export function isDevUnlimitedCredits(): boolean {
  if (import.meta.env.VITE_DEV_UNLIMITED_CREDITS === "true") return true;
  try {
    return localStorage.getItem(UNLIMITED_KEY) === "true" && baseDevMode();
  } catch {
    return false;
  }
}

export function setDevUnlimitedCredits(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(UNLIMITED_KEY, "true");
  } else {
    localStorage.removeItem(UNLIMITED_KEY);
  }
  window.dispatchEvent(new Event("scriptora-credits-change"));
}

export function isDevMode(): boolean {
  return baseDevMode();
}

export function creditSimulationBadge(): string | null {
  if (!isDevMode()) return null;
  if (isDevUnlimitedCredits()) return "DEV · CREDITI ILLIMITATI";
  return "DEV · WALLET LOCALE";
}
