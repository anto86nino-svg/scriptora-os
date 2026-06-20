// Developer Mode — frontend-only gate for internal cost/token monitoring.
// NOTE: This is NOT real security. It's an obfuscated MVP gate.
// Real protection will come with backend auth later.

import { useEffect, useState } from "react";

export { isOwnerEmail, getOwnerEmails } from "@/lib/auth/owner";

const KEY = "scriptora_dev_mode";

// Obfuscated password ("Linkon86" base64'd, then reversed) — avoids plain-text grep.
const OBF = "=YDOu92aulGT".split("").reverse().join("");

/** Force-enable Dev Mode (used by owner auto-unlock). */
export function enableDevMode(): void {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* noop */ }
  window.dispatchEvent(new Event("scriptora-dev-mode-change"));
}

function expectedPassword(): string {
  try {
    return atob(OBF);
  } catch {
    return "";
  }
}

function envForcesDevMode(): boolean {
  try {
    const value = String(import.meta.env?.VITE_SCRIPTORA_DEV_MODE || "").toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  } catch {
    return false;
  }
}

export function isDevMode(): boolean {
  if (envForcesDevMode()) return true;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function tryUnlock(input: string): boolean {
  if (!input) return false;
  const ok = input === expectedPassword();
  if (ok) {
    try { sessionStorage.setItem(KEY, "1"); } catch { /* noop */ }
    window.dispatchEvent(new Event("scriptora-dev-mode-change"));
  }
  return ok;
}

export function exitDevMode(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
  window.dispatchEvent(new Event("scriptora-dev-mode-change"));
}

export function useDevMode(): boolean {
  const [on, setOn] = useState<boolean>(() => isDevMode());
  useEffect(() => {
    const sync = () => setOn(isDevMode());
    window.addEventListener("scriptora-dev-mode-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("scriptora-dev-mode-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}
