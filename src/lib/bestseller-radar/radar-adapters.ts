import type { BookProject } from "@/types/book";
import type { MarketAnalysis, KDPPackaging, TitleVariants } from "@/lib/kdp/money-engine";
import type { TitleDominationResult } from "@/lib/kdp/money-engine";
import { loadKdpLaunchSession } from "@/lib/kdp/kdp-launch-session";
import { getProjectCoverDataUrl } from "@/lib/cover-session";

const TITLE_DOMINATION_KEY = "kdp-title-domination-state";

export type RadarKdpContext = {
  analysis: MarketAnalysis | null;
  packaging: KDPPackaging | null;
  titles: TitleVariants | null;
  chosenTitle?: string;
  chosenSubtitle?: string;
  idea?: string;
  genre?: string;
  language?: string;
};

export type RadarTitleDominationContext = {
  result: TitleDominationResult | null;
  input?: {
    idea?: string;
    genre?: string;
    targetReader?: string;
    desiredPromise?: string;
  };
};

export type RadarEngineInput = {
  project: BookProject | null;
  kdp: RadarKdpContext | null;
  titleDomination: RadarTitleDominationContext | null;
  hasCover: boolean;
  italian: boolean;
};

export function loadTitleDominationState(): RadarTitleDominationContext | null {
  try {
    const raw = sessionStorage.getItem(TITLE_DOMINATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { input?: RadarTitleDominationContext["input"]; result?: TitleDominationResult };
    return { result: parsed.result ?? null, input: parsed.input };
  } catch {
    return null;
  }
}

export function loadKdpContextForRadar(project?: BookProject | null): RadarKdpContext | null {
  const session = loadKdpLaunchSession();
  if (!session) return null;

  const looselyMatches = !project || (
    !session.config.idea
    || session.config.idea.toLowerCase().includes((project.config.idea || project.config.title || "").toLowerCase().slice(0, 12))
    || (project.config.title && session.config.chosenTitle?.toLowerCase() === project.config.title.toLowerCase())
  );

  if (!looselyMatches && project) return null;

  return {
    analysis: session.analysis,
    packaging: session.packaging,
    titles: session.titles,
    chosenTitle: session.config.chosenTitle,
    chosenSubtitle: session.config.chosenSubtitle,
    idea: session.config.idea,
    genre: session.config.genre,
    language: session.config.language,
  };
}

export function buildRadarInput(project: BookProject | null): RadarEngineInput {
  const italian = project
    ? String(project.config.language || "").toLowerCase().includes("ital")
    : true;

  return {
    project,
    kdp: project ? loadKdpContextForRadar(project) : loadKdpContextForRadar(null),
    titleDomination: loadTitleDominationState(),
    hasCover: project ? Boolean(getProjectCoverDataUrl(project.id)) : false,
    italian,
  };
}

export function firstChapterText(project: BookProject | null): string {
  if (!project?.chapters?.length) return "";
  const ch = project.chapters[0];
  const subs = ch.subchapters?.map((s) => s.content).filter(Boolean).join("\n\n") || "";
  return [ch.content, subs].filter(Boolean).join("\n\n").trim();
}

export function blueprintText(project: BookProject | null): string {
  if (!project?.blueprint) return "";
  const bp = project.blueprint;
  const outlines = bp.chapterOutlines?.map((o) => `${o.title}\n${o.summary}`).join("\n\n") || "";
  return [bp.overview, bp.emotionalArc, outlines].filter(Boolean).join("\n\n");
}

export function packagingPromise(project: BookProject | null, kdp: RadarKdpContext | null): string {
  return (
    project?.config.subtitle
    || kdp?.chosenSubtitle
    || kdp?.analysis?.recommendedAngle
    || project?.config.idea
    || kdp?.idea
    || ""
  ).trim();
}

export function effectiveTitle(project: BookProject | null, kdp: RadarKdpContext | null, td: RadarTitleDominationContext | null): string {
  return (
    project?.config.title
    || kdp?.chosenTitle
    || td?.result?.winner?.title
    || ""
  ).trim();
}

export function getKdpLaunchSessionForRadar(project?: import("@/types/book").BookProject | null) {
  return loadKdpContextForRadar(project);
}

export function effectiveGenre(project: BookProject | null, kdp: RadarKdpContext | null): string {
  return String(project?.config.genre || kdp?.genre || kdp?.analysis?.subNiche || "").trim();
}
