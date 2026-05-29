export type {
  SurgicalEditActionResult,
  SurgicalEditContext,
  SurgicalEditEngineResult,
  SurgicalEditV1ActionId,
  SurgicalPatchOutput,
  SurgicalPatchRecord,
} from "./types";

export {
  SURGICAL_EDIT_V1_ACTIONS,
  SURGICAL_EDIT_V1_ACTION_SET,
  SURGICAL_MAX_MODIFICATION_RATIO,
  SURGICAL_EDIT_ENGINE_V1_KEY,
} from "./constants";

export {
  applyDialogueRougheningAction,
  applyEmotionalTrimmingAction,
  applySlowBurnProtectionAction,
  applyPacingCompressionAction,
  applyEndingCompressionAction,
  SURGICAL_V1_ACTION_RUNNERS,
} from "./actions";

export {
  computeModificationRatio,
  enforceVoiceProtection,
  capModificationPercent,
} from "./voice-guard";

export {
  explanationForAction,
  premiumLabelForAction,
  SURGICAL_V1_EXPLANATIONS,
} from "./explanations";

export {
  runSurgicalEditEngineV1,
  planSurgicalEditV1,
  validateSurgicalPatchOutput,
  buildSurgicalEditDirectiveBlock,
  computeDevelopmentalEditReport,
  planSurgicalInterventionsV1,
} from "./orchestrator";

export { runSurgicalEditHardeningSuite, summarizeSurgicalHardening } from "./hardening-suite";
export type { SurgicalHardeningAssertion, SurgicalHardeningResult } from "./hardening-suite";

/** Surgical Edit Engine V1 — wait for user trust validation before V2 */
export const SURGICAL_EDIT_ENGINE_V1_FROZEN = true;
