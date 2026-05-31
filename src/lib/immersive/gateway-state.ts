import type { BookProject } from "@/types/book";
import { getProjectCoverDataUrl } from "@/lib/cover-session";
import { loadReadingPosition } from "@/lib/reading-position";
import { loadReadingSessionSnapshot, notesForProject } from "@/lib/reading-session";
import { dailyGoalProgress, resolveDailyWordGoal } from "@/lib/immersive/gateway-daily-goal";
import {
  buildNarrativeWorkspaceSnapshot,
  resolveEditorialScore,
  type NarrativeWorkspaceSnapshot,
} from "@/lib/immersive/workspace-state";
import {
  resolveSmartNextStep,
  resolveWorkspaceSubtitle,
} from "@/lib/immersive/workspace-os-intelligence";
import { getWriterPresenceSnapshot } from "@/lib/immersive/writer-presence";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

export type GatewayInsight = {
  id: string;
  messageKey: string;
  vars?: Record<string, string | number>;
};

export type GatewayActivityItem = {
  id: string;
  messageKey: string;
  vars?: Record<string, string | number>;
  sortIso: string;
};

export type GatewaySnapshot = {
  workspace: NarrativeWorkspaceSnapshot;
  greeting: string;
  quote: string;
  coverDataUrl: string | null;
  dailyGoal: number;
  dailyProgress: ReturnType<typeof dailyGoalProgress>;
  insights: GatewayInsight[];
  activity: GatewayActivityItem[];
  resumeChapterIndex: number | null;
};

function chapterScore(chapter: BookProject["chapters"][number] | undefined): number | null {
  if (!chapter) return null;
  const c = chapter as { aiRating?: { score?: number }; qualityRating?: number };
  if (typeof c.aiRating?.score === "number") return Math.round(c.aiRating.score * 20);
  if (typeof c.qualityRating === "number") return Math.round(c.qualityRating * 20);
  return null;
}

export function buildGatewayInsights(
  snapshot: NarrativeWorkspaceSnapshot,
  project: BookProject | null,
): GatewayInsight[] {
  if (snapshot.state === "empty" || !project) {
    return [{ id: "onboard", messageKey: "gw_insight_onboard" }];
  }

  const insights: GatewayInsight[] = [];
  const next = resolveSmartNextStep(snapshot);
  insights.push({
    id: "next-step",
    messageKey: next.messageKey,
    vars: next.vars,
  });

  const chapters = project.chapters ?? [];
  const scoredRecent = chapters
    .map((ch, idx) => ({ idx, score: chapterScore(ch) }))
    .filter((item) => item.score != null)
    .slice(-4);

  if (scoredRecent.length >= 2) {
    const last = scoredRecent[scoredRecent.length - 1];
    const prev = scoredRecent[scoredRecent.length - 2];
    if (last.score != null && prev.score != null && last.score < prev.score - 8) {
      insights.push({
        id: "pacing-dip",
        messageKey: "gw_insight_pacing_dip",
        vars: { from: prev.idx + 1, to: last.idx + 1 },
      });
    }
  }

  const weakChapter = chapters
    .map((ch, idx) => ({ idx, score: chapterScore(ch) }))
    .filter((item) => item.score != null && item.score < 72)
    .sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0];

  if (weakChapter && insights.length < 3) {
    insights.push({
      id: "chapter-improve",
      messageKey: "gw_insight_chapter_improve",
      vars: { chapter: weakChapter.idx + 1, score: weakChapter.score ?? 0 },
    });
  }

  if (snapshot.characterCount === 0 && snapshot.chaptersFilled >= 2 && insights.length < 3) {
    insights.push({ id: "characters", messageKey: "gw_insight_characters_missing" });
  }

  const subtitle = resolveWorkspaceSubtitle(snapshot);
  if (insights.length < 3 && subtitle.key !== next.messageKey) {
    insights.push({
      id: "subtitle",
      messageKey: subtitle.key,
      vars: subtitle.vars,
    });
  }

  return insights.slice(0, 3);
}

export function buildGatewayActivity(
  project: BookProject | null,
  snapshot: NarrativeWorkspaceSnapshot,
): GatewayActivityItem[] {
  if (!project) return [];

  const items: GatewayActivityItem[] = [];
  const projectId = project.id;

  if (project.updatedAt) {
    items.push({
      id: "project-updated",
      messageKey: "gw_activity_manuscript_updated",
      sortIso: project.updatedAt,
    });
  }

  const chapters = project.chapters ?? [];
  chapters.forEach((ch, idx) => {
    if ((ch.content?.trim().length ?? 0) > 120) {
      items.push({
        id: `chapter-${idx}`,
        messageKey: "gw_activity_chapter_ready",
        vars: {
          chapter: formatChapterDisplayTitle(idx, ch.title, { config: project.config }),
        },
        sortIso: project.updatedAt || new Date().toISOString(),
      });
    }
  });

  if (getProjectCoverDataUrl(projectId)) {
    items.push({
      id: "cover",
      messageKey: "gw_activity_cover_updated",
      sortIso: project.updatedAt || new Date().toISOString(),
    });
  }

  if (project.blueprint?.overview?.trim()) {
    items.push({
      id: "blueprint",
      messageKey: "gw_activity_blueprint_ready",
      sortIso: project.createdAt || project.updatedAt || new Date().toISOString(),
    });
  }

  const reading = loadReadingSessionSnapshot();
  if (reading?.projectId === projectId) {
    items.push({
      id: "listening",
      messageKey: "gw_activity_listening_session",
      vars: { chapter: reading.chapterIndex + 1 },
      sortIso: reading.updatedAt,
    });
  }

  const notes = notesForProject(projectId);
  if (notes[0]) {
    items.push({
      id: `note-${notes[0].id}`,
      messageKey: "gw_activity_listening_note",
      sortIso: notes[0].createdAt,
    });
  }

  const score = resolveEditorialScore(project);
  if (score != null && snapshot.chaptersFilled >= 2) {
    items.push({
      id: "diagnostics",
      messageKey: "gw_activity_diagnostics",
      vars: { score },
      sortIso: project.updatedAt || new Date().toISOString(),
    });
  }

  return items
    .sort((a, b) => new Date(b.sortIso).getTime() - new Date(a.sortIso).getTime())
    .slice(0, 5);
}

export function buildGatewaySnapshot(
  projectsCount: number,
  project: BookProject | null,
  authorPenName?: string | null,
): GatewaySnapshot {
  const workspace = buildNarrativeWorkspaceSnapshot(projectsCount, project, authorPenName);
  const presence = getWriterPresenceSnapshot(project);
  const dailyGoal = resolveDailyWordGoal(workspace.targetWords);

  let resumeChapterIndex: number | null = null;
  if (project?.id) {
    const reading = loadReadingPosition(project.id, workspace.activeChapterIndex);
    if (reading && reading.sentenceIndex > 0) {
      resumeChapterIndex = reading.chapterIndex;
    } else {
      const session = loadReadingSessionSnapshot();
      if (session?.projectId === project.id && session.sentenceIndex > 0) {
        resumeChapterIndex = session.chapterIndex;
      }
    }
  }

  return {
    workspace,
    greeting: presence.greeting,
    quote: presence.quote,
    coverDataUrl: project?.id ? getProjectCoverDataUrl(project.id) : null,
    dailyGoal,
    dailyProgress: dailyGoalProgress(dailyGoal),
    insights: buildGatewayInsights(workspace, project),
    activity: buildGatewayActivity(project, workspace),
    resumeChapterIndex,
  };
}
