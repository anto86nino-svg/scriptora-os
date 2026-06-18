import type { MemoryGraphSnapshot, StoryDebtGraph } from "../types";

export function computeStoryDebt(snapshot: MemoryGraphSnapshot): StoryDebtGraph {
  const unresolvedPromises = snapshot.promises
    .filter((p) => p.status === "open" || p.status === "partial")
    .map((p) => p.label);

  const unresolvedMysteries = snapshot.mysteries
    .filter((m) => m.status === "open" || m.status === "partial")
    .map((m) => m.label);

  const unresolvedRelationships = snapshot.relationships
    .filter((r) => r.conflict >= 70 || r.fear >= 70)
    .map((r) => `${r.characterA} ↔ ${r.characterB}`);

  const unresolvedObjects = snapshot.objects
    .filter((o) => o.status === "active")
    .map((o) => o.label);

  const unresolvedArcs = snapshot.characterEvolution
    .filter((e) => e.regressions.length > e.growth.length)
    .map((e) => e.characterName);

  const total =
    unresolvedPromises.length +
    unresolvedMysteries.length +
    unresolvedRelationships.length +
    unresolvedObjects.length +
    unresolvedArcs.length;

  const narrativeDebtScore = Math.min(100, total * 6);

  return {
    unresolvedPromises,
    unresolvedMysteries,
    unresolvedRelationships,
    unresolvedObjects,
    unresolvedArcs,
    narrativeDebtScore,
  };
}
