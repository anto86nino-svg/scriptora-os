import type { AppliedIntervention, PatchRecord, SurgicalInterventionId } from "./types";

export const INTERVENTION_CATALOG: Record<
  SurgicalInterventionId,
  { label: string; summary: string; explanation: string }
> = {
  "hook-strengthening": {
    label: "Hook Strengthening",
    summary: "Opening tension strengthened",
    explanation:
      "The opening explained too much too soon. We replaced exposition with tension and uncertainty so the reader commits faster.",
  },
  "dialogue-roughening": {
    label: "Dialogue Roughening",
    summary: "Dialogue feels more natural",
    explanation:
      "Dialogue feels emotionally clearer than natural speech. Small imperfections were added to increase realism.",
  },
  "emotional-compression": {
    label: "Emotional Compression",
    summary: "Emotions shown, not told",
    explanation:
      "Repeated emotional beats were explained instead of shown. Redundancy was reduced to preserve tension while keeping impact.",
  },
  "subtext-injection": {
    label: "Subtext Injection",
    summary: "Tension now implied",
    explanation:
      "More emotional tension is now implied instead of explicitly stated. The scene carries weight under the surface.",
  },
  "tension-preservation": {
    label: "Tension Preservation",
    summary: "Emotional payoff delayed",
    explanation:
      "The scene resolved tension too early. We preserved friction and push/pull so desire and suspense stay alive.",
  },
  "slow-burn-tension": {
    label: "Slow Burn Tension",
    summary: "Unresolved friction protected",
    explanation:
      "Emotional availability arrived too early for this genre. We protected slow-burn tension and delayed reassurance.",
  },
  "pacing-compression": {
    label: "Pacing Compression",
    summary: "Reader momentum improved",
    explanation:
      "Middle pacing slowed reader momentum. Repetition and drag were compressed to improve bingeability.",
  },
  "cliffhanger-optimization": {
    label: "Cliffhanger Optimization",
    summary: "Chapter ending sharpened",
    explanation:
      "The ending landed softly. We sharpened the forward pull with an unresolved emotional question.",
  },
  "ending-compression": {
    label: "Ending Compression",
    summary: "Overwritten ending trimmed",
    explanation:
      "The ending explained too much. We compressed closure while preserving emotional impact.",
  },
  "genre-specific": {
    label: "Genre-Specific Polish",
    summary: "Genre expectations reinforced",
    explanation:
      "Specific genre expectations were under-served. We applied targeted editorial moves aligned with your book brain.",
  },
};

const PATCH_TYPE_MAP: Record<string, SurgicalInterventionId[]> = {
  tighten: ["pacing-compression"],
  compress: ["pacing-compression", "emotional-compression"],
  rewrite: ["subtext-injection", "emotional-compression"],
  intensify: ["subtext-injection", "tension-preservation"],
  "strengthen-dialogue": ["dialogue-roughening"],
  "remove-redundancy": ["pacing-compression", "emotional-compression"],
  "forced-editorial": ["pacing-compression"],
};

function inferFromReason(reason: string): SurgicalInterventionId[] {
  const lower = reason.toLowerCase();
  const hits: SurgicalInterventionId[] = [];

  if (/hook|opening|apertura|inizio|primo/i.test(lower)) hits.push("hook-strengthening");
  if (/dialog|convers|speech|parl/i.test(lower)) hits.push("dialogue-roughening");
  if (/subtext|sottotesto|implicit|non detto/i.test(lower)) hits.push("subtext-injection");
  if (/tension|tensione|attrazione|desiderio|attrito|slow burn|slow-burn|yearning/i.test(lower)) hits.push("tension-preservation", "slow-burn-tension");
  if (/pacing|ritmo|momentum|drag|lento|ripet/i.test(lower)) hits.push("pacing-compression");
  if (/cliff|finale|ending|chiusura|overwritten/i.test(lower)) hits.push("cliffhanger-optimization", "ending-compression");
  if (/emot|feeling|spieg|tell|mostr/i.test(lower)) hits.push("emotional-compression");

  return hits;
}

export function classifyPatchIntervention(patch: PatchRecord): SurgicalInterventionId {
  const fromType = PATCH_TYPE_MAP[patch.type] || [];
  const fromReason = inferFromReason(patch.reason || "");
  const merged = [...fromType, ...fromReason];
  return merged[0] || "pacing-compression";
}

export function buildAppliedInterventions(
  patches: PatchRecord[],
  genreBrainLabel?: string,
): AppliedIntervention[] {
  const counts = new Map<SurgicalInterventionId, number>();

  for (const patch of patches) {
    const id = classifyPatchIntervention(patch);
    counts.set(id, (counts.get(id) || 0) + 1);
  }

  const interventions: AppliedIntervention[] = [];

  for (const [id, patchCount] of counts.entries()) {
    const catalog = INTERVENTION_CATALOG[id];
    interventions.push({
      id,
      label: catalog.label,
      summary: catalog.summary,
      explanation:
        id === "genre-specific" && genreBrainLabel
          ? `${catalog.explanation} (${genreBrainLabel})`
          : catalog.explanation,
      patchCount,
    });
  }

  return interventions.sort((a, b) => b.patchCount - a.patchCount);
}
