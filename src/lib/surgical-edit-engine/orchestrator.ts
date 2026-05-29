import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { planSurgicalInterventionsV1 } from "@/lib/chapter-doctor-pro/surgical-plan";
import type { BookProject } from "@/types/book";
import { SURGICAL_V1_ACTION_RUNNERS } from "./actions";
import { explanationForAction } from "./explanations";
import type {
  SurgicalEditContext,
  SurgicalEditEngineResult,
  SurgicalEditV1ActionId,
  SurgicalPatchOutput,
  SurgicalPatchRecord,
} from "./types";
import { computeModificationRatio, enforceVoiceProtection } from "./voice-guard";

function isRomanceContext(context?: SurgicalEditContext): boolean {
  const genre = String(context?.genre || "").toLowerCase();
  return /romance|dark-romance/.test(genre);
}

function warningsToV1Actions(warningTypes: Set<string>, context?: SurgicalEditContext): SurgicalEditV1ActionId[] {
  const actions: SurgicalEditV1ActionId[] = [];

  if (warningTypes.has("dialogue_perfection")) actions.push("dialogue-roughening");
  if (warningTypes.has("emotional_redundancy") || warningTypes.has("weak_subtext")) actions.push("emotional-compression");
  if (isRomanceContext(context) && (warningTypes.has("climax_oversaturation") || warningTypes.has("character_flattening"))) {
    actions.push("slow-burn-tension");
  }
  if (warningTypes.has("repetitive_symbolism") || warningTypes.has("overwritten_scene")) actions.push("pacing-compression");
  if (warningTypes.has("overwritten_scene")) actions.push("ending-compression");

  return [...new Set(actions)];
}

function defaultV1Actions(context?: SurgicalEditContext): SurgicalEditV1ActionId[] {
  const base: SurgicalEditV1ActionId[] = ["dialogue-roughening", "emotional-compression", "pacing-compression"];
  if (isRomanceContext(context)) base.push("slow-burn-tension");
  return base;
}

/** Local surgical pass — deterministic, author-safe preview layer */
export function runSurgicalEditEngineV1(text: string, context?: SurgicalEditContext): SurgicalEditEngineResult {
  const originalText = String(text || "").trim();
  if (!originalText) {
    return {
      originalText: "",
      editedText: "",
      actionsApplied: [],
      explanations: [],
      modificationRatio: 0,
      voicePreserved: true,
    };
  }

  const analysis = analyzeNovel(originalText);
  const warningTypes = new Set(analysis.warnings.map((w) => w.type));
  let actionQueue = warningsToV1Actions(warningTypes, context);
  if (!actionQueue.length) actionQueue = defaultV1Actions(context);

  let edited = originalText;
  const actionsApplied: SurgicalEditV1ActionId[] = [];

  for (const actionId of actionQueue) {
    const runner = SURGICAL_V1_ACTION_RUNNERS[actionId];
    const result = runner(edited);
    if (result.applied) {
      edited = result.text;
      actionsApplied.push(actionId);
    }
  }

  const protectedText = enforceVoiceProtection(originalText, edited);
  const voicePreserved = protectedText === edited || protectedText === originalText;
  const finalText = protectedText === originalText && edited !== originalText ? originalText : protectedText;
  const modificationRatio = computeModificationRatio(originalText, finalText);

  return {
    originalText,
    editedText: finalText,
    actionsApplied: [...new Set(actionsApplied)],
    explanations: [...new Set(actionsApplied)].map(explanationForAction),
    modificationRatio,
    voicePreserved,
    rejectedReason:
      edited !== finalText && edited !== originalText
        ? "Edit exceeded voice-protection threshold — original preserved."
        : undefined,
  };
}

/** Plan V1 interventions using existing editorial intelligence stack */
export function planSurgicalEditV1(input: {
  chapterText: string;
  project: BookProject;
  chapterIndex: number;
}) {
  return planSurgicalInterventionsV1(input);
}

/** Validate AI patch output — never silently accept over-intervention */
export function validateSurgicalPatchOutput(originalText: string, output: SurgicalPatchOutput): SurgicalPatchOutput {
  const original = String(originalText || "").trim();
  const patched = String(output.patchedText || "").trim();
  if (!original || !patched) return output;

  const ratio = computeModificationRatio(original, patched);
  if (ratio <= 0.25 && output.modificationPercent <= 25) return output;

  const safePatches: SurgicalPatchRecord[] = [];
  const paragraphs = original.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const patchMap = new Map<number, string>();

  for (const patch of output.patches || []) {
    const candidate = enforceVoiceProtection(patch.original, patch.patched);
    if (candidate !== patch.original) {
      safePatches.push({ ...patch, patched: candidate });
      patchMap.set(patch.idx, candidate);
    }
  }

  let cumulativeRatio = 0;
  const cappedPatches: SurgicalPatchRecord[] = [];
  for (const patch of safePatches) {
    const nextText = paragraphs.map((p, idx) => patchMap.get(idx) ?? p).join("\n\n");
    cumulativeRatio = computeModificationRatio(original, nextText);
    if (cumulativeRatio > 0.25) break;
    cappedPatches.push(patch);
  }

  const finalMap = new Map<number, string>();
  cappedPatches.forEach((p) => finalMap.set(p.idx, p.patched));
  const patchedText = paragraphs.map((p, idx) => finalMap.get(idx) ?? p).join("\n\n");
  const modificationPercent = Math.round(computeModificationRatio(original, patchedText) * 100);

  return {
    ...output,
    patches: cappedPatches,
    patchedText,
    modificationPercent,
  };
}

export { buildSurgicalEditDirectiveBlock, planSurgicalInterventionsV1 } from "@/lib/chapter-doctor-pro/surgical-plan";
export { computeDevelopmentalEditReport } from "@/lib/chapter-doctor-pro";
