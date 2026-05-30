import { BookProject } from "@/types/book";
import { supabase } from "@/integrations/supabase/client";
import {
  loadProjects as loadLocal,
  saveProject as saveLocal,
  deleteProject as deleteLocal,
  getLastProjectId,
  setLastProjectId,
  createProjectId,
} from "@/lib/storage";
import { withNormalizedPhase, isProjectComplete } from "@/lib/project-status";
import { isDevMode } from "@/lib/dev-mode";
import { getDevPlanOverride } from "@/lib/dev-plan-override";
import { hasProjectsCloud } from "@/lib/supabase-cloud-capabilities";

// Three environments:
//  - DEV MODE        → Premium tier uses the REAL Supabase user.id (so the owner's
//                      books stay tied to the Google account and sync to the cloud).
//                      Free / Beta / Pro tiers use "local-user-<tier>" sandboxes
//                      that can be wiped by the Trash button without ever touching
//                      the owner's real library.
//  - AUTHENTICATED   → real Supabase user.id (uuid)
//  - ANONYMOUS       → "public-user" (landing/pricing only)
function getRealAuthUserId(): string | null {
  try {
    // Derive the auth-token storage key dynamically from the configured Supabase
    // project ref so this works in Lovable preview AND after export to any other
    // Supabase project (e.g. self-hosted on lesxmntzrwjaooacvpko).
    const projectRef =
      (import.meta as any)?.env?.VITE_SUPABASE_PROJECT_ID ||
      (() => {
        try {
          const url = (import.meta as any)?.env?.VITE_SUPABASE_URL || "";
          const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
          return m?.[1] || "";
        } catch { return ""; }
      })();
    const candidates: string[] = [];
    if (projectRef) candidates.push(`sb-${projectRef}-auth-token`);
    // Fallback: scan any sb-*-auth-token key (covers edge cases / migrations).
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-.+-auth-token$/.test(k) && !candidates.includes(k)) {
          candidates.push(k);
        }
      }
    } catch { /* noop */ }
    for (const key of candidates) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const uid = parsed?.user?.id || parsed?.currentSession?.user?.id;
      if (uid) return uid;
    }
  } catch { /* noop */ }
  return null;
}

export function getCurrentUserId(): string {
  if (isDevMode()) {
    const tier = getDevPlanOverride();
    // Premium in Dev Mode = owner's real work → bind to the real account so
    // it survives logout/login and syncs to Supabase like a normal user.
    if (tier === "premium") {
      const realUid = getRealAuthUserId();
      if (realUid) return realUid;
    }
    return `local-user-${tier}`;
  }
  return getRealAuthUserId() ?? "public-user";
}

async function getSessionUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || getRealAuthUserId();
  } catch {
    return getRealAuthUserId();
  }
}

async function getCloudWriteUserId(): Promise<string | null> {
  const realUid = await getSessionUserId();
  if (realUid) return realUid;

  // Current RLS allows anonymous dev rows to be read, but not written.
  // Without an authenticated Supabase session we keep local save instant and
  // mark cloud as pending instead of incorrectly calling it offline.
  return null;
}

async function getCloudReadUserId(): Promise<string | null> {
  return (await getCloudWriteUserId()) || getCurrentUserId();
}

/** Returns true when current dev-mode tier is reserved for the owner's REAL projects. */
export function isProtectedDevTier(): boolean {
  return isDevMode() && getDevPlanOverride() === "premium";
}

/** Stable list of dev-mode userIds that should be wiped by "Reset profilo". Premium excluded. */
export const RESETTABLE_DEV_USER_IDS = [
  "local-user-free",
  "local-user-beta",
  "local-user-pro",
] as const;

/**
 * Load projects with an "instant local, async remote" strategy.
 *
 * If `onRemoteUpdate` is provided we return local data IMMEDIATELY and refresh
 * from Supabase in the background — this removes the perceptible delay on every
 * page that lists projects. Without the callback we keep the legacy await-remote
 * behaviour for compatibility.
 */
// ---------------------------------------------------------------------------
// Per-environment scoping for *local* storage too.
// Each project gets tagged with the userId that created it; we then filter by
// the active scope so DEV MODE and USER MODE never see each other's books.
// Legacy projects (no userId tag) are treated as DEV MODE assets — they were
// created by the owner before this split existed.
// ---------------------------------------------------------------------------
function scopeOf(p: BookProject): string {
  // Legacy projects without a userId predate the per-tier split.
  // They belong to the owner's REAL library → map to premium so the reset never touches them.
  return (p as any).userId || "local-user-premium";
}

function tagWithCurrentUser(p: BookProject): BookProject {
  if ((p as any).userId) return p;
  return { ...p, userId: getCurrentUserId() } as BookProject;
}

function loadLocalScoped(): BookProject[] {
  const uid = getCurrentUserId();
  return loadLocal().filter((p) => scopeOf(p) === uid);
}

export async function loadProjects(
  onRemoteUpdate?: (projects: BookProject[]) => void
): Promise<BookProject[]> {
  const local = loadLocalScoped().map(withNormalizedPhase);

  const refresh = async (): Promise<BookProject[]> => {
    try {
      const cloudUserId = await getCloudReadUserId();
      if (!cloudUserId) return local;
      if (!(await hasProjectsCloud())) return local;

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", cloudUserId)
        .order("updated_at", { ascending: false });

      if (error || !data || data.length === 0) return local;

      const raw = data.map((row: any) => row.data as BookProject);
      const projects = raw.map(withNormalizedPhase);

      // Persist auto-promoted phases (batch, fully async — never block).
      const toPersist = projects.filter((p, i) => raw[i].phase !== p.phase);
      if (toPersist.length > 0) {
        Promise.all(
          toPersist.map((p) =>
            supabase
              .from("projects")
              .update({ data: p as any, updated_at: new Date().toISOString() })
              .eq("id", p.id)
          )
        ).catch(() => {});
      }

      // Defer localStorage backup to idle so we don't jank the UI.
      const idle = (cb: () => void) =>
        (window as any).requestIdleCallback
          ? (window as any).requestIdleCallback(cb)
          : setTimeout(cb, 0);
      idle(() => {
        for (const p of projects) saveLocal(tagWithCurrentUser(p));
      });

      return projects;
    } catch {
      return local;
    }
  };

  if (onRemoteUpdate) {
    // Optimistic: return local now, push remote later only if it differs.
    refresh().then((remote) => {
      const changed =
        remote.length !== local.length ||
        remote.some(
          (p, i) => p.id !== local[i]?.id || (p as any).updatedAt !== (local[i] as any)?.updatedAt
        );
      if (changed) onRemoteUpdate(remote);
    });
    return local;
  }

  return refresh();
}

export { isProjectComplete };

export async function saveProjectAsync(
  project: BookProject,
  callbacks?: { onSaving?: () => void; onSaved?: () => void; onPending?: () => void; onOffline?: () => void }
): Promise<void> {
  // Always save locally first (instant, reliable)
  const tagged = tagWithCurrentUser(project);
  saveLocal(tagged);
  setLastProjectId(project.id);

  callbacks?.onSaving?.();

  try {
    const cloudUserId = await getCloudWriteUserId();
    if (!cloudUserId) {
      callbacks?.onPending?.();
      return;
    }
    if (!(await hasProjectsCloud())) {
      callbacks?.onPending?.();
      return;
    }

    const cloudProject = { ...project, userId: cloudUserId } as BookProject;
    const { error } = await supabase
      .from("projects")
      .upsert(
        {
          id: project.id,
          user_id: cloudUserId,
          title: project.config.title || "Untitled",
          data: cloudProject as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.warn("Supabase save failed, localStorage used:", error.message);
      if (typeof navigator !== "undefined" && navigator.onLine === false) callbacks?.onOffline?.();
      else callbacks?.onPending?.();
    } else {
      callbacks?.onSaved?.();
    }
  } catch {
    if (typeof navigator !== "undefined" && navigator.onLine === false) callbacks?.onOffline?.();
    else callbacks?.onPending?.();
  }
}

export async function deleteProjectAsync(id: string): Promise<void> {
  deleteLocal(id);

  try {
    const cloudUserId = await getCloudWriteUserId();
    if (!cloudUserId) return;
    if (!(await hasProjectsCloud())) return;
    await supabase.from("projects").delete().eq("id", id).eq("user_id", cloudUserId);
  } catch {
    // silent
  }
}

// Re-export sync helpers
export { getLastProjectId, setLastProjectId, createProjectId };
