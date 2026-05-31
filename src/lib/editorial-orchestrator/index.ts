export {
  EDITORIAL_ORCHESTRATOR_VERSION,
  type ChapterArcPhase,
  type EditorialIntentSheet,
  type PreDeliveryPhaseBIntel,
  type PreDeliveryPhaseCIntel,
  type PreDeliveryPhaseDIntel,
  type PreDeliveryPhaseEIntel,
  type PreDeliveryPhaseFIntel,
  type SupremeEditorialIssue,
  type SupremeEditorialScore,
  type SupremeEditorialSnapshot,
} from "./types";

export { buildEditorialIntentSheet, buildEditorialIntentPromptBlock, buildCharacterIntentBlockFromSheet } from "./intent-sheet";
export { computeSupremeEditorialScore } from "./supreme-score";
export { runPreDeliveryGate } from "./pre-delivery-gate";

export const EDITORIAL_ORCHESTRATOR_KEY = "scriptora-editorial-orchestrator";

export function isEditorialOrchestratorEnabled(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_EDITORIAL_ORCHESTRATOR === "off") return false;
    if (typeof window === "undefined") return true;
    const saved = localStorage.getItem(EDITORIAL_ORCHESTRATOR_KEY);
    return saved !== "off" && saved !== "false";
  } catch {
    return true;
  }
}
