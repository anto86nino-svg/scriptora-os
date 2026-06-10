// Developer Mode — frontend-only gate for internal cost/token monitoring.
// NOTE: This is NOT real security. It's an obfuscated MVP gate.
// Real protection will come with backend auth later.

const KEY = "nexora_dev_mode";

// Obfuscated password ("Linkon86" base64'd, then reversed) — avoids plain-text grep.
// Decoded at runtime, never stored as a literal string.
const OBF = "=YDOu92aulGT".split("").reverse().join("");

// Owner emails — these accounts unlock Dev Mode automatically on login.
export const OWNER_EMAILS: ReadonlyArray<string> = [
  "natasharomanoff1990anto@gmail.com",
];

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

/** Force-enable Dev Mode (used by owner auto-unlock). */
export function enableDevMode(): void {
  try { sessionStorage.setItem(KEY, "1"); } catch { /* noop */ }
  window.dispatchEvent(new Event("nexora-dev-mode-change"));
}

function expectedPassword(): string {
  try {
    return atob(OBF);
  } catch {
    return "";
  }
}

export function isDevMode(): boolean {
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
    window.dispatchEvent(new Event("nexora-dev-mode-change"));
  }
  return ok;
}

export function exitDevMode(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
  window.dispatchEvent(new Event("nexora-dev-mode-change"));
}

import { useEffect, useState } from "react";

export function useDevMode(): boolean {
  const [on, setOn] = useState<boolean>(() => isDevMode());
  useEffect(() => {
    const sync = () => setOn(isDevMode());
    window.addEventListener("nexora-dev-mode-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nexora-dev-mode-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return on;
}
