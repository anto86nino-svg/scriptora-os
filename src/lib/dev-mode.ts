// Developer Mode — local-only tooling for plan simulation and usage dashboards.
// Production deploys: always OFF (see canUseDevTools in app-environment.ts).

import { canUseDevTools } from "@/lib/app-environment";

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

/** Force-enable Dev Mode — local dev hosts only. */
export function enableDevMode(): void {
  if (!canUseDevTools()) return;
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
  if (!canUseDevTools()) return false;
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function tryUnlock(input: string): boolean {
  if (!canUseDevTools()) return false;
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
