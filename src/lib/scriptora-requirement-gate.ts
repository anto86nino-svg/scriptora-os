import { t, tt } from "@/lib/i18n";
import type { FeatureKey } from "@/lib/subscription";
import { paywallCopyFor } from "@/lib/subscription";
import type { BookProject } from "@/types/book";
import { chaptersWithContent } from "@/lib/export-quality-engine";
import {
  applyAuthorIdentityToConfig,
  getSelectedAuthorIdentity,
  normalizeAuthorIdentity,
} from "@/lib/author-identity";
import type { RequirementActionDetail, RequirementActionIntent } from "@/lib/scriptora-requirement-actions";
import {
  dispatchRequirementIntent,
  executeRequirementIntent,
  canHandleIntentInPlace,
  getFallbackRoute,
} from "@/lib/scriptora-requirement-actions";

/** @deprecated Use query param ?open=author-identity via executeRequirementIntent */
export const OPEN_AUTHOR_IDENTITY_SESSION_KEY = "scriptora-open-author-identity";

export type RequirementId =
  | "auth_required"
  | "plan_required"
  | "missing_author_identity"
  | "missing_project"
  | "missing_book_title"
  | "missing_blueprint"
  | "missing_chapters"
  | "missing_chapter_content"
  | "incomplete_book"
  | "missing_manuscript"
  | "manuscript_too_short"
  | "missing_cover"
  | "missing_export_metadata"
  | "epub_not_ready"
  | "export_failed"
  | "missing_voice_text"
  | "voice_not_supported"
  | "voice_autoplay_blocked"
  | "unexpected_error";

export type RequirementActionType = "route" | "callback" | "intent";

export interface RequirementAction {
  labelKey: string;
  type: RequirementActionType;
  route?: string;
  intent?: RequirementActionIntent;
  detail?: RequirementActionDetail;
}

export interface RequirementGatePayload {
  id: RequirementId;
  /** Cosa manca — titolo diagnostico */
  title: string;
  /** Perché è importante */
  why: string;
  /** Cosa fare ora — guida immediata prima del pulsante */
  actionHint: string;
  primaryAction: RequirementAction & { label: string };
  secondaryAction?: RequirementAction & { label: string };
  /** Dettaglio opzionale (es. gap EPUB rilevati) */
  detail?: string;
}

export interface BuildRequirementOptions {
  detail?: string;
  vars?: Record<string, string | number>;
  feature?: FeatureKey;
  primaryRoute?: string;
  secondaryRoute?: string;
  primaryIntent?: RequirementActionIntent;
  secondaryIntent?: RequirementActionIntent;
  actionDetail?: RequirementActionDetail;
}

type PresetAction = {
  labelKey: string;
  intent?: RequirementActionIntent;
  route?: string;
};

const PRESETS: Record<
  RequirementId,
  {
    titleKey: string;
    whyKey: string;
    actionKey: string;
    primary: PresetAction;
    secondary?: PresetAction;
  }
> = {
  auth_required: {
    titleKey: "req_auth_title",
    whyKey: "req_auth_why",
    actionKey: "req_auth_action",
    primary: { labelKey: "req_sign_in", intent: "navigate_auth" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  plan_required: {
    titleKey: "req_plan_title",
    whyKey: "req_plan_why",
    actionKey: "req_plan_action",
    primary: { labelKey: "req_view_plans", intent: "open_pricing" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  missing_author_identity: {
    titleKey: "req_author_identity_title",
    whyKey: "req_author_identity_why",
    actionKey: "req_author_identity_action",
    primary: { labelKey: "req_set_author_identity", intent: "open_author_identity" },
    secondary: { labelKey: "req_export_with_pen_name" },
  },
  missing_project: {
    titleKey: "req_missing_project_title",
    whyKey: "req_missing_project_why",
    actionKey: "req_missing_project_action",
    primary: { labelKey: "req_create_project", intent: "open_new_book" },
    secondary: { labelKey: "req_open_recent_project", intent: "open_editor" },
  },
  missing_book_title: {
    titleKey: "req_missing_title_title",
    whyKey: "req_missing_title_why",
    actionKey: "req_missing_title_action",
    primary: { labelKey: "req_complete_book_data", intent: "focus_book_title" },
    secondary: { labelKey: "req_stay_in_editor", intent: "stay_here" },
  },
  missing_blueprint: {
    titleKey: "req_missing_blueprint_title",
    whyKey: "req_missing_blueprint_why",
    actionKey: "req_missing_blueprint_action",
    primary: { labelKey: "req_go_blueprint", intent: "open_editor" },
    secondary: { labelKey: "req_stay_in_editor", intent: "stay_here" },
  },
  missing_chapters: {
    titleKey: "req_missing_chapters_title",
    whyKey: "req_missing_chapters_why",
    actionKey: "req_missing_chapters_action",
    primary: { labelKey: "req_go_editor", intent: "open_editor" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  missing_chapter_content: {
    titleKey: "req_missing_chapter_content_title",
    whyKey: "req_missing_chapter_content_why",
    actionKey: "req_missing_chapter_content_action",
    primary: { labelKey: "req_write_chapter", intent: "focus_chapter" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  incomplete_book: {
    titleKey: "req_incomplete_book_title",
    whyKey: "req_incomplete_book_why",
    actionKey: "req_incomplete_book_action",
    primary: { labelKey: "req_go_editor", intent: "open_editor" },
    secondary: { labelKey: "req_open_export_studio", intent: "open_export_studio" },
  },
  missing_manuscript: {
    titleKey: "req_missing_manuscript_title",
    whyKey: "req_missing_manuscript_why",
    actionKey: "req_missing_manuscript_action",
    primary: { labelKey: "req_upload_manuscript", intent: "focus_manuscript_input" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  manuscript_too_short: {
    titleKey: "req_manuscript_short_title",
    whyKey: "req_manuscript_short_why",
    actionKey: "req_manuscript_short_action",
    primary: { labelKey: "req_paste_more_text", intent: "focus_manuscript_input" },
    secondary: { labelKey: "req_import_chapter_file", intent: "focus_manuscript_input" },
  },
  missing_cover: {
    titleKey: "req_missing_cover_title",
    whyKey: "req_missing_cover_why",
    actionKey: "req_missing_cover_action",
    primary: { labelKey: "req_open_cover_studio", intent: "open_cover_studio" },
    secondary: { labelKey: "req_export_without_cover", intent: "open_export_studio" },
  },
  missing_export_metadata: {
    titleKey: "req_export_metadata_title",
    whyKey: "req_export_metadata_why",
    actionKey: "req_export_metadata_action",
    primary: { labelKey: "req_complete_book_data", intent: "focus_book_title" },
    secondary: { labelKey: "req_open_export_studio", intent: "open_export_studio" },
  },
  epub_not_ready: {
    titleKey: "req_epub_not_ready_title",
    whyKey: "req_epub_not_ready_why",
    actionKey: "req_epub_not_ready_action",
    primary: { labelKey: "req_complete_book_data", intent: "open_editor" },
    secondary: { labelKey: "req_open_export_studio", intent: "open_export_studio" },
  },
  export_failed: {
    titleKey: "req_export_failed_title",
    whyKey: "req_export_failed_why",
    actionKey: "req_export_failed_action",
    primary: { labelKey: "req_open_export_studio", intent: "open_export_studio" },
    secondary: { labelKey: "req_stay_in_editor", intent: "stay_here" },
  },
  missing_voice_text: {
    titleKey: "req_voice_text_title",
    whyKey: "req_voice_text_why",
    actionKey: "req_voice_text_action",
    primary: { labelKey: "req_go_editor", intent: "open_editor" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  voice_not_supported: {
    titleKey: "req_voice_unsupported_title",
    whyKey: "req_voice_unsupported_why",
    actionKey: "req_voice_unsupported_action",
    primary: { labelKey: "req_back_dashboard", route: "/dashboard" },
    secondary: { labelKey: "req_stay_in_editor", intent: "stay_here" },
  },
  voice_autoplay_blocked: {
    titleKey: "req_voice_autoplay_title",
    whyKey: "req_voice_autoplay_why",
    actionKey: "req_voice_autoplay_action",
    primary: { labelKey: "req_try_voice_again", intent: "open_editor" },
    secondary: { labelKey: "req_not_now", intent: "stay_here" },
  },
  unexpected_error: {
    titleKey: "req_unexpected_title",
    whyKey: "req_unexpected_why",
    actionKey: "req_unexpected_action",
    primary: { labelKey: "req_back_dashboard", route: "/dashboard" },
    secondary: { labelKey: "req_retry", intent: "retry_current_action" },
  },
};

function actionFromPreset(
  preset: PresetAction,
  options: {
    overrideRoute?: string;
    overrideIntent?: RequirementActionIntent;
    vars?: Record<string, string | number>;
    actionDetail?: RequirementActionDetail;
  } = {},
): RequirementAction & { label: string } {
  const intent = options.overrideIntent ?? preset.intent;
  const route =
    options.overrideRoute ??
    preset.route ??
    (intent ? getFallbackRoute(intent, options.actionDetail) ?? undefined : undefined);

  return {
    labelKey: preset.labelKey,
    label: tt(preset.labelKey, options.vars),
    type: intent ? "intent" : "route",
    intent,
    route,
    detail: options.actionDetail,
  };
}

export function getPrimaryIntentForRequirement(id: RequirementId): RequirementActionIntent | undefined {
  return PRESETS[id].primary.intent;
}

export function buildRequirement(
  id: RequirementId,
  options: BuildRequirementOptions = {},
): RequirementGatePayload {
  const preset = PRESETS[id];
  let title = tt(preset.titleKey, options.vars);
  let why = tt(preset.whyKey, options.vars);
  let actionHint = tt(preset.actionKey, options.vars);

  if (id === "plan_required" && options.feature) {
    const copy = paywallCopyFor(options.feature);
    title = copy.title;
    why = copy.subtitle;
    actionHint = t("req_plan_action");
  }

  const actionDetail: RequirementActionDetail = {
    ...options.actionDetail,
    ...(options.feature ? { feature: options.feature } : {}),
  };

  return {
    id,
    title,
    why,
    actionHint,
    detail: options.detail,
    primaryAction: actionFromPreset(preset.primary, {
      overrideRoute: options.primaryRoute,
      overrideIntent: options.primaryIntent,
      vars: options.vars,
      actionDetail,
    }),
    secondaryAction: preset.secondary
      ? actionFromPreset(preset.secondary, {
          overrideRoute: options.secondaryRoute,
          overrideIntent: options.secondaryIntent,
          vars: options.vars,
          actionDetail,
        })
      : undefined,
  };
}

function isGenericAuthorName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return !lower || lower === "unknown author" || lower === "autore sconosciuto" || lower === "not specified";
}

export function getExportAuthorGap(project: BookProject): {
  needsIdentityPrompt: boolean;
  activePenName: string;
} {
  const config = project.config;
  const projectAuthor = String(
    config.authorIdentity?.penName ||
      config.authorName ||
      config.author ||
      config.writerName ||
      "",
  ).trim();
  const hasProjectIdentity = !!normalizeAuthorIdentity(config.authorIdentity);
  const hasExplicitAuthor = !isGenericAuthorName(projectAuthor);
  const activePenName =
    (typeof window !== "undefined" ? getSelectedAuthorIdentity().penName : "")?.trim() || "";

  return {
    needsIdentityPrompt: !hasExplicitAuthor && !hasProjectIdentity,
    activePenName,
  };
}

export function applyActiveAuthorIdentityToProject(project: BookProject): BookProject {
  const identity = getSelectedAuthorIdentity();
  return {
    ...project,
    config: applyAuthorIdentityToConfig(project.config, identity),
  };
}

/** Opens author identity in-place via event, or SPA navigate with ?open= fallback. */
export function openAuthorIdentitySetup(navigate?: (to: string) => void): void {
  if (typeof window === "undefined") return;
  if (navigate) {
    executeRequirementIntent("open_author_identity", navigate);
    return;
  }
  dispatchRequirementIntent("open_author_identity");
  if (!canHandleIntentInPlace("open_author_identity")) {
    sessionStorage.setItem(OPEN_AUTHOR_IDENTITY_SESSION_KEY, "1");
  }
}

export function summarizeEpubValidationErrors(errors: string[]): string {
  if (!errors.length) return "";
  const emptyChapters = errors.filter(e => /no content/i.test(e)).length;
  const missingTitles = errors.filter(e => /no title/i.test(e)).length;
  const parts: string[] = [];
  if (emptyChapters) parts.push(tt("req_epub_detail_empty_chapters", { count: emptyChapters }));
  if (missingTitles) parts.push(tt("req_epub_detail_missing_titles", { count: missingTitles }));
  if (errors.some(e => /front matter/i.test(e))) parts.push(t("req_epub_detail_front_matter"));
  if (errors.some(e => /back matter/i.test(e))) parts.push(t("req_epub_detail_back_matter"));
  if (!parts.length) parts.push(tt("req_epub_detail_generic", { count: errors.length }));
  return parts.join(" · ");
}

export function firstIncompleteChapterIndex(project: BookProject): number {
  const idx = (project.chapters || []).findIndex(ch => !String(ch.content || "").trim());
  return idx >= 0 ? idx : 0;
}

export function detectExportBlock(project: BookProject | null | undefined): RequirementId | null {
  if (!project) return "missing_project";
  const title = project.config.title?.trim();
  if (!title || title === "Untitled" || title === "Senza titolo") return "missing_book_title";
  const filled = chaptersWithContent(project);
  if (!filled) return "missing_chapters";
  return null;
}

/** Maps raw thrown errors to human requirement payloads when possible. */
export function requirementFromError(error: unknown): RequirementGatePayload {
  const message = error instanceof Error ? error.message : String(error || "");
  const lower = message.toLowerCase();
  if (/auth|session|401|403|sign in|login/i.test(lower)) {
    return buildRequirement("auth_required");
  }
  if (/plan|upgrade|pro|premium|quota|limit/i.test(lower)) {
    return buildRequirement("plan_required");
  }
  return buildRequirement("export_failed", {
    detail: t("req_export_failed_detail"),
  });
}
