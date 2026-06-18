import type { BookProject } from "@/types/book";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { buildMemoryGraph, buildMemoryGraphFromForge, buildMemoryGraphFromProject } from "../graph-builder";

export { buildMemoryGraphFromProject, buildMemoryGraphFromForge };

export function adaptProjectToMemoryGraph(project: BookProject) {
  return buildMemoryGraphFromProject(project);
}

export function adaptForgeToMemoryGraph(state: GuidedInterviewState, projectId?: string) {
  return buildMemoryGraphFromForge(state, projectId);
}

export function adaptUnifiedToMemoryGraph(input: {
  project?: BookProject | null;
  forgeState?: GuidedInterviewState | null;
}) {
  return buildMemoryGraph(input);
}
