import type { SurgicalInterventionId } from "@/lib/chapter-doctor-pro/types";

export type SurgicalEditV1ActionId =
  | "dialogue-roughening"
  | "emotional-compression"
  | "slow-burn-tension"
  | "pacing-compression"
  | "ending-compression";

export interface SurgicalEditActionResult {
  text: string;
  actionId: SurgicalEditV1ActionId;
  applied: boolean;
}

export interface SurgicalEditEngineResult {
  originalText: string;
  editedText: string;
  actionsApplied: SurgicalEditV1ActionId[];
  explanations: string[];
  modificationRatio: number;
  voicePreserved: boolean;
  rejectedReason?: string;
}

export interface SurgicalPatchRecord {
  idx: number;
  original: string;
  patched: string;
  type: string;
  reason: string;
}

export interface SurgicalPatchOutput {
  patches: SurgicalPatchRecord[];
  patchedText: string;
  originalText: string;
  modificationPercent: number;
  totalParagraphs?: number;
  segments?: unknown[];
  evaluation?: unknown;
}

export interface SurgicalEditContext {
  genre?: string;
  language?: string;
  /** When true, apply slow-burn protection */
  romanceMode?: boolean;
}

export type { SurgicalInterventionId };
