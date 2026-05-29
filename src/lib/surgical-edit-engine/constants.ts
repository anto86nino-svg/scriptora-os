import type { SurgicalInterventionId } from "@/lib/chapter-doctor-pro/types";

/** V1 surgical actions only — no feature explosion */
export const SURGICAL_EDIT_V1_ACTIONS: SurgicalInterventionId[] = [
  "dialogue-roughening",
  "emotional-compression",
  "slow-burn-tension",
  "pacing-compression",
  "ending-compression",
];

export const SURGICAL_EDIT_V1_ACTION_SET = new Set<SurgicalInterventionId>(SURGICAL_EDIT_V1_ACTIONS);

/** Max intervention — preserve author voice */
export const SURGICAL_MAX_MODIFICATION_RATIO = 0.25;

export const SURGICAL_EDIT_ENGINE_V1_KEY = "scriptora-surgical-edit-engine-v1";
