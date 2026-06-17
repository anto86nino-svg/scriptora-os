import type { BookProject } from "@/types/book";
import { buildForgeSeedFromProject } from "@/lib/guided-interview/post-forge-orchestrator";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";

export function adaptProjectToForgeSeed(project: BookProject | null): ForgeInterviewSeed | null {
  if (!project) return null;
  return buildForgeSeedFromProject(project);
}

export function projectHasForgeMemory(project: BookProject): boolean {
  const config = project.config;
  return Boolean(
    config.characterBibleText ||
      config.forgeCanonBrief ||
      config.forgeStoryArchitecture ||
      config.forgeAntiDriftRules?.length ||
      config.characters?.length,
  );
}
