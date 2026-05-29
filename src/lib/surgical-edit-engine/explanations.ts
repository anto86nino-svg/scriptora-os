import type { SurgicalEditV1ActionId } from "./types";

/** Developmental-editor explanations — never robotic */
export const SURGICAL_V1_EXPLANATIONS: Record<SurgicalEditV1ActionId, string> = {
  "dialogue-roughening":
    "Dialogue feels emotionally clearer than natural speech. Small imperfections were added to increase realism.",
  "emotional-compression":
    "Repeated emotional beats were explained instead of shown. Some telling was converted into gesture, silence, and subtext.",
  "slow-burn-tension":
    "Emotional payoff arrived too early for this scene. Friction and ambiguity were preserved to protect romantic tension.",
  "pacing-compression":
    "Repeated beats slowed momentum. Redundancy was reduced while preserving emotional rhythm and canon details.",
  "ending-compression":
    "The ending explained closure twice. Over-explanation was trimmed to leave emotional echo instead of summary.",
};

export function explanationForAction(actionId: SurgicalEditV1ActionId): string {
  return SURGICAL_V1_EXPLANATIONS[actionId];
}

export function premiumLabelForAction(actionId: SurgicalEditV1ActionId): string {
  const labels: Record<SurgicalEditV1ActionId, string> = {
    "dialogue-roughening": "Strengthening dialogue realism",
    "emotional-compression": "Reducing emotional over-explanation",
    "slow-burn-tension": "Preserving romantic tension",
    "pacing-compression": "Compressing repetitive beats",
    "ending-compression": "Trimming overwritten closure",
  };
  return labels[actionId];
}
