/**
 * Contextual actions for Requirement Gate CTAs.
 * Prefer in-page events; navigate with ?open= only when the current route cannot handle the intent.
 */

export type RequirementActionIntent =
  | "open_author_identity"
  | "open_new_book"
  | "open_projects"
  | "open_editor"
  | "open_export_studio"
  | "open_manuscript_lab"
  | "open_cover_studio"
  | "open_kdp_publish"
  | "open_pricing"
  | "focus_book_title"
  | "focus_chapter"
  | "focus_manuscript_input"
  | "retry_current_action"
  | "stay_here"
  | "navigate_auth";

/** Custom events listened to by Dashboard, Editor, and embedded dialogs. */
export const REQUIREMENT_ACTION_EVENTS = {
  open_author_identity: "scriptora-open-author-identity",
  open_new_book: "scriptora-open-new-book",
  open_projects: "scriptora-open-projects",
  open_export_studio: "scriptora-open-export-studio",
  open_manuscript_lab: "scriptora-open-manuscript-lab",
  open_cover_studio: "scriptora-open-cover-studio",
  open_kdp_publish: "scriptora-open-kdp-panel",
  focus_book_title: "scriptora-focus-book-title",
  focus_chapter: "scriptora-focus-chapter",
  focus_manuscript_input: "scriptora-focus-manuscript-input",
  retry_current_action: "scriptora-retry-current-action",
} as const;

export type RequirementActionEventKey = keyof typeof REQUIREMENT_ACTION_EVENTS;

export interface RequirementActionDetail {
  chapterIndex?: number;
  feature?: string;
}

const INTENT_HANDLER_PATHS: Partial<Record<RequirementActionIntent, string[]>> = {
  open_author_identity: ["/dashboard", "/app"],
  open_new_book: ["/dashboard", "/app"],
  open_projects: ["/dashboard", "/app"],
  open_editor: ["/app"],
  open_export_studio: ["/dashboard"],
  open_manuscript_lab: ["/dashboard"],
  open_cover_studio: ["/dashboard", "/app"],
  open_kdp_publish: ["/app"],
  open_pricing: ["/pricing"],
  focus_book_title: ["/app"],
  focus_chapter: ["/app"],
  focus_manuscript_input: ["/dashboard"],
  stay_here: ["/dashboard", "/app", "/pricing"],
  retry_current_action: ["/dashboard", "/app"],
};

export function getFallbackRoute(
  intent: RequirementActionIntent,
  detail?: RequirementActionDetail,
): string | null {
  switch (intent) {
    case "open_author_identity":
      return "/dashboard?open=author-identity";
    case "open_new_book":
      return "/dashboard?open=launch-book";
    case "open_projects":
      return "/dashboard?open=projects";
    case "open_editor":
      return "/app";
    case "open_export_studio":
      return "/dashboard?open=export-studio";
    case "open_manuscript_lab":
      return "/dashboard?open=manuscript-analyzer";
    case "open_cover_studio":
      return "/dashboard?open=cover-studio";
    case "open_kdp_publish":
      return "/app?open=publish";
    case "open_pricing":
      return detail?.feature
        ? `/pricing?feature=${encodeURIComponent(detail.feature)}`
        : "/pricing";
    case "focus_book_title":
      return "/app?open=book-title";
    case "focus_chapter":
      return detail?.chapterIndex != null
        ? `/app?open=chapter&index=${detail.chapterIndex}`
        : "/app?open=chapter";
    case "focus_manuscript_input":
      return "/dashboard?open=manuscript-analyzer&focus=input";
    case "navigate_auth":
      return "/auth";
    default:
      return null;
  }
}

export function canHandleIntentInPlace(intent: RequirementActionIntent): boolean {
  if (typeof window === "undefined") return false;
  const paths = INTENT_HANDLER_PATHS[intent];
  if (!paths?.length) return false;
  const pathname = window.location.pathname;
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function dispatchRequirementIntent(
  intent: RequirementActionIntent,
  detail?: RequirementActionDetail,
): void {
  if (typeof window === "undefined") return;
  const eventName = REQUIREMENT_ACTION_EVENTS[intent as RequirementActionEventKey];
  if (eventName) {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

export function executeRequirementIntent(
  intent: RequirementActionIntent,
  navigate: (to: string) => void,
  detail?: RequirementActionDetail,
): void {
  if (intent === "stay_here") return;

  dispatchRequirementIntent(intent, detail);

  if (canHandleIntentInPlace(intent)) return;

  const fallback = getFallbackRoute(intent, detail);
  if (fallback) navigate(fallback);
}

/** Query param values consumed once on Dashboard / Editor mount. */
export type DashboardOpenParam =
  | "author-identity"
  | "export-studio"
  | "manuscript-analyzer"
  | "cover-studio"
  | "new-book"
  | "launch-book"
  | "projects";

export function parseOpenQuery(search: string): {
  open: string | null;
  focus: string | null;
  chapterIndex: number | null;
} {
  const params = new URLSearchParams(search);
  const open = params.get("open");
  const focus = params.get("focus");
  const rawIndex = params.get("index");
  const chapterIndex = rawIndex != null && rawIndex !== "" ? Number(rawIndex) : null;
  return {
    open,
    focus,
    chapterIndex: Number.isFinite(chapterIndex) ? chapterIndex : null,
  };
}

export function stripOpenQuery(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("open");
  params.delete("focus");
  params.delete("index");
  const next = params.toString();
  return next ? `?${next}` : "";
}
