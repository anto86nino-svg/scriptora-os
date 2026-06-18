import type { BookProject } from "@/types/book";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { ForgeCharacter } from "@/lib/guided-interview/forge-evolution-types";
import { buildCanonFromState } from "@/lib/guided-interview/canon-genesis-engine";
import { createEmptyMemoryGraph, upsertCharacter, upsertPromise, upsertWorldNode } from "./memory-graph";
import type {
  CharacterGraphNode,
  MemoryGraphSnapshot,
  PromiseGraphNode,
  WorldGraphNode,
} from "./types";

function slugId(prefix: string, label: string): string {
  return `${prefix}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"}`;
}

function forgeCharacterToGraphNode(char: ForgeCharacter, index: number): CharacterGraphNode {
  const name = char.name?.trim() || `Personaggio ${index + 1}`;
  return {
    id: slugId("char", name),
    name,
    role: char.role,
    coreWound: char.wound ?? "",
    coreDesire: char.desire ?? "",
    coreFear: char.fear ?? "",
    coreNeed: char.contradiction ?? "",
    dominantFlaw: char.contradiction ?? "",
    blindSpot: char.secret ?? "",
    greatestSecret: char.secret ?? "",
    speechPattern: "",
    behaviorSignature: char.obsession ?? "",
    emotionalTrigger: char.fear ?? "",
    currentArc: char.arc ?? "",
    arcStage: "unknown",
  };
}

function ingestV25Snapshot(project: BookProject, graph: MemoryGraphSnapshot): MemoryGraphSnapshot {
  const v25 = project.longBookMemory?.memoryConsistencyV25;
  if (!v25) return graph;

  let next = graph;
  for (const live of v25.characterMemories) {
    const node: CharacterGraphNode = {
      id: slugId("char", live.name),
      name: live.name,
      role: live.role,
      coreWound: live.wound,
      coreDesire: live.dominantDesire,
      coreFear: live.dominantFear,
      coreNeed: "",
      dominantFlaw: live.avoidancePatterns[0] ?? "",
      blindSpot: live.activeLies[0] ?? "",
      greatestSecret: live.secrets[0] ?? "",
      speechPattern: live.speechStyle,
      behaviorSignature: [...live.recurringGestures, ...live.recurringTics].join("; "),
      emotionalTrigger: live.stressPattern,
      currentArc: live.emotionalEvolution,
      arcStage: "unknown",
      lastUpdatedChapter: live.lastSeenChapter,
    };
    next = upsertCharacter(next, node);
  }

  for (const promise of v25.storyPromises) {
    const status =
      promise.status === "resolved"
        ? "resolved"
        : promise.status === "partial"
          ? "partial"
          : "open";
    const node: PromiseGraphNode = {
      id: promise.id,
      label: promise.description.slice(0, 80),
      description: promise.description,
      introducedIn: promise.chapterIntroduced,
      importance: promise.urgency,
      status,
    };
    next = upsertPromise(next, node);
  }

  return next;
}

function ingestLongBookMemory(project: BookProject, graph: MemoryGraphSnapshot): MemoryGraphSnapshot {
  const lb = project.longBookMemory;
  if (!lb) return graph;

  let next = graph;
  for (const arc of lb.unresolvedArcs) {
    const node: PromiseGraphNode = {
      id: arc.id,
      label: arc.description.slice(0, 80),
      description: arc.description,
      introducedIn: arc.introducedChapter,
      importance: arc.urgency,
      status: "open",
    };
    next = upsertPromise(next, node);
  }

  for (const rule of lb.worldRules) {
    const world: WorldGraphNode = {
      id: slugId("world", rule.rule),
      kind: "rule",
      label: rule.rule.slice(0, 80),
      description: rule.rule,
    };
    next = upsertWorldNode(next, world);
  }

  return ingestV25Snapshot(project, next);
}

function ingestForgeState(state: GuidedInterviewState, graph: MemoryGraphSnapshot): MemoryGraphSnapshot {
  let next = graph;
  for (const [index, char] of (state.characters ?? []).entries()) {
    next = upsertCharacter(next, forgeCharacterToGraphNode(char, index));
  }

  const canon = buildCanonFromState(state);
  for (const fact of [
    ...canon.world.facts,
    ...canon.story.facts,
    ...canon.ending.facts,
  ]) {
    const world: WorldGraphNode = {
      id: slugId("world", fact),
      kind: "rule",
      label: fact.slice(0, 80),
      description: fact,
    };
    next = upsertWorldNode(next, world);
  }

  const ex = state.extracted ?? {};
  if (ex.promise) {
    next = upsertPromise(next, {
      id: slugId("promise", ex.promise),
      label: ex.promise.slice(0, 80),
      description: ex.promise,
      introducedIn: 0,
      importance: "high",
      status: "open",
    });
  }

  return next;
}

function ingestBlueprint(project: BookProject, graph: MemoryGraphSnapshot): MemoryGraphSnapshot {
  const bp = project.blueprint;
  if (!bp) return graph;

  let next = graph;
  const overview = bp.overview?.trim();
  if (overview) {
    next = upsertWorldNode(next, {
      id: "world-blueprint-overview",
      kind: "timeline",
      label: "Blueprint overview",
      description: overview,
    });
  }

  for (const [index, chapter] of (bp.chapterOutlines ?? []).entries()) {
    const summary = chapter.summary?.trim();
    if (!summary) continue;
    next = upsertPromise(next, {
      id: slugId("chapter-arc", chapter.title || `cap-${index + 1}`),
      label: chapter.title || `Capitolo ${index + 1}`,
      description: summary,
      introducedIn: index + 1,
      importance: "medium",
      status: project.chapters[index]?.content?.trim() ? "partial" : "open",
    });
  }

  return next;
}

export function buildMemoryGraphFromProject(project: BookProject): MemoryGraphSnapshot {
  const base = createEmptyMemoryGraph(project.id);
  let graph: MemoryGraphSnapshot = {
    ...base,
    chaptersIndexed: project.chapters.filter((c) => (c.content || "").trim().length > 40).length,
    updatedAt: new Date().toISOString(),
  };

  graph = ingestBlueprint(project, graph);
  graph = ingestLongBookMemory(project, graph);

  const cfg = project.config;
  if (cfg?.characterBibleText?.trim()) {
    graph = upsertWorldNode(graph, {
      id: "world-character-bible",
      kind: "rule",
      label: "Character bible",
      description: cfg.characterBibleText.trim(),
    });
  }

  return graph;
}

export function buildMemoryGraphFromForge(
  state: GuidedInterviewState,
  projectId = "forge-session",
): MemoryGraphSnapshot {
  const base = createEmptyMemoryGraph(projectId);
  return ingestForgeState(state, base);
}

export function buildMemoryGraph(input: {
  project?: BookProject | null;
  forgeState?: GuidedInterviewState | null;
}): MemoryGraphSnapshot {
  if (input.project) {
    const fromProject = buildMemoryGraphFromProject(input.project);
    if (input.forgeState) {
      return ingestForgeState(input.forgeState, fromProject);
    }
    return fromProject;
  }
  if (input.forgeState) return buildMemoryGraphFromForge(input.forgeState);
  return createEmptyMemoryGraph();
}
