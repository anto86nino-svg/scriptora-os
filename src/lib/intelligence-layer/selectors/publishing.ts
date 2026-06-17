import type { BookProject } from "@/types/book";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import {
  effectiveGenre,
  effectiveTitle,
  loadKdpContextForRadar,
  loadTitleDominationState,
  packagingPromise,
} from "@/lib/bestseller-radar/radar-adapters";
import {
  resolveForgeCommercialPromise,
  resolveForgeSubtitle,
  resolveForgeTitle,
} from "@/lib/guided-interview/forge-blueprint-handoff";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { PublishingSlice } from "../types";

export function selectPublishingFromProject(project: BookProject): PublishingSlice {
  const kdp = loadKdpContextForRadar(project);
  const titleDomination = loadTitleDominationState();
  const config = project.config;

  return {
    title: effectiveTitle(project, kdp, titleDomination) || config.title,
    subtitle: config.subtitle || kdp?.chosenSubtitle || "",
    idea: config.idea || kdp?.idea || "",
    genre: effectiveGenre(project, kdp) || String(config.genre || ""),
    language: String(config.language || kdp?.language || "Italian"),
    targetReader: config.targetReader,
    packagingPromise: packagingPromise(project, kdp),
    titleIntelligence: undefined,
  };
}

export function selectPublishingFromSeed(seed: ForgeInterviewSeed): PublishingSlice {
  const ex = seed.extracted ?? {};
  return {
    title: resolveForgeTitle(seed) || ex.bookTitle || "",
    subtitle: resolveForgeSubtitle(seed) || ex.bookSubtitle || "",
    idea: ex.promise || resolveForgeCommercialPromise(seed) || "",
    genre: String(seed.selectedGenre || ex.genre || ""),
    language: String(ex.language || "Italian"),
    targetReader: ex.targetReader,
    packagingPromise: resolveForgeCommercialPromise(seed) || ex.promise || "",
    titleIntelligence: seed.titleIntelligence,
  };
}

export function selectPublishingFromForgeState(state: GuidedInterviewState): PublishingSlice {
  const seed = {
    extracted: state.extracted,
    selectedGenre: state.selectedGenre,
    titleIntelligence: state.titleIntelligence,
    dnaLock: state.dnaLock,
    characters: state.characters,
    canon: state.canon,
    canonLocked: state.canonLocked,
  } as ForgeInterviewSeed;
  return selectPublishingFromSeed(seed);
}
