import type { BookConfig, BookProject } from "@/types/book";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import { buildCanonFromState } from "@/lib/guided-interview/canon-genesis-engine";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { CanonSnapshotSlice } from "../types";

export function flattenCanonFacts(canon: ReturnType<typeof buildCanonFromState>): string[] {
  return [
    ...canon.world.facts,
    ...canon.characters.facts,
    ...canon.relationships.facts,
    ...canon.story.facts,
    ...canon.ending.facts,
    ...canon.book.facts,
  ];
}

export function selectCanonFromForgeState(state: GuidedInterviewState): CanonSnapshotSlice {
  const canon = buildCanonFromState(state);
  const facts = flattenCanonFacts(canon);
  return {
    facts,
    master: canon,
    locked: Boolean(state.canonLocked),
    brief: undefined,
    architecture: undefined,
    antiDriftRules: [
      ...(state.dnaLock?.antiDriftRules ?? []),
      ...(state.dnaLock?.forbiddenPatterns ?? []),
      ...(state.dnaLock?.whatBookIsNot ?? []),
    ].filter(Boolean),
    warnings: facts.length < 3 ? ["Canon Forge ancora sottile — poche ancore narrative."] : [],
  };
}

export function selectCanonFromConfig(config: BookConfig): CanonSnapshotSlice {
  const facts: string[] = [];
  if (config.forgeCanonBrief) facts.push(config.forgeCanonBrief);
  if (config.forgeStoryArchitecture) facts.push(config.forgeStoryArchitecture);
  if (config.characterBibleText) facts.push(config.characterBibleText);

  return {
    facts,
    brief: config.forgeCanonBrief,
    architecture: config.forgeStoryArchitecture,
    antiDriftRules: config.forgeAntiDriftRules ?? [],
    locked: Boolean(config.forgeCanonBrief || config.characterBibleText),
    warnings: facts.length < 2 ? ["Canon del progetto ancora leggero."] : [],
  };
}

export function selectCanonFromSeed(seed: ForgeInterviewSeed): CanonSnapshotSlice {
  if (seed.canon) {
    const facts = [
      ...seed.canon.world.facts,
      ...seed.canon.characters.facts,
      ...seed.canon.relationships.facts,
      ...seed.canon.story.facts,
      ...seed.canon.ending.facts,
      ...seed.canon.book.facts,
    ];
    return {
      facts,
      master: seed.canon,
      locked: Boolean(seed.canonLocked),
      antiDriftRules: [
        ...(seed.dnaLock?.antiDriftRules ?? []),
        ...(seed.dnaLock?.forbiddenPatterns ?? []),
        ...(seed.dnaLock?.whatBookIsNot ?? []),
      ].filter(Boolean),
      warnings: facts.length < 3 ? ["Canon handoff ancora sottile."] : [],
    };
  }
  return {
    facts: [],
    locked: Boolean(seed.canonLocked),
    antiDriftRules: seed.dnaLock?.antiDriftRules ?? [],
    warnings: [],
  };
}

export function mergeCanonSlices(
  primary: CanonSnapshotSlice,
  fallback?: CanonSnapshotSlice,
): CanonSnapshotSlice {
  if (!fallback || primary.facts.length >= 3) return primary;
  return {
    ...primary,
    facts: primary.facts.length ? primary.facts : fallback.facts,
    master: primary.master ?? fallback.master,
    brief: primary.brief ?? fallback.brief,
    architecture: primary.architecture ?? fallback.architecture,
    antiDriftRules: primary.antiDriftRules.length
      ? primary.antiDriftRules
      : fallback.antiDriftRules,
    locked: primary.locked || fallback.locked,
    warnings: [...primary.warnings, ...fallback.warnings].slice(0, 4),
  };
}

export function selectCanonFromProject(project: BookProject): CanonSnapshotSlice {
  return selectCanonFromConfig(project.config);
}
