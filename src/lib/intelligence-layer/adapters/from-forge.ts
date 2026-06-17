import { buildForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import { loadForgeDnaLock } from "@/lib/guided-interview/interview-state";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";

export function adaptForgeStateToSeed(state: GuidedInterviewState): ForgeInterviewSeed {
  return buildForgeInterviewSeed(state);
}

export function loadForgeSessionState(): Partial<GuidedInterviewState> | null {
  return loadForgeDnaLock();
}

export function forgeStateFromSession(): GuidedInterviewState | null {
  const saved = loadForgeDnaLock();
  if (!saved?.extracted && !saved?.characters?.length && !saved?.canon) return null;
  return saved as GuidedInterviewState;
}

export function adaptForgeSessionToSeed(): ForgeInterviewSeed | null {
  const state = forgeStateFromSession();
  if (!state) return null;
  return buildForgeInterviewSeed(state);
}
