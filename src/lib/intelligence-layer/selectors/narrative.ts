import type { BookProject } from "@/types/book";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import { blueprintText, firstChapterText } from "@/lib/bestseller-radar/radar-adapters";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { NarrativeSlice } from "../types";

export function selectNarrativeFromProject(project: BookProject): NarrativeSlice {
  return {
    blueprintOverview: project.blueprint?.overview,
    blueprintText: blueprintText(project),
    storyArchitecture: project.config.forgeStoryArchitecture,
    firstChapterExcerpt: firstChapterText(project).slice(0, 1200) || undefined,
    genre: String(project.config.genre || ""),
    tone: project.config.tone,
  };
}

export function selectNarrativeFromSeed(seed: ForgeInterviewSeed): NarrativeSlice {
  const ex = seed.extracted ?? {};
  return {
    storyArchitecture: undefined,
    blueprintOverview: ex.promise,
    genre: String(seed.selectedGenre || ex.genre || ""),
    tone: ex.emotionalTone,
  };
}

export function selectNarrativeFromForgeState(state: GuidedInterviewState): NarrativeSlice {
  const ex = state.extracted ?? {};
  return {
    blueprintOverview: ex.promise,
    storyArchitecture: undefined,
    genre: String(state.selectedGenre || ex.genre || ""),
    tone: ex.emotionalTone || state.selectedTone,
  };
}
