import type { NarrativeMemoryCoreSnapshot, SupremeMemoryReport } from "./types";
import { relationshipHealthScore } from "./relationship-memory";

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function generateSupremeMemoryReport(memory: NarrativeMemoryCoreSnapshot): SupremeMemoryReport {
  const brokenPromises = memory.items.filter(i => i.kind === "promise" && i.status === "BROKEN").length;
  const openPromises = memory.openPromises;
  const relHealth = relationshipHealthScore(memory.relationships);
  const forgottenPenalty =
    memory.forgottenCharacterRisk.length * 12 +
    memory.forgottenObjectRisk.length * 8 +
    memory.incompleteArcs.length * 6;
  const continuityRisk = clamp100(forgottenPenalty + memory.brokenItems * 10);
  const payoffRisk = clamp100(
    memory.items.filter(i => (i.kind === "setup" || i.kind === "promise") && i.status !== "RESOLVED").length * 9,
  );
  const narrativeHealth = clamp100(
    100 - continuityRisk * 0.35 - payoffRisk * 0.25 - brokenPromises * 15 + relHealth * 0.2,
  );

  const warnings: string[] = [];
  if (openPromises > 0) warnings.push(`${openPromises} open narrative promise(s)`);
  if (brokenPromises > 0) warnings.push(`${brokenPromises} broken promise(s)`);
  if (memory.forgottenCharacterRisk.length) warnings.push(`Characters fading: ${memory.forgottenCharacterRisk.join(", ")}`);
  if (memory.forgottenObjectRisk.length) warnings.push(`${memory.forgottenObjectRisk.length} object(s) not recalled`);
  if (memory.incompleteArcs.length) warnings.push(`${memory.incompleteArcs.length} incomplete arc(s)`);

  const summary =
    narrativeHealth >= 75
      ? "Narrative memory healthy — continuity intact across indexed chapters."
      : narrativeHealth >= 50
        ? "Narrative memory at risk — review open promises and relationship drift."
        : "Narrative memory degraded — broken promises or forgotten continuity elements.";

  return {
    version: 1,
    evaluatedAt: new Date().toISOString(),
    narrativeHealth,
    openPromises,
    brokenPromises,
    relationshipHealth: relHealth,
    continuityRisk,
    payoffRisk,
    warnings: warnings.slice(0, 8),
    summary,
  };
}
