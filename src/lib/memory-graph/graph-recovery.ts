import type { MemoryGraphSnapshot, PreChapterMemoryContext } from "./types";
import { createEmptyMemoryGraph } from "./memory-graph";
import { buildMemoryGraph } from "./graph-builder";
import { buildWriterMemoryContextBlock } from "./selectors/writer-context";
import { analyzeCanonDrift } from "./graph-validator";
import type { BookProject } from "@/types/book";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";

export function runPreChapterMemoryCheck(input: {
  project: BookProject;
  chapterIndex: number;
  draftText?: string;
  forgeState?: GuidedInterviewState | null;
}): PreChapterMemoryContext {
  try {
    const snapshot =
      input.project.memoryGraph ??
      buildMemoryGraph({ project: input.project, forgeState: input.forgeState });

    const driftReport = analyzeCanonDrift(snapshot, {
      chapterIndex: input.chapterIndex,
      draftText: input.draftText,
      project: input.project,
    });

    const warnings = driftReport.issues
      .filter((i) => i.severity !== "info")
      .map((i) => i.message);

    return {
      snapshot,
      writerContextBlock: buildWriterMemoryContextBlock(snapshot),
      driftReport,
      mode: snapshot.mode,
      warnings,
    };
  } catch {
    return buildDegradedPreChapterContext(input.project, input.chapterIndex);
  }
}

function buildDegradedPreChapterContext(
  project: BookProject,
  chapterIndex: number,
): PreChapterMemoryContext {
  const snapshot = {
    ...createEmptyMemoryGraph(project.id),
    mode: "degraded" as const,
    chaptersIndexed: project.chapters.filter((c) => (c.content || "").trim().length > 40).length,
  };

  const fallbackLines = [
    "[MEMORY GRAPH — DEGRADED MODE]",
    project.config?.forgeCanonBrief ? `Canon: ${project.config.forgeCanonBrief}` : "",
    project.config?.characterBibleText ? `Characters: ${project.config.characterBibleText.slice(0, 400)}` : "",
    project.config?.forgeAntiDriftRules?.length
      ? `Anti-drift: ${project.config.forgeAntiDriftRules.join(" | ")}`
      : "",
  ].filter(Boolean);

  return {
    snapshot,
    writerContextBlock: fallbackLines.join("\n"),
    driftReport: { issues: [], driftScore: 0, status: "clean" },
    mode: "degraded",
    warnings: [`Memory graph degraded at chapter ${chapterIndex + 1} — using canon fallback.`],
  };
}
