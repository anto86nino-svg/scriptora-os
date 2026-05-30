export const AUTH_DEBUG_PREFIX = "[auth-debug]";
export const AUTH_DEBUG_ATTR = "data-scriptora-auth-debug";
export const AUTH_DEBUG_EVENT = "scriptora-auth-debug";

export type AuthDebugEntry = {
  at: string;
  href: string | null;
  label: string;
  details: Record<string, unknown> | null;
};

export function logAuthDebug(label: string, details?: Record<string, unknown>) {
  if (details === undefined) {
    console.log(AUTH_DEBUG_PREFIX, label);
  } else {
    console.log(AUTH_DEBUG_PREFIX, label, details);
  }
  appendAuthDebugTrace(label, details);
}

export function appendAuthDebugTrace(label: string, details?: Record<string, unknown>) {
  if (typeof document === "undefined") return;
  try {
    const previous = document.documentElement.getAttribute(AUTH_DEBUG_ATTR);
    const logs: AuthDebugEntry[] = previous ? JSON.parse(previous) : [];
    logs.push({
      at: new Date().toISOString(),
      href: typeof window !== "undefined" ? window.location.href : null,
      label,
      details: details ?? null,
    });
    document.documentElement.setAttribute(AUTH_DEBUG_ATTR, JSON.stringify(logs.slice(-80)));
    window.dispatchEvent(new Event(AUTH_DEBUG_EVENT));
  } catch {
    /* console is primary channel */
  }
}

export function readAuthDebugTrace(): AuthDebugEntry[] {
  if (typeof document === "undefined") return [];
  try {
    const raw = document.documentElement.getAttribute(AUTH_DEBUG_ATTR);
    return raw ? (JSON.parse(raw) as AuthDebugEntry[]) : [];
  } catch {
    return [];
  }
}

export function clearAuthDebugTrace() {
  if (typeof document === "undefined") return;
  try {
    document.documentElement.removeAttribute(AUTH_DEBUG_ATTR);
    window.dispatchEvent(new Event(AUTH_DEBUG_EVENT));
  } catch {
    /* noop */
  }
}

export function hasOAuthCallbackInUrl(): boolean {
  if (typeof window === "undefined") return false;
  const href = window.location.href;
  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return (
    /[?&#](code|error|access_token)=/.test(`${search}${hash}`) ||
    href.includes("type=recovery") ||
    href.includes("provider=google")
  );
}

export function summarizeSession(
  session: { user?: { id?: string; email?: string | null } | null; expires_at?: number | null } | null | undefined,
) {
  return {
    hasSession: !!session,
    hasUser: !!session?.user,
    userId: session?.user?.id ?? null,
    email: session?.user?.email ?? null,
    expiresAt: session?.expires_at ?? null,
  };
}

export function summarizeAuthError(
  error: { name?: string; message?: string; status?: number; code?: string } | null | undefined,
) {
  if (!error) return null;
  return {
    name: error.name ?? null,
    message: error.message ?? null,
    status: error.status ?? null,
    code: error.code ?? null,
  };
}

export function getStorageDebugState() {
  if (typeof window === "undefined") {
    return {
      localStorageType: "server",
      sessionStorageType: "server",
      localStorageWorks: false,
      sessionStorageWorks: false,
      authFlow: "pkce",
    };
  }

  const state = {
    localStorageType: typeof window.localStorage,
    sessionStorageType: typeof window.sessionStorage,
    localStorageWorks: false,
    sessionStorageWorks: false,
    authFlow: "pkce",
  };

  try {
    const key = "scriptora-auth-storage-test";
    window.localStorage.setItem(key, "1");
    state.localStorageWorks = window.localStorage.getItem(key) === "1";
    window.localStorage.removeItem(key);
  } catch {
    state.localStorageWorks = false;
  }

  try {
    const key = "scriptora-auth-session-test";
    window.sessionStorage.setItem(key, "1");
    state.sessionStorageWorks = window.sessionStorage.getItem(key) === "1";
    window.sessionStorage.removeItem(key);
  } catch {
    state.sessionStorageWorks = false;
  }

  return state;
}
