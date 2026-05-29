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
    summary: "Dialogue made more human",
    explanation:
      "Dialogue felt emotionally resolved or too polished. We added hesitation, friction, and imperfect speech while keeping character voice.",
  },
  "emotional-compression": {
    label: "Emotional Compression",
    summary: "Emotional exposition reduced",
    explanation:
      "Emotions were told instead of shown. We compressed explanation into behavior, distance, and micro-actions.",
  },
  "subtext-injection": {
    label: "Subtext Injection",
    summary: "Subtext increased",
    explanation:
      "Feelings were stated explicitly. We layered hidden meaning so the scene carries more under the surface.",
  },
  "tension-preservation": {
    label: "Tension Preservation",
    summary: "Emotional payoff delayed",
    explanation:
      "The scene resolved tension too early. We preserved friction and push/pull so desire and suspense stay alive.",
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
  if (/tension|tensione|attrazione|desiderio|attrito/i.test(lower)) hits.push("tension-preservation");
  if (/pacing|ritmo|momentum|drag|lento|ripet/i.test(lower)) hits.push("pacing-compression");
  if (/cliff|finale|ending|chiusura/i.test(lower)) hits.push("cliffhanger-optimization");
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
