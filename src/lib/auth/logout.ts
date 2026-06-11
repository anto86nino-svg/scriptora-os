import { supabase } from "@/integrations/supabase/client";
import { exitDevMode } from "@/lib/dev-mode";
import { clearDevPlanOverride } from "@/lib/dev-plan-override";
import { clearAuthSessionContext } from "./sessionContext";

export const SESSION_NAV_KEYS = [
  "scriptora-active-run",
  "scriptora-open-project",
  "scriptora-open-section",
  "scriptora-new-book",
] as const;

const SESSION_AUTH_KEYS = [
  "scriptora_dev_mode",
] as const;

const LOCAL_AUTH_CACHE_KEYS = [
  "scriptora-last-project",
  "scriptora_plan_cache_v1",
] as const;

export type LogoutResult =
  | { ok: true; alreadySignedOut?: boolean }
  | { ok: false; error: string };

function clearSessionNavigationState(): void {
  for (const key of SESSION_NAV_KEYS) {
    try { sessionStorage.removeItem(key); } catch { /* noop */ }
  }
  for (const key of SESSION_AUTH_KEYS) {
    try { sessionStorage.removeItem(key); } catch { /* noop */ }
  }
}

function clearLocalAuthCaches(): void {
  for (const key of LOCAL_AUTH_CACHE_KEYS) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  }
}

/**
 * Centralized logout — closes Supabase session and clears auth/dev navigation state.
 * Does NOT delete projects, per-user dev wallets, or ledger history.
 */
export async function performLogout(): Promise<LogoutResult> {
  try {
    const { data } = await supabase.auth.getSession();
    const hadSession = Boolean(data.session);

    exitDevMode();
    clearDevPlanOverride();
    clearSessionNavigationState();
    clearLocalAuthCaches();
    clearAuthSessionContext();

    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      return { ok: false, error: error.message };
    }

    if (!hadSession) {
      return { ok: true, alreadySignedOut: true };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Logout non riuscito",
    };
  }
}
