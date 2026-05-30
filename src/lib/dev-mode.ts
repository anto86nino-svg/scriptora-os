// Developer Mode — owner account gets permanent dev access in production.
// Local-only: password unlock and logo tap (see canUseDevTools).

import { canUseDevTools } from "@/lib/app-environment";

const KEY = "nexora_dev_mode";
const OWNER_SESSION_KEY = "nexora_owner_session";

// Obfuscated password ("Linkon86" base64'd, then reversed) — local dev only.
const OBF = "=YDOu92aulGT".split("").reverse().join("");

/** Permanent application owner accounts — full access, auto dev mode on login. */
export const OWNER_EMAILS: ReadonlyArray<string> = [
  "natasharomanoff1990anto@gmail.com",
];

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}

export function markOwnerSession(): void {
  try { sessionStorage.setItem(OWNER_SESSION_KEY, "1"); } catch { /* noop */ }
}

export function clearOwnerSession(): void {
  try { sessionStorage.removeItem(OWNER_SESSION_KEY); } catch { /* noop */ }
}

export function hasOwnerSession(): boolean {
  try {
    return sessionStorage.getItem(OWNER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/** Activate dev mode flag (owner login or local dev unlock). */
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

/** True when dev flag is set and caller is owner (prod) or local dev host. */
export function isDevMode(): boolean {
  try {
    if (sessionStorage.getItem(KEY) !== "1") return false;
  } catch {
    return false;
  }
  if (canUseDevTools()) return true;
  return hasOwnerSession();
}

/** Password unlock — localhost / vite dev only. */
export function tryUnlock(input: string): boolean {
  if (!canUseDevTools()) return false;
  if (!input) return false;
  const ok = input === expectedPassword();
  if (ok) {
    enableDevMode();
  }
  return ok;
}

export function exitDevMode(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
  window.dispatchEvent(new Event("nexora-dev-mode-change"));
}

/** Owner login: dev mode + owner session + premium simulation. */
export function activateOwnerAccess(): void {
  markOwnerSession();
  enableDevMode();
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
