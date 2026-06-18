import type { BookProject, GenerationStatus } from "@/types/book";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { MemoryGraphSnapshot } from "@/lib/memory-graph/types";

export type RecoveryPhase =
  | "forge"
  | "blueprint"
  | "writer"
  | "rewrite"
  | "diagnostics"
  | "export";

export type RecoveryContentClass = "valid_content" | "missing_content" | "corrupted_content";

export type RecoverySnapshotReason = RecoveryPhase | "chapter_checkpoint" | "manual";

export type ProjectRecoverySnapshot = {
  snapshotId: string;
  projectId: string;
  timestamp: string;
  reason: RecoverySnapshotReason;
  state: RecoveryProjectState;
};

export type RecoveryProjectState = {
  forgeState?: GuidedInterviewState | null;
  blueprintJson?: string | null;
  memoryGraph?: MemoryGraphSnapshot | null;
  writerPhase?: BookProject["phase"];
  canonBrief?: string;
  projectConfigHash?: string;
  chapters: Array<{
    index: number;
    title: string;
    content: string;
    status?: GenerationStatus;
    checkpointPercent?: number;
  }>;
};

export type RecoveryAnalysis = {
  validContent: RecoveryContentClass[];
  missingContent: RecoveryContentClass[];
  corruptedContent: RecoveryContentClass[];
  recoverable: boolean;
  message: string;
};

export type RecoveryFlowResult = {
  analysis: RecoveryAnalysis;
  restoredProject?: BookProject;
  actions: RecoveryAction[];
};

export type RecoveryAction =
  | "recover"
  | "repair"
  | "retry"
  | "continue"
  | "safe_mode"
  | "complete"
  | "regenerate_export"
  | "safe_export";

export type PartialSuccessPresentation = {
  title: string;
  body: string;
  status: GenerationStatus;
  actions: RecoveryAction[];
};

export type MemoryFallbackMode = "full" | "degraded";

export const NEVER_LOSE_THE_BOOK_RULES = [
  "Never discard generated chapter content when words exist.",
  "Never discard Forge answers or DNA lock.",
  "Never discard blueprint without a safe fallback.",
  "Never discard manual author edits.",
  "Always offer at least one recovery CTA on critical errors.",
] as const;

export const SUCCESS_HIERARCHY = [
  "Non perdere il lavoro dell'autore",
  "Permettere sempre di continuare",
  "Preservare memoria e canon",
  "Completare il libro",
  "Massimizzare qualità narrativa",
  "Ottimizzare qualità editoriale",
  "Ottimizzare qualità commerciale",
] as const;
