import {
  ArrowRight,
  BookOpen,
  FileDown,
  ImagePlus,
  PenLine,
  Rocket,
  Sparkles,
  Stethoscope,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { t, tt } from "@/lib/i18n";
import type { NarrativeWorkspaceSnapshot, WorkspaceState } from "@/lib/immersive/workspace-state";
import {
  resolveEditorialHint,
  resolveSmartNextStep,
  resolveWorkspaceSubtitle,
  workspaceStateTheme,
  type SmartNextStepAction,
} from "@/lib/immersive/workspace-os-intelligence";
import type { NarrativeWorkspaceActions } from "./NarrativeWorkspace";
import { ActiveBookMockup } from "./ActiveBookMockup";

function stateLabelKey(state: WorkspaceState): string {
  switch (state) {
    case "drafting":
      return "wos_state_drafting";
    case "refining":
      return "wos_state_refining";
    case "publishing":
      return "wos_state_publishing";
    case "complete":
      return "wos_state_export_ready";
    default:
      return "nw_state_empty";
  }
}

function formatRelativeSession(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 2) return t("os_session_just_now");
  if (mins < 60) return tt("os_session_minutes_ago", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return tt("os_session_hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return tt("os_session_days_ago", { count: days });
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface ScriptoraWorkspaceOSProps {
  snapshot: NarrativeWorkspaceSnapshot;
  actions: NarrativeWorkspaceActions;
  className?: string;
}

export function ScriptoraWorkspaceOS({ snapshot, actions, className = "" }: ScriptoraWorkspaceOSProps) {
  const subtitle = resolveWorkspaceSubtitle(snapshot);
  const nextStep = resolveSmartNextStep(snapshot);
  const intelHint = resolveEditorialHint(snapshot.editorialScore);
  const theme = workspaceStateTheme(snapshot.state);

  const primaryLabel =
    snapshot.state === "complete" ? t("nw_export_book") : t("nw_continue_writing");
  const primaryAction =
    snapshot.state === "complete" ? actions.onExport : actions.onContinueWriting;

  const runSmartAction = (action: SmartNextStepAction) => {
    const map: Record<SmartNextStepAction, () => void> = {
      continue: actions.onContinueWriting,
      diagnose: actions.onDiagnoseChapter,
      cover: actions.onCover,
      export: actions.onExport,
      rewrite: actions.onRewrite,
      characters: actions.onCharacters,
      analyze: actions.onAnalyzeManuscript,
      create: actions.onCreateBook,
    };
    map[action]?.();
  };

  const quickActions: { icon: LucideIcon; label: string; action: () => void }[] = [
    { icon: BookOpen, label: t("nw_continue_writing"), action: actions.onContinueWriting },
    ...(actions.onGenerateChapter
      ? [
          {
            icon: PenLine,
            label: tt("writer_pipeline_generate_chapter", { n: snapshot.activeChapterIndex + 1 }),
            action: actions.onGenerateChapter,
          },
        ]
      : []),
    { icon: Stethoscope, label: t("nw_diagnose_chapter"), action: actions.onDiagnoseChapter },
    { icon: ImagePlus, label: t("cover_studio"), action: actions.onCover },
    { icon: FileDown, label: t("export_studio_title"), action: actions.onExport },
    { icon: Rocket, label: t("cc_card_publish"), action: actions.onKdpPublish ?? actions.onOpenToolbox },
    { icon: Users, label: t("character_studio_title"), action: actions.onCharacters },
  ];

  if (snapshot.state === "refining") {
    quickActions.splice(2, 0, { icon: Sparkles, label: t("rewrite_studio"), action: actions.onRewrite });
  }

  return (
    <section
      className={`scriptora-workspace-os border border-white/10 ${className}`}
      data-workspace-theme={theme}
      data-genre-theme={snapshot.genreTheme}
      aria-label={snapshot.title || t("nw_active_book")}
    >
      <div className="scriptora-workspace-os-bg" aria-hidden />

      <div className="scriptora-workspace-os-inner">
        {/* TOP HERO */}
        <div className="scriptora-workspace-hero">
          <div className="scriptora-workspace-hero__copy min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="scriptora-workspace-state">{t(stateLabelKey(snapshot.state))}</span>
              {snapshot.authorPenName && (
                <span className="scriptora-workspace-pen">{snapshot.authorPenName}</span>
              )}
              {snapshot.lastSessionIso && (
                <span className="text-[10px] text-white/38">
                  {t("os_last_session")}: {formatRelativeSession(snapshot.lastSessionIso)}
                </span>
              )}
            </div>
            <h1 className="scriptora-workspace-title">{snapshot.title || t("untitled")}</h1>
            {snapshot.genre && (
              <p className="text-xs capitalize text-white/45">{snapshot.genre}</p>
            )}
            <p className="scriptora-workspace-subtitle">{tt(subtitle.key, subtitle.vars)}</p>
          </div>
          <ActiveBookMockup snapshot={snapshot} />
        </div>

        {/* MODULES */}
        <div className="scriptora-workspace-modules">
          {/* Continue */}
          <article className="scriptora-wos-module scriptora-wos-module--primary">
            <p className="scriptora-wos-module__kicker">{t("wos_module_continue")}</p>
            <h2 className="scriptora-wos-module__title">
              {snapshot.currentChapter || t("wos_continue_default")}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/55">
              <span>
                {tt("os_words_written", { count: snapshot.wordCount.toLocaleString() })}
                {snapshot.targetWords > 0 && ` / ${snapshot.targetWords.toLocaleString()}`}
              </span>
              <span className="font-semibold tabular-nums text-white/70">
                {snapshot.progressPercent}%
              </span>
            </div>
            <div className="scriptora-wos-progress mt-2">
              <div
                className="scriptora-wos-progress__fill"
                style={{ width: `${snapshot.progressPercent}%` }}
              />
            </div>
            <button type="button" className="scriptora-wos-cta-primary mt-4" onClick={primaryAction}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          </article>

          {/* Editorial Intelligence */}
          <article className="scriptora-wos-module">
            <p className="scriptora-wos-module__kicker">{t("wos_module_intel")}</p>
            {snapshot.editorialScore != null ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-white">
                    {snapshot.editorialScore}
                  </span>
                  <span className="text-xs text-white/45">/100</span>
                </div>
                {intelHint && (
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{t(intelHint)}</p>
                )}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-white/50">{t("wos_intel_pending")}</p>
            )}
            <button
              type="button"
              className="scriptora-wos-cta-ghost mt-3"
              onClick={actions.onDiagnoseChapter}
            >
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
              {t("wos_cta_diagnose")}
            </button>
          </article>

          {/* Progress Map */}
          <article className="scriptora-wos-module scriptora-wos-module--wide">
            <p className="scriptora-wos-module__kicker">{t("wos_module_progress")}</p>
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>
                {tt("wos_chapters_done", {
                  done: snapshot.chaptersFilled,
                  total: snapshot.chapterTotal,
                })}
              </span>
              <span>{snapshot.progressPercent}%</span>
            </div>
            <div className="scriptora-wos-chapter-map mt-3" role="list">
              {snapshot.chapterFilledFlags.map((filled, i) => (
                <span
                  key={i}
                  role="listitem"
                  className="scriptora-wos-chapter-dot"
                  data-filled={filled ? "true" : "false"}
                  data-active={i === snapshot.activeChapterIndex ? "true" : "false"}
                  title={tt("wos_chapter_n", { n: i + 1 })}
                />
              ))}
            </div>
          </article>

          {/* Smart Next Step */}
          <article className="scriptora-wos-module scriptora-wos-module--wide scriptora-wos-module--smart">
            <p className="scriptora-wos-module__kicker">{t("wos_module_next")}</p>
            <p className="text-sm leading-relaxed text-white/78">
              {tt(nextStep.messageKey, nextStep.vars)}
            </p>
            <button
              type="button"
              className="scriptora-wos-cta-ghost mt-3"
              onClick={() => runSmartAction(nextStep.action)}
            >
              {t(nextStep.ctaKey)}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </article>
        </div>

        {/* Quick Actions */}
        <div className="scriptora-wos-quick" role="list">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                role="listitem"
                className="scriptora-wos-quick-btn"
                onClick={qa.action}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {qa.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-center pb-1">
          <button
            type="button"
            onClick={actions.onOpenToolbox}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-white/38 underline-offset-4 transition-colors hover:text-white/58 hover:underline"
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden />
            {t("nw_toolbox_link")}
          </button>
        </div>
      </div>
    </section>
  );
}
