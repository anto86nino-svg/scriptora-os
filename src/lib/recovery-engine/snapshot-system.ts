import type { BookProject } from "@/types/book";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { MemoryGraphSnapshot } from "@/lib/memory-graph/types";
import type {
  ProjectRecoverySnapshot,
  RecoveryPhase,
  RecoveryProjectState,
  RecoverySnapshotReason,
} from "./types";

const MAX_SNAPSHOTS = 3;

function key(projectId: string): string {
  return `scriptora-recovery-snapshots:${projectId}`;
}

export function captureProjectState(project: BookProject, forgeState?: GuidedInterviewState | null): RecoveryProjectState {
  return {
    forgeState: forgeState ?? null,
    blueprintJson: project.blueprint ? JSON.stringify(project.blueprint) : null,
    memoryGraph: project.memoryGraph ?? null,
    writerPhase: project.phase,
    canonBrief: project.config?.forgeCanonBrief,
    projectConfigHash: project.config?.title,
    chapters: project.chapters.map((chapter, index) => ({
      index,
      title: chapter.title,
      content: chapter.content ?? "",
      status: chapter.status,
    })),
  };
}

export function createRecoverySnapshot(
  project: BookProject,
  reason: RecoverySnapshotReason,
  forgeState?: GuidedInterviewState | null,
): ProjectRecoverySnapshot {
  return {
    snapshotId: `rc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId: project.id,
    timestamp: new Date().toISOString(),
    reason,
    state: captureProjectState(project, forgeState),
  };
}

export function saveRecoverySnapshot(snapshot: ProjectRecoverySnapshot): ProjectRecoverySnapshot {
  if (typeof localStorage === "undefined") return snapshot;

  try {
    const existing = loadRecoverySnapshots(snapshot.projectId);
    const next = [snapshot, ...existing].slice(0, MAX_SNAPSHOTS);
    localStorage.setItem(key(snapshot.projectId), JSON.stringify(next));
  } catch (error) {
    console.warn("[Recovery] snapshot skipped", error);
  }

  return snapshot;
}

export function loadRecoverySnapshots(projectId: string): ProjectRecoverySnapshot[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(key(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ProjectRecoverySnapshot[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getLatestRecoverySnapshot(projectId: string): ProjectRecoverySnapshot | null {
  return loadRecoverySnapshots(projectId)[0] ?? null;
}

export function autoSnapshotBeforePhase(
  project: BookProject,
  phase: RecoveryPhase,
  forgeState?: GuidedInterviewState | null,
): ProjectRecoverySnapshot {
  return saveRecoverySnapshot(createRecoverySnapshot(project, phase, forgeState));
}

export const CHECKPOINT_PERCENTS = [10, 25, 50, 75, 100] as const;

export function saveChapterCheckpoint(
  project: BookProject,
  chapterIndex: number,
  percent: number,
  content: string,
): ProjectRecoverySnapshot {
  const snapshot = createRecoverySnapshot(project, "chapter_checkpoint");
  const chapter = snapshot.state.chapters[chapterIndex];
  if (chapter) {
    chapter.content = content;
    chapter.checkpointPercent = percent;
    chapter.status = percent >= 100 ? "completed" : "generating";
  }
  return saveRecoverySnapshot(snapshot);
}

export function getBestChapterCheckpoint(
  projectId: string,
  chapterIndex: number,
): { content: string; percent: number } | null {
  for (const snap of loadRecoverySnapshots(projectId)) {
    const chapter = snap.state.chapters[chapterIndex];
    if (chapter?.content?.trim() && (chapter.checkpointPercent ?? 0) > 0) {
      return {
        content: chapter.content,
        percent: chapter.checkpointPercent ?? 0,
      };
    }
  }
  return null;
}
