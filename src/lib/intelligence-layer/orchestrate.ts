import type { BookProject } from "@/types/book";
import { consultForgeBrains } from "@/lib/guided-interview/forge-orchestrator";
import {
  runPostForgeManuscriptAnalysis,
  verifyCanonBeforeChapter,
} from "@/lib/guided-interview/post-forge-orchestrator";
import { buildForgeWriterContextBlock } from "@/lib/guided-interview/forge-writer-bridge";
import {
  blueprintText,
  effectiveGenre,
  effectiveTitle,
  firstChapterText,
  loadKdpContextForRadar,
  loadTitleDominationState,
  packagingPromise,
} from "@/lib/bestseller-radar/radar-adapters";
import { hasProjectCover } from "./adapters/from-sessions";
import { resolveBookContext, resolveBookContextFromForge, resolveBookContextFromProject } from "./resolve-book-context";
import type {
  CoverStudioContext,
  ForgeModuleContext,
  IntelligenceLayerResult,
  KdpLaunchContext,
  RadarContext,
  ResolveBookContextInput,
  WriterEngineContext,
} from "./types";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { runPreChapterMemoryCheck } from "@/lib/memory-graph/graph-recovery";

/**
 * Central read-only orchestration entry.
 * Consults existing brains without mutating state or blocking flows.
 */
export function consultIntelligenceLayer(
  input: ResolveBookContextInput = {},
): IntelligenceLayerResult {
  const context = resolveBookContext({
    ...input,
    includeSignals: input.includeSignals ?? Boolean(input.chapterText),
  });
  const forgeInsights = input.forgeState ? consultForgeBrains(input.forgeState) : [];

  let manuscriptReport: IntelligenceLayerResult["manuscriptReport"];
  if (input.project && input.chapterText) {
    manuscriptReport = runPostForgeManuscriptAnalysis({
      text: input.chapterText,
      config: input.project.config,
      project: input.project,
      chapterIndex: input.chapterIndex ?? 0,
      forgeState: input.forgeState ?? undefined,
    });
  }

  return { context, forgeInsights, manuscriptReport };
}

export function getForgeModuleContext(state: GuidedInterviewState): ForgeModuleContext {
  return {
    context: resolveBookContextFromForge(state),
    brainInsights: consultForgeBrains(state),
  };
}

export function getWriterEngineContext(
  project: BookProject,
  options?: { chapterIndex?: number; chapterText?: string },
): WriterEngineContext {
  const intel = consultIntelligenceLayer({
    project,
    chapterIndex: options?.chapterIndex,
    chapterText: options?.chapterText,
    includeSignals: Boolean(options?.chapterText),
  });

  const memoryCheck =
    options?.chapterIndex != null
      ? runPreChapterMemoryCheck({
          project,
          chapterIndex: options.chapterIndex,
          draftText: options?.chapterText,
        })
      : null;

  const canonWarnings =
    options?.chapterIndex != null
      ? [
          ...verifyCanonBeforeChapter({
            project,
            chapterIndex: options.chapterIndex,
            draftText: options?.chapterText,
          }),
          ...(memoryCheck?.warnings ?? []),
        ]
      : intel.context.canon.warnings;

  const memoryBlock = memoryCheck?.writerContextBlock?.trim() || "";
  const consolidatedBlock = [
    buildForgeWriterContextBlock(project.config) || intel.context.writerContextBlock || "",
    memoryBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    consolidatedBlock,
    canonWarnings,
    context: intel.context,
    memoryGraph: memoryCheck?.snapshot,
    memoryMode: memoryCheck?.mode,
  };
}

export function getCoverStudioContext(project: BookProject | null): CoverStudioContext | null {
  if (!project) return null;

  const context = resolveBookContextFromProject(project, { includeSignals: true });
  const marketNote = context.marketSignals[0]?.message || context.publishing.packagingPromise;

  return {
    title: context.publishing.title,
    subtitle: context.publishing.subtitle,
    genre: context.publishing.genre,
    language: context.publishing.language,
    overview: project.blueprint?.overview || context.narrative.blueprintOverview || "",
    authorName: project.config.authorName || project.config.author || "",
    marketAngle: marketNote,
    visualTone: context.dnaLock?.tone || project.config.tone || context.publishing.genre,
    context,
  };
}

export function getKdpLaunchContext(project?: BookProject | null): KdpLaunchContext {
  const context = resolveBookContext({ project, includeSignals: true });
  const kdp = project ? loadKdpContextForRadar(project) : loadKdpContextForRadar(null);

  return {
    idea: kdp?.idea || context.publishing.idea,
    genre: context.publishing.genre,
    language: context.publishing.language,
    chosenTitle: kdp?.chosenTitle || context.publishing.title,
    chosenSubtitle: kdp?.chosenSubtitle || context.publishing.subtitle,
    packagingPromise: context.publishing.packagingPromise,
    commercialNotes: context.marketSignals.map((signal) => signal.message),
    context,
  };
}

export function getRadarContext(project: BookProject | null): RadarContext {
  const context = resolveBookContext({ project, includeSignals: true });
  const kdp = project ? loadKdpContextForRadar(project) : loadKdpContextForRadar(null);
  const titleDomination = loadTitleDominationState();

  return {
    effectiveTitle: project ? effectiveTitle(project, kdp, titleDomination) : context.publishing.title,
    effectiveGenre: project ? effectiveGenre(project, kdp) : context.publishing.genre,
    packagingPromise: project ? packagingPromise(project, kdp) : context.publishing.packagingPromise,
    blueprintText: project ? blueprintText(project) : context.narrative.blueprintText || "",
    firstChapterText: project ? firstChapterText(project) : context.narrative.firstChapterExcerpt || "",
    hasCover: project ? hasProjectCover(project) : false,
    context,
  };
}

export function formatContextSummary(context: import("./types").UnifiedBookContext): string {
  const lines = [
    `Scriptora Intelligence — ${context.completeness} context`,
    context.publishing.title && `Titolo: ${context.publishing.title}`,
    context.publishing.genre && `Genere: ${context.publishing.genre}`,
    context.characters.characters.length > 0 &&
      `Personaggi: ${context.characters.characters.map((c) => c.name).filter(Boolean).join(", ")}`,
    context.canon.facts.length > 0 && `Canon: ${context.canon.facts.length} ancore`,
    context.editorialSignals[0] && `Editoriale: ${context.editorialSignals[0].message}`,
    context.marketSignals[0] && `Mercato: ${context.marketSignals[0].message}`,
  ].filter(Boolean);

  return lines.join(" · ");
}
