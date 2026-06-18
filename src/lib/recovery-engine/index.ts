export * from "./types";
export * from "./snapshot-system";
export * from "./partial-success";
export * from "./recovery-flow";

import { autoSnapshotBeforePhase, saveChapterCheckpoint, getBestChapterCheckpoint, CHECKPOINT_PERCENTS } from "./snapshot-system";
import { runRecoveryFlow, buildMemoryFallbackGraph, buildSafeBlueprintFallback } from "./recovery-flow";
import { classifyPartialSuccess, hasRecoverableContent, partialSuccessMessage } from "./partial-success";
import { NEVER_LOSE_THE_BOOK_RULES, SUCCESS_HIERARCHY } from "./types";

export const RecoveryEngine = {
  neverLoseRules: NEVER_LOSE_THE_BOOK_RULES,
  successHierarchy: SUCCESS_HIERARCHY,
  snapshotBeforePhase: autoSnapshotBeforePhase,
  snapshotBeforeRewrite: (project: import("@/types/book").BookProject, forgeState?: import("@/lib/guided-interview/types").GuidedInterviewState | null) =>
    autoSnapshotBeforePhase(project, "rewrite", forgeState),
  snapshotBeforeDiagnostics: (project: import("@/types/book").BookProject, forgeState?: import("@/lib/guided-interview/types").GuidedInterviewState | null) =>
    autoSnapshotBeforePhase(project, "diagnostics", forgeState),
  snapshotBeforeExport: (project: import("@/types/book").BookProject, forgeState?: import("@/lib/guided-interview/types").GuidedInterviewState | null) =>
    autoSnapshotBeforePhase(project, "export", forgeState),
  chapterCheckpoint: saveChapterCheckpoint,
  bestChapterCheckpoint: getBestChapterCheckpoint,
  recoverProject: runRecoveryFlow,
  memoryFallback: buildMemoryFallbackGraph,
  safeBlueprint: buildSafeBlueprintFallback,
  classifyPartialSuccess,
  hasRecoverableContent,
  partialSuccessMessage,
};
