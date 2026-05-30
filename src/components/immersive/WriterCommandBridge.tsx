import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Feather, Flame, PenLine } from "lucide-react";
import type { BookProject } from "@/types/book";
import { AUTHOR_IDENTITY_CHANGED_EVENT } from "@/lib/author-identity";
import { ATMOSPHERE_CHANGE_EVENT } from "@/lib/atmosphere-engine";
import { getWriterPresenceSnapshot } from "@/lib/immersive/writer-presence";
import { t, tt } from "@/lib/i18n";

type WriterCommandBridgeProps = {
  project?: BookProject | null;
  progressPercent?: number;
  onContinue?: () => void;
  onLaunch?: () => void;
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

export function WriterCommandBridge({
  project,
  progressPercent = 0,
  onContinue,
  onLaunch,
  className = "",
}: WriterCommandBridgeProps) {
  const [snap, setSnap] = useState(() => getWriterPresenceSnapshot(project));

  useEffect(() => {
    const refresh = () => setSnap(getWriterPresenceSnapshot(project));
    refresh();
    window.addEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refresh);
    window.addEventListener(ATMOSPHERE_CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener(AUTHOR_IDENTITY_CHANGED_EVENT, refresh);
      window.removeEventListener(ATMOSPHERE_CHANGE_EVENT, refresh);
    };
  }, [project]);

  const pct = snap.creative.progressPercent || progressPercent;
  const ringStyle = useMemo(
    () => ({ background: `conic-gradient(hsl(var(--primary)) ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }),
    [pct],
  );

  return (
    <section
      className={`scriptora-command-bridge scriptora-os-hero animate-scriptora-bridge-enter ${className}`}
      aria-label={snap.greeting}
    >
      <div className="scriptora-command-bridge__glow" aria-hidden />
      <div className="scriptora-command-bridge__inner">
        <div className="scriptora-command-bridge__identity">
          <p className="scriptora-command-bridge__greeting">{snap.greeting}</p>
          {snap.authorPenName && (
            <p className="scriptora-command-bridge__author">
              <span className="scriptora-command-bridge__author-label">{t("os_active_author")}</span>
              {snap.authorPenName}
            </p>
          )}
          <p className="scriptora-command-bridge__quote">
            <Feather className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
            <span>{snap.quote}</span>
          </p>
        </div>

        <div className="scriptora-command-bridge__manuscript">
          <p className="scriptora-command-bridge__working-label">{t("os_working_on")}</p>
          {snap.bookTitle ? (
            <>
              <h1 className="scriptora-command-bridge__title">{snap.bookTitle}</h1>
              <div className="scriptora-command-bridge__stats">
                {snap.currentChapter && (
                  <span className="scriptora-command-bridge__stat">
                    <PenLine className="h-3 w-3" aria-hidden />
                    {snap.currentChapter}
                  </span>
                )}
                <span className="scriptora-command-bridge__stat">
                  <BookOpen className="h-3 w-3" aria-hidden />
                  {tt("os_words_written", { count: snap.wordCount.toLocaleString() })}
                </span>
                <span className="scriptora-command-bridge__stat scriptora-command-bridge__stat--muted">
                  {t("os_last_session")}: {formatRelativeSession(snap.lastSessionIso)}
                </span>
              </div>
            </>
          ) : (
            <p className="scriptora-command-bridge__empty">{t("os_no_active_manuscript")}</p>
          )}
        </div>

        <div className="scriptora-command-bridge__orbit">
          <div className="scriptora-command-bridge__ring" style={ringStyle} aria-hidden>
            <div className="scriptora-command-bridge__ring-core">
              <span className="scriptora-command-bridge__ring-pct">{pct}%</span>
              <span className="scriptora-command-bridge__ring-state">{t(snap.creative.labelKey)}</span>
            </div>
          </div>
          <div className="scriptora-command-bridge__actions">
            {project && onContinue ? (
              <button type="button" onClick={onContinue} className="scriptora-os-primary-btn">
                {t("continue_action")}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : onLaunch ? (
              <button type="button" onClick={onLaunch} className="scriptora-os-primary-btn">
                <Flame className="h-4 w-4" />
                {t("launch_book_title")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
