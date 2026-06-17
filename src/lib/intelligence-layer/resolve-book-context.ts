import type { BookProject } from "@/types/book";
import { buildForgeWriterContextBlock } from "@/lib/guided-interview/forge-writer-bridge";
import { adaptProjectToForgeSeed } from "./adapters/from-project";
import { adaptForgeSessionToSeed, adaptForgeStateToSeed } from "./adapters/from-forge";
import { hasProjectCover, readKdpSession, readTitleDominationSession } from "./adapters/from-sessions";
import {
  mergeCanonSlices,
  selectCanonFromConfig,
  selectCanonFromForgeState,
  selectCanonFromProject,
  selectCanonFromSeed,
} from "./selectors/canon";
import {
  selectCharactersFromConfig,
  selectCharactersFromForgeState,
  selectCharactersFromSeed,
} from "./selectors/characters";
import {
  selectNarrativeFromForgeState,
  selectNarrativeFromProject,
  selectNarrativeFromSeed,
} from "./selectors/narrative";
import {
  selectPublishingFromForgeState,
  selectPublishingFromProject,
  selectPublishingFromSeed,
} from "./selectors/publishing";
import {
  buildEditorialSignals,
  buildMarketSignals,
  buildNarrativeSignals,
  buildProjectPitch,
} from "./selectors/signals";
import type {
  ContextCompleteness,
  ContextSource,
  ResolveBookContextInput,
  UnifiedBookContext,
} from "./types";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";

function scoreCompleteness(sources: ContextSource[], context: UnifiedBookContext): ContextCompleteness {
  const score =
    (context.canon.facts.length >= 3 ? 2 : context.canon.facts.length > 0 ? 1 : 0) +
    (context.characters.characters.length > 0 ? 1 : 0) +
    (context.publishing.title ? 1 : 0) +
    (context.narrative.blueprintText || context.narrative.storyArchitecture ? 1 : 0) +
    (sources.includes("project") ? 1 : 0);

  if (score >= 5) return "full";
  if (score >= 2) return "partial";
  return "minimal";
}

function resolveForgeSeed(
  project?: BookProject | null,
  forgeState?: GuidedInterviewState | null,
): { seed: ForgeInterviewSeed | null; sources: ContextSource[] } {
  const sources: ContextSource[] = [];

  if (forgeState) {
    sources.push("forge-state");
    return { seed: adaptForgeStateToSeed(forgeState), sources };
  }

  if (project) {
    const fromProject = adaptProjectToForgeSeed(project);
    if (fromProject) {
      sources.push("project");
      return { seed: fromProject, sources };
    }
  }

  const fromSession = adaptForgeSessionToSeed();
  if (fromSession) {
    sources.push("forge-session");
    return { seed: fromSession, sources };
  }

  return { seed: null, sources };
}

export function resolveBookContext(input: ResolveBookContextInput = {}): UnifiedBookContext {
  const sources: ContextSource[] = [];
  const { project, forgeState, includeSignals = false, chapterText } = input;

  const { seed, sources: seedSources } = resolveForgeSeed(project, forgeState);
  sources.push(...seedSources);

  let publishing = project
    ? selectPublishingFromProject(project)
    : forgeState
      ? selectPublishingFromForgeState(forgeState)
      : seed
        ? selectPublishingFromSeed(seed)
        : {
            title: "",
            subtitle: "",
            idea: "",
            genre: "",
            language: "Italian",
            packagingPromise: "",
          };

  let characters = project
    ? selectCharactersFromConfig(project.config)
    : forgeState
      ? selectCharactersFromForgeState(forgeState)
      : seed
        ? selectCharactersFromSeed(seed)
        : { characters: [], deepPsychologyAvailable: false };

  let canon = project
    ? selectCanonFromProject(project)
    : forgeState
      ? selectCanonFromForgeState(forgeState)
      : seed
        ? selectCanonFromSeed(seed)
        : { facts: [], antiDriftRules: [], locked: false, warnings: [] };

  if (seed && !forgeState) {
    canon = mergeCanonSlices(canon, selectCanonFromSeed(seed));
    if (!characters.characters.length) {
      characters = selectCharactersFromSeed(seed);
    }
  }

  let narrative = project
    ? selectNarrativeFromProject(project)
    : forgeState
      ? selectNarrativeFromForgeState(forgeState)
      : seed
        ? selectNarrativeFromSeed(seed)
        : { genre: publishing.genre, tone: publishing.idea ? undefined : undefined };

  if (project?.config.forgeStoryArchitecture) {
    narrative = {
      ...narrative,
      storyArchitecture: project.config.forgeStoryArchitecture,
    };
  }

  if (characters.bibleText && !canon.brief) {
    canon = { ...canon, brief: project?.config.forgeCanonBrief || characters.bibleText };
  }

  const kdp = readKdpSession(project ?? null);
  if (kdp) sources.push("kdp-session");
  const titleDomination = readTitleDominationSession();
  if (titleDomination) sources.push("title-domination");
  if (project && hasProjectCover(project)) sources.push("cover");

  const dnaLock = forgeState?.dnaLock ?? seed?.dnaLock;
  const storyRoom = forgeState?.storyRoom ?? seed?.storyRoom;

  let editorialSignals = [] as UnifiedBookContext["editorialSignals"];
  let narrativeSignals = [] as UnifiedBookContext["narrativeSignals"];
  let marketSignals = [] as UnifiedBookContext["marketSignals"];

  const signalConfig = project?.config ?? {
    genre: publishing.genre as BookProject["config"]["genre"],
    language: publishing.language as BookProject["config"]["language"],
    tone: narrative.tone || "",
  };

  const signalText =
    chapterText ||
    narrative.firstChapterExcerpt ||
    publishing.idea ||
    narrative.blueprintOverview ||
    "";

  if (includeSignals && signalText) {
    editorialSignals = buildEditorialSignals(signalText, signalConfig);
    narrativeSignals = buildNarrativeSignals(signalText, signalConfig);
    const pitch = project ? buildProjectPitch(project) : publishing.packagingPromise || publishing.idea;
    const market = buildMarketSignals(pitch, publishing.genre, publishing.language);
    marketSignals = market.signals;
  }

  const writerContextBlock = project ? buildForgeWriterContextBlock(project.config) : "";

  const context: UnifiedBookContext = {
    version: 1,
    resolvedAt: new Date().toISOString(),
    sources: [...new Set(sources)],
    completeness: "minimal",
    projectId: project?.id,
    dnaLock,
    publishing,
    characters,
    canon,
    storyRoom,
    narrative,
    editorialSignals,
    narrativeSignals,
    marketSignals,
    forgeSeed: seed ?? undefined,
    writerContextBlock: writerContextBlock || undefined,
  };

  context.completeness = scoreCompleteness(context.sources, context);
  return context;
}

export function resolveBookContextFromForge(state: GuidedInterviewState): UnifiedBookContext {
  return resolveBookContext({ forgeState: state, includeSignals: true });
}

export function resolveBookContextFromProject(
  project: BookProject,
  options?: Omit<ResolveBookContextInput, "project">,
): UnifiedBookContext {
  return resolveBookContext({ ...options, project });
}
