import type { BookProject } from "@/types/book";
import { buildMemoryGraphFromProject } from "./graph-builder";
import { cloneMemoryGraph } from "./memory-graph";
import { analyzeCanonDrift } from "./graph-validator";
import { computeStoryDebt } from "./selectors/story-debt";
import type { MemoryGraphSnapshot, PostChapterMemoryUpdateResult } from "./types";

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function updateMemoryGraphAfterChapter(
  project: BookProject,
  chapterIndex: number,
  chapterText?: string,
  existing?: MemoryGraphSnapshot | null,
): PostChapterMemoryUpdateResult {
  const rebuilt = buildMemoryGraphFromProject(project);
  let snapshot = existing ? mergeGraphPreservingIds(existing, rebuilt) : rebuilt;

  snapshot = {
    ...snapshot,
    chaptersIndexed: project.chapters.filter((c) => countWords(c.content || "") >= 35).length,
    updatedAt: new Date().toISOString(),
    mode: "full",
  };

  if (chapterText?.trim()) {
    snapshot = applyChapterTextHeuristics(snapshot, chapterIndex, chapterText);
  }

  const storyDebt = computeStoryDebt(snapshot);
  snapshot = { ...snapshot, storyDebt };

  const driftReport = analyzeCanonDrift(snapshot, {
    chapterIndex,
    draftText: chapterText,
    project,
  });
  snapshot = { ...snapshot, lastCanonDrift: driftReport };

  return {
    snapshot,
    driftReport,
    debtScore: storyDebt.narrativeDebtScore,
    updatedNodeCounts: {
      characters: snapshot.characters.length,
      relationships: snapshot.relationships.length,
      promises: snapshot.promises.length,
      mysteries: snapshot.mysteries.length,
    },
  };
}

function mergeGraphPreservingIds(
  existing: MemoryGraphSnapshot,
  rebuilt: MemoryGraphSnapshot,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(rebuilt);
  next.projectId = existing.projectId || rebuilt.projectId;
  return next;
}

function applyChapterTextHeuristics(
  snapshot: MemoryGraphSnapshot,
  chapterIndex: number,
  text: string,
): MemoryGraphSnapshot {
  const next = cloneMemoryGraph(snapshot);

  for (const character of next.characters) {
    if (!character.name) continue;
    const pattern = new RegExp(`\\b${escapeRegex(character.name)}\\b`, "i");
    if (pattern.test(text)) {
      character.lastUpdatedChapter = chapterIndex;
    }
  }

  for (const promise of next.promises) {
    if (promise.introducedIn > chapterIndex) continue;
    const fragment = promise.description.slice(0, 24);
    if (fragment.length >= 8 && text.toLowerCase().includes(fragment.toLowerCase())) {
      if (promise.status === "open") promise.status = "partial";
    }
  }

  for (const foreshadow of next.foreshadows) {
    if (foreshadow.introducedIn <= chapterIndex && foreshadow.status === "seeded") {
      const seed = foreshadow.seed.slice(0, 20);
      if (seed.length >= 6 && text.toLowerCase().includes(seed.toLowerCase())) {
        foreshadow.status = "echoed";
      }
    }
  }

  return next;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function refreshProjectMemoryGraph(project: BookProject): BookProject {
  const existing = project.memoryGraph;
  const lastChapterIndex = Math.max(0, project.chapters.length - 1);
  const lastText = project.chapters[lastChapterIndex]?.content;
  const result = updateMemoryGraphAfterChapter(
    project,
    lastChapterIndex,
    lastText,
    existing ?? null,
  );
  return {
    ...project,
    memoryGraph: result.snapshot,
    updatedAt: new Date().toISOString(),
  };
}
