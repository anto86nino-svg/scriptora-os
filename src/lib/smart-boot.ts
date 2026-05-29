import { hydrateFromIndexedDB } from "@/lib/storage";
import { getLastProjectId } from "@/services/storageService";
import { isProjectComplete } from "@/lib/project-status";
import type { BookProject } from "@/types/book";

let hydrationPromise: Promise<void> | null = null;

/** Shared hydration promise — started once at app boot (main.tsx). */
export function ensureStorageHydrated(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = hydrateFromIndexedDB().catch(() => undefined);
  }
  return hydrationPromise;
}

export type BootMessageKey =
  | "boot_msg_session"
  | "boot_msg_workspace"
  | "boot_msg_intelligence"
  | "boot_msg_shell"
  | "boot_msg_ready";

export function computeBootProgress(flags: {
  authReady: boolean;
  storageReady: boolean;
  planReady: boolean;
  shellReady: boolean;
}): number {
  let progress = 8;
  if (flags.authReady) progress = 28;
  if (flags.authReady && flags.storageReady) progress = 58;
  if (flags.authReady && flags.storageReady && flags.planReady) progress = 82;
  if (flags.authReady && flags.storageReady && flags.planReady && flags.shellReady) progress = 100;
  return progress;
}

export function bootMessageKey(flags: {
  authReady: boolean;
  storageReady: boolean;
  planReady: boolean;
  shellReady: boolean;
}): BootMessageKey {
  if (!flags.authReady) return "boot_msg_session";
  if (!flags.storageReady) return "boot_msg_workspace";
  if (!flags.planReady) return "boot_msg_intelligence";
  if (!flags.shellReady) return "boot_msg_shell";
  return "boot_msg_ready";
}

export type PreloadProfile = "writer" | "launch" | "market" | "editorial";

export function resolvePreloadProfile(projects: BookProject[]): PreloadProfile {
  const lastId = getLastProjectId();
  const lastProject = lastId ? projects.find((p) => p.id === lastId) : null;

  if (lastProject && !isProjectComplete(lastProject)) {
    return "writer";
  }

  if (projects.length === 0) {
    return "launch";
  }

  const hasDraft = projects.some((p) => !isProjectComplete(p));
  if (hasDraft) return "writer";

  return "launch";
}

/** Idle-time module warm-up — never blocks the main thread. */
export function scheduleIntelligentPreload(profile: PreloadProfile): void {
  const run = () => {
    switch (profile) {
      case "writer":
        void import("@/pages/Index.tsx");
        void import("@/components/ChapterIntelligencePanel.tsx");
        break;
      case "editorial":
        void import("@/components/ManuscriptAnalyzerDialog.tsx");
        void import("@/pages/Index.tsx");
        break;
      case "market":
        void import("@/pages/KdpLaunchPage.tsx");
        void import("@/pages/AutoBestsellerPage.tsx");
        break;
      case "launch":
      default:
        void import("@/pages/AutoBestsellerPage.tsx");
        void import("@/components/NewBookDialog.tsx");
        break;
    }
  };

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2200 });
  } else {
    window.setTimeout(run, 400);
  }
}
