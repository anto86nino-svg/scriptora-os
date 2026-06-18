import type { BookProject } from "@/types/book";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { buildFallbackBlueprintFromConfig } from "@/lib/blueprint-recovery";
import { buildMemoryGraph, createEmptyMemoryGraph } from "@/lib/memory-graph";
import type { RecoveryAnalysis, RecoveryFlowResult } from "./types";
import { getLatestRecoverySnapshot } from "./snapshot-system";
import { hasRecoverableContent } from "./partial-success";

function analyzeProject(project: BookProject): RecoveryAnalysis {
  const valid: RecoveryAnalysis["validContent"] = [];
  const missing: RecoveryAnalysis["missingContent"] = [];
  const corrupted: RecoveryAnalysis["corruptedContent"] = [];

  if (project.blueprint) valid.push("valid_content");
  else missing.push("missing_content");

  const chapterValid = project.chapters.some((c) => hasRecoverableContent(c.content));
  if (chapterValid) valid.push("valid_content");
  else missing.push("missing_content");

  if (project.memoryGraph) valid.push("valid_content");
  else missing.push("missing_content");

  if (project.blueprintValidationErrors?.length) corrupted.push("corrupted_content");

  const recoverable =
    valid.length > 0 ||
    Boolean(project.config?.title) ||
    project.chapters.some((c) => (c.content || "").trim().length > 0);

  return {
    validContent: valid,
    missingContent: missing,
    corruptedContent: corrupted,
    recoverable,
    message: recoverable
      ? "Il tuo lavoro è al sicuro. Possiamo ricostruire solo le parti mancanti."
      : "Serve una ricostruzione guidata, ma nessun contenuto valido è stato perso intenzionalmente.",
  };
}

function restoreMissingOnly(project: BookProject, snapshot: ReturnType<typeof getLatestRecoverySnapshot>): BookProject {
  let next: BookProject = { ...project };

  if (!next.blueprint && snapshot?.state.blueprintJson) {
    try {
      next.blueprint = JSON.parse(snapshot.state.blueprintJson);
      next.blueprintSource = next.blueprintSource ?? "repaired";
    } catch {
      next.blueprint = buildFallbackBlueprintFromConfig(next.config);
      next.blueprintSource = "config_fallback";
    }
  } else if (!next.blueprint) {
    next.blueprint = buildFallbackBlueprintFromConfig(next.config);
    next.blueprintSource = "config_fallback";
  }

  if (!next.memoryGraph) {
    next.memoryGraph = snapshot?.state.memoryGraph ?? buildMemoryGraph({ project: next });
  }

  const chapters = [...next.chapters];
  for (const saved of snapshot?.state.chapters ?? []) {
    const current = chapters[saved.index];
    if (!current) continue;
    const currentValid = hasRecoverableContent(current.content);
    const savedValid = hasRecoverableContent(saved.content);
    if (!currentValid && savedValid) {
      chapters[saved.index] = {
        ...current,
        content: saved.content,
        status: saved.status ?? "recovered_partial",
      };
    }
  }
  next.chapters = chapters;

  return next;
}

export function runRecoveryFlow(
  project: BookProject,
  forgeState?: GuidedInterviewState | null,
): RecoveryFlowResult {
  const analysis = analyzeProject(project);
  const snapshot = getLatestRecoverySnapshot(project.id);
  const restoredProject = restoreMissingOnly(project, snapshot);

  const actions: RecoveryFlowResult["actions"] = ["recover", "continue"];
  if (!restoredProject.blueprint) actions.push("safe_mode");
  if (analysis.corruptedContent.length) actions.push("repair");
  if (!analysis.recoverable) actions.push("retry");

  return { analysis, restoredProject, actions };
}

export function buildMemoryFallbackGraph(project: BookProject): import("@/lib/memory-graph/types").MemoryGraphSnapshot {
  try {
    return buildMemoryGraph({ project });
  } catch {
    const degraded = createEmptyMemoryGraph(project.id);
    return {
      ...degraded,
      mode: "degraded",
      world: project.config?.forgeCanonBrief
        ? [
            {
              id: "fallback-canon",
              kind: "rule",
              label: "Canon fallback",
              description: project.config.forgeCanonBrief,
            },
          ]
        : [],
    };
  }
}

export function buildSafeBlueprintFallback(project: BookProject) {
  return buildFallbackBlueprintFromConfig(project.config);
}

export function loadForgeFromRecovery(projectId: string): GuidedInterviewState | null {
  const snap = getLatestRecoverySnapshot(projectId);
  return snap?.state.forgeState ?? null;
}
