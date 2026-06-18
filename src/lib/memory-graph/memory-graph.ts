import type {
  CharacterEvolutionNode,
  CharacterGraphNode,
  ForeshadowGraphNode,
  MemoryGraphMode,
  MemoryGraphSnapshot,
  MysteryGraphNode,
  ObjectGraphNode,
  PromiseGraphNode,
  RelationshipGraphEdge,
  StoryDebtGraph,
  WorldGraphNode,
} from "./types";

export function createEmptyStoryDebt(): StoryDebtGraph {
  return {
    unresolvedPromises: [],
    unresolvedMysteries: [],
    unresolvedRelationships: [],
    unresolvedObjects: [],
    unresolvedArcs: [],
    narrativeDebtScore: 0,
  };
}

export function createEmptyMemoryGraph(projectId = "unknown"): MemoryGraphSnapshot {
  return {
    version: 1,
    projectId,
    updatedAt: new Date().toISOString(),
    chaptersIndexed: 0,
    mode: "full",
    characters: [],
    relationships: [],
    promises: [],
    mysteries: [],
    world: [],
    objects: [],
    foreshadows: [],
    characterEvolution: [],
    storyDebt: createEmptyStoryDebt(),
  };
}

export function cloneMemoryGraph(snapshot: MemoryGraphSnapshot): MemoryGraphSnapshot {
  return structuredClone(snapshot);
}

export function withMemoryGraphMode(
  snapshot: MemoryGraphSnapshot,
  mode: MemoryGraphMode,
): MemoryGraphSnapshot {
  return { ...snapshot, mode, updatedAt: new Date().toISOString() };
}

export function mergeMemoryGraph(
  base: MemoryGraphSnapshot,
  patch: Partial<MemoryGraphSnapshot>,
): MemoryGraphSnapshot {
  return {
    ...base,
    ...patch,
    characters: patch.characters ?? base.characters,
    relationships: patch.relationships ?? base.relationships,
    promises: patch.promises ?? base.promises,
    mysteries: patch.mysteries ?? base.mysteries,
    world: patch.world ?? base.world,
    objects: patch.objects ?? base.objects,
    foreshadows: patch.foreshadows ?? base.foreshadows,
    characterEvolution: patch.characterEvolution ?? base.characterEvolution,
    storyDebt: patch.storyDebt ?? base.storyDebt,
    updatedAt: new Date().toISOString(),
  };
}

export function countGraphNodes(snapshot: MemoryGraphSnapshot): number {
  return (
    snapshot.characters.length +
    snapshot.relationships.length +
    snapshot.promises.length +
    snapshot.mysteries.length +
    snapshot.world.length +
    snapshot.objects.length +
    snapshot.foreshadows.length
  );
}

export function findCharacter(
  snapshot: MemoryGraphSnapshot,
  nameOrId: string,
): CharacterGraphNode | undefined {
  const needle = nameOrId.trim().toLowerCase();
  return snapshot.characters.find(
    (c) => c.id === nameOrId || c.name.toLowerCase() === needle,
  );
}

export function upsertCharacter(
  snapshot: MemoryGraphSnapshot,
  character: CharacterGraphNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.characters.findIndex((c) => c.id === character.id);
  if (idx >= 0) next.characters[idx] = character;
  else next.characters.push(character);
  return next;
}

export function upsertRelationship(
  snapshot: MemoryGraphSnapshot,
  edge: RelationshipGraphEdge,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.relationships.findIndex((r) => r.id === edge.id);
  if (idx >= 0) next.relationships[idx] = edge;
  else next.relationships.push(edge);
  return next;
}

export function upsertPromise(
  snapshot: MemoryGraphSnapshot,
  node: PromiseGraphNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.promises.findIndex((p) => p.id === node.id);
  if (idx >= 0) next.promises[idx] = node;
  else next.promises.push(node);
  return next;
}

export function upsertMystery(
  snapshot: MemoryGraphSnapshot,
  node: MysteryGraphNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.mysteries.findIndex((m) => m.id === node.id);
  if (idx >= 0) next.mysteries[idx] = node;
  else next.mysteries.push(node);
  return next;
}

export function upsertWorldNode(
  snapshot: MemoryGraphSnapshot,
  node: WorldGraphNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.world.findIndex((w) => w.id === node.id);
  if (idx >= 0) next.world[idx] = node;
  else next.world.push(node);
  return next;
}

export function upsertObject(
  snapshot: MemoryGraphSnapshot,
  node: ObjectGraphNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.objects.findIndex((o) => o.id === node.id);
  if (idx >= 0) next.objects[idx] = node;
  else next.objects.push(node);
  return next;
}

export function upsertForeshadow(
  snapshot: MemoryGraphSnapshot,
  node: ForeshadowGraphNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.foreshadows.findIndex((f) => f.id === node.id);
  if (idx >= 0) next.foreshadows[idx] = node;
  else next.foreshadows.push(node);
  return next;
}

export function upsertCharacterEvolution(
  snapshot: MemoryGraphSnapshot,
  node: CharacterEvolutionNode,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);
  const idx = next.characterEvolution.findIndex((e) => e.characterId === node.characterId);
  if (idx >= 0) next.characterEvolution[idx] = node;
  else next.characterEvolution.push(node);
  return next;
}
