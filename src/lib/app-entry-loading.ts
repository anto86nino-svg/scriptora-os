const PENDING_KEY = "scriptora:entry-loading";
const DONE_KEY = "scriptora:entry-loading-done";

/** Mark that the premium entry experience should play before revealing the app. */
export function requestAppEntryLoading(): void {
  try {
    sessionStorage.setItem(PENDING_KEY, "pending");
    sessionStorage.removeItem(DONE_KEY);
  } catch {
    /* quota / private mode */
  }
}

export function shouldPlayEntryLoading(): boolean {
  try {
    return sessionStorage.getItem(PENDING_KEY) === "pending" && !sessionStorage.getItem(DONE_KEY);
  } catch {
    return false;
  }
}

export function completeEntryLoading(): void {
  try {
    sessionStorage.setItem(DONE_KEY, "1");
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    /* noop */
  }
}

export const APP_ENTRY_MIN_MS = 6000;
export const APP_ENTRY_FAILOPEN_MS = 15000;
