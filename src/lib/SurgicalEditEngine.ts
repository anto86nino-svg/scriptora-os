/**
 * @deprecated Use `@/lib/surgical-edit-engine` — legacy re-export for benchmarks/playground.
 */
export interface SurgicalEditOptions {
  preserveVoice?: boolean;
  preserveCanon?: boolean;
  intensity?: "low" | "medium" | "high";
}

export interface SurgicalResult {
  text: string;
  editsApplied: string[];
}

import {
  applyDialogueRougheningAction,
  applyEmotionalTrimmingAction,
  applyEndingCompressionAction,
  applyPacingCompressionAction,
  applySlowBurnProtectionAction,
  enforceVoiceProtection,
  runSurgicalEditEngineV1,
} from "@/lib/surgical-edit-engine";

export function applyDialogueRoughening(text: string, _options: SurgicalEditOptions = {}): SurgicalResult {
  const roughen = applyDialogueRougheningAction(text);
  const trim = applyEmotionalTrimmingAction(roughen.text);
  const editsApplied = [roughen, trim].filter((r) => r.applied).map((r) => r.actionId);
  const protectedText = enforceVoiceProtection(text, trim.text);
  return { text: protectedText, editsApplied };
}

export function applySurgicalEditingFromWarnings(text: string): SurgicalResult {
  const result = runSurgicalEditEngineV1(text);
  return {
    text: result.editedText,
    editsApplied: result.actionsApplied,
  };
}

export {
  applyDialogueRougheningAction,
  applyEmotionalTrimmingAction,
  applySlowBurnProtectionAction,
  applyPacingCompressionAction,
  applyEndingCompressionAction,
  runSurgicalEditEngineV1,
  enforceVoiceProtection,
};
