import { ArrowRight, BookOpen, FileUp, Plus, Sparkles, Users, Wand2, AudioLines, ImagePlus, FileDown, Library, type LucideIcon } from "lucide-react";
import type { NarrativeWorkspaceSnapshot, WorkspaceState } from "@/lib/immersive/workspace-state";
import { t, tt } from "@/lib/i18n";
import { CreativeConsoleHero } from "./CreativeConsoleHero";

export type NarrativeWorkspaceActions = {
  onContinueWriting: () => void;
  onCreateBook: () => void;
  onImportManuscript: () => void;
  onAnalyzeManuscript: () => void;
  onDiagnoseChapter: () => void;
  onCharacters: () => void;
  onVoice: () => void;
  onRewrite: () => void;
  onCover: () => void;
  onExport: () => void;
  onLibrary: () => void;
  onOpenToolbox: () => void;
  onAuthorIdentity?: () => void;
  onKdpPublish?: () => void;
};

type NarrativeWorkspaceProps = {
  snapshot: NarrativeWorkspaceSnapshot;
  actions: NarrativeWorkspaceActions;
  className?: string;
};

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

function StateLabel({ state }: { state: WorkspaceState }) {
  const key =
    state === "drafting"
      ? "nw_state_drafting"
      : state === "refining"
        ? "nw_state_refining"
        : state === "publishing"
          ? "nw_state_publishing"
          : state === "complete"
            ? "nw_state_complete"
            : "nw_state_empty";
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
      {t(key)}
    </span>
  );
}


function ContextAction({
  label,
  onClick,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs font-medium text-white/80 transition-colors hover:border-white/18 hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      <Icon className="h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
      {label}
    </button>
  );
}

export function NarrativeWorkspace({ snapshot, actions, className = "" }: NarrativeWorkspaceProps) {
  const { state } = snapshot;

  if (state === "empty") {
    return (
      <CreativeConsoleHero
        className={className}
        actions={actions}
        onOpenToolbox={actions.onOpenToolbox}
      />
    );
  }

  const primaryLabel =
    state === "complete"
      ? t("nw_export_book")
      : t("nw_continue_writing");

  const primaryAction =
    state === "complete"
      ? actions.onExport
      : actions.onContinueWriting;

  return (
    <section className={`w-full min-w-0 ${className}`} aria-label={snapshot.title || t("nw_active_book")}>
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <StateLabel state={state} />
          {snapshot.lastSessionIso && (
            <span className="text-[11px] text-white/42">
              {t("os_last_session")}: {formatRelativeSession(snapshot.lastSessionIso)}
            </span>
          )}
        </div>

        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          {snapshot.title || t("untitled")}
        </h1>

        {snapshot.genre && (
          <p className="mt-1 text-sm capitalize text-white/50">{snapshot.genre}</p>
        )}

        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-white/45" aria-hidden />
              {tt("os_words_written", { count: snapshot.wordCount.toLocaleString() })}
              {snapshot.targetWords > 0 && (
                <span className="text-white/40">
                  / {snapshot.targetWords.toLocaleString()}
                </span>
              )}
            </span>
            {snapshot.currentChapter && state !== "complete" && (
              <span className="truncate text-white/55">{snapshot.currentChapter}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-white/70 transition-all"
                style={{ width: `${snapshot.progressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-white/60">
              {snapshot.progressPercent}%
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={primaryAction}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 sm:w-auto sm:min-w-[220px]"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>

        <ContextualActions state={state} snapshot={snapshot} actions={actions} />
      </div>

      <ToolboxLink onOpen={actions.onOpenToolbox} />
    </section>
  );
}

function ContextualActions({
  state,
  snapshot,
  actions,
}: {
  state: WorkspaceState;
  snapshot: NarrativeWorkspaceSnapshot;
  actions: NarrativeWorkspaceActions;
}) {
  if (state === "drafting") {
    return (
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <ContextAction label={t("nw_diagnose_chapter")} onClick={actions.onDiagnoseChapter} icon={Wand2} />
        <ContextAction
          label={snapshot.characterCount > 0 ? tt("nw_characters_count", { count: snapshot.characterCount }) : t("character_studio_title")}
          onClick={actions.onCharacters}
          icon={Users}
        />
        <ContextAction label={t("voice_studio_title")} onClick={actions.onVoice} icon={AudioLines} />
      </div>
    );
  }

  if (state === "refining") {
    return (
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        {snapshot.editorialScore != null && (
          <span className="inline-flex min-h-10 items-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-white/65">
            {t("nw_editorial_score")}: {snapshot.editorialScore}/100
          </span>
        )}
        <ContextAction label={t("rewrite_studio")} onClick={actions.onRewrite} icon={Sparkles} />
        <ContextAction label={t("analyze_manuscript")} onClick={actions.onDiagnoseChapter} icon={Wand2} />
      </div>
    );
  }

  if (state === "publishing") {
    return (
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <ContextAction label={t("cover_studio")} onClick={actions.onCover} icon={ImagePlus} />
        <ContextAction label={t("export_studio_title")} onClick={actions.onExport} icon={FileDown} />
        <ContextAction label={t("completed_shelf_title")} onClick={actions.onLibrary} icon={Library} />
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        <ContextAction label={t("export_studio_title")} onClick={actions.onExport} icon={FileDown} />
        <ContextAction label={t("nw_create_book")} onClick={actions.onCreateBook} icon={Plus} />
      </div>
    );
  }

  return null;
}

function ToolboxLink({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="mt-6 flex justify-center pb-2">
      <button
        type="button"
        onClick={onOpen}
        className="text-xs font-medium text-white/38 underline-offset-4 transition-colors hover:text-white/58 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
      >
        {t("nw_toolbox_link")}
      </button>
    </div>
  );
}
