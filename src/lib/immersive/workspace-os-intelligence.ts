import type { NarrativeWorkspaceSnapshot, WorkspaceState } from "@/lib/immersive/workspace-state";

export type WorkspaceGenreTheme = "default" | "romance" | "thriller" | "fantasy" | "selfhelp";

export type SmartNextStepAction =
  | "continue"
  | "diagnose"
  | "cover"
  | "export"
  | "rewrite"
  | "characters"
  | "analyze"
  | "create";

export type SmartNextStep = {
  messageKey: string;
  ctaKey: string;
  action: SmartNextStepAction;
  vars?: Record<string, string | number>;
};

export function resolveGenreTheme(genre: string | null | undefined): WorkspaceGenreTheme {
  const g = String(genre || "").toLowerCase();
  if (/romance|love|romant|booktok/i.test(g)) return "romance";
  if (/thriller|mystery|crime|suspense|noir/i.test(g)) return "thriller";
  if (/fantasy|magic|sci-fi|science fiction|epic/i.test(g)) return "fantasy";
  if (/self.?help|business|personal develop|non-fiction|nonfiction/i.test(g)) return "selfhelp";
  return "default";
}

export function resolveWorkspaceSubtitle(
  snapshot: NarrativeWorkspaceSnapshot,
): { key: string; vars?: Record<string, string | number> } {
  const { state, currentChapter, progressPercent, editorialScore } = snapshot;

  if (state === "complete") {
    return { key: "wos_subtitle_export_ready" };
  }
  if (state === "publishing") {
    return { key: "wos_subtitle_near_export" };
  }
  if (state === "refining") {
    if (editorialScore != null && editorialScore < 70) {
      return { key: "wos_subtitle_pacing_attention", vars: { score: editorialScore } };
    }
    return { key: "wos_subtitle_editorial_review" };
  }
  if (currentChapter) {
    return { key: "wos_subtitle_chapter_active", vars: { chapter: currentChapter } };
  }
  if (progressPercent < 15) {
    return { key: "wos_subtitle_beginning" };
  }
  return { key: "wos_subtitle_momentum", vars: { percent: progressPercent } };
}

export function resolveSmartNextStep(snapshot: NarrativeWorkspaceSnapshot): SmartNextStep {
  const { state, progressPercent, editorialScore, hasBlueprint, chapterTotal, chaptersFilled } =
    snapshot;

  if (state === "complete") {
    return { messageKey: "wos_next_export_ready", ctaKey: "wos_cta_export", action: "export" };
  }

  if (state === "publishing") {
    return { messageKey: "wos_next_cover_missing", ctaKey: "wos_cta_cover", action: "cover" };
  }

  if (state === "refining") {
    if (editorialScore != null && editorialScore < 72) {
      return {
        messageKey: "wos_next_pacing_review",
        ctaKey: "wos_cta_diagnose",
        action: "diagnose",
        vars: { score: editorialScore },
      };
    }
    if (progressPercent >= 85) {
      return { messageKey: "wos_next_near_export", ctaKey: "wos_cta_continue", action: "continue" };
    }
    return { messageKey: "wos_next_rewrite_pass", ctaKey: "wos_cta_rewrite", action: "rewrite" };
  }

  if (!hasBlueprint) {
    return { messageKey: "wos_next_blueprint", ctaKey: "wos_cta_continue", action: "continue" };
  }

  if (chapterTotal > 0 && chaptersFilled === 0) {
    return { messageKey: "wos_next_first_chapter", ctaKey: "wos_cta_continue", action: "continue" };
  }

  if (snapshot.characterCount === 0 && chaptersFilled >= 2) {
    return { messageKey: "wos_next_characters", ctaKey: "wos_cta_characters", action: "characters" };
  }

  return {
    messageKey: "wos_next_keep_writing",
    ctaKey: "wos_cta_continue",
    action: "continue",
    vars: { chapter: snapshot.currentChapter || "" },
  };
}

export function resolveActiveBookBadges(
  snapshot: NarrativeWorkspaceSnapshot,
): [string, string, string] {
  const badges: string[] = [];
  if (snapshot.editorialScore != null) badges.push("wos_badge_editorial");
  if (snapshot.hasBlueprint) badges.push("wos_badge_blueprint");
  if (snapshot.characterCount > 0) badges.push("wos_badge_characters");
  if (snapshot.state === "complete" || snapshot.state === "publishing") badges.push("wos_badge_export");
  if (snapshot.state === "refining" || snapshot.state === "drafting") badges.push("wos_badge_story_doctor");

  const defaults: [string, string, string] = [
    "wos_badge_editorial",
    "wos_badge_story_doctor",
    "wos_badge_blueprint",
  ];
  while (badges.length < 3) {
    const next = defaults[badges.length];
    if (!badges.includes(next)) badges.push(next);
  }
  return [badges[0], badges[1], badges[2]];
}

export function workspaceStateTheme(state: WorkspaceState): string {
  switch (state) {
    case "drafting":
      return "drafting";
    case "refining":
      return "refining";
    case "publishing":
      return "publishing";
    case "complete":
      return "export-ready";
    default:
      return "drafting";
  }
}

export function resolveEditorialHint(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 80) return "wos_intel_excellent";
  if (score >= 65) return "wos_intel_solid";
  return "wos_intel_attention";
}
