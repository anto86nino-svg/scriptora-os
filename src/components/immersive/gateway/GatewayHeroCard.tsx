import { ArrowRight } from "lucide-react";
import { t, tt } from "@/lib/i18n";
import type { GatewaySnapshot } from "@/lib/immersive/gateway-state";
import { ActiveBookMockup } from "../ActiveBookMockup";

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

interface GatewayHeroCardProps {
  gateway: GatewaySnapshot;
}

export function GatewayHeroCard({ gateway }: GatewayHeroCardProps) {
  const { workspace } = gateway;
  const isEmpty = workspace.state === "empty";

  return (
    <article
      className="scriptora-gateway-hero"
      data-genre-theme={workspace.genreTheme}
      data-gateway-state={isEmpty ? "empty" : workspace.state}
    >
      <div className="scriptora-gateway-hero__glow" aria-hidden />
      <div className="scriptora-gateway-hero__inner">
        <div className="scriptora-gateway-hero__identity">
          <p className="scriptora-gateway-hero__greeting">{gateway.greeting}</p>
          {!isEmpty && workspace.authorPenName && (
            <p className="scriptora-gateway-hero__author">{workspace.authorPenName}</p>
          )}
          <p className="scriptora-gateway-hero__quote">{gateway.quote}</p>
        </div>

        <div className="scriptora-gateway-hero__stage">
          <div className="scriptora-gateway-hero__book">
            {gateway.coverDataUrl ? (
              <div className="scriptora-gateway-hero__cover-photo">
                <img src={gateway.coverDataUrl} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <ActiveBookMockup snapshot={workspace} size={isEmpty ? "hero" : "mini"} />
            )}
          </div>

          <div className="scriptora-gateway-hero__stats min-w-0">
            <p className="scriptora-gateway-hero__kicker">{t("gw_hero_kicker")}</p>
            <h1 className="scriptora-gateway-hero__title">
              {workspace.title || t("gw_hero_empty_title")}
            </h1>
            {!isEmpty && (
              <>
                <div className="scriptora-gateway-hero__metrics">
                  <span>{workspace.progressPercent}% {t("gw_complete")}</span>
                  <span>{workspace.wordCount.toLocaleString()} {t("gw_words")}</span>
                  <span>
                    {workspace.chaptersFilled}/{workspace.chapterTotal || "—"} {t("gw_chapters")}
                  </span>
                </div>
                {workspace.currentChapter && (
                  <p className="scriptora-gateway-hero__chapter">{workspace.currentChapter}</p>
                )}
                <p className="scriptora-gateway-hero__session">
                  {t("gw_last_edit")}: {formatRelativeSession(workspace.lastSessionIso)}
                </p>
              </>
            )}
            {isEmpty && (
              <p className="scriptora-gateway-hero__empty-copy">{t("gw_hero_empty_copy")}</p>
            )}
          </div>

          {!isEmpty && (
            <div className="scriptora-gateway-hero__ring" aria-hidden>
              <div
                className="scriptora-gateway-hero__ring-fill"
                style={{ background: `conic-gradient(hsl(var(--console-accent)) ${workspace.progressPercent * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}
              />
              <div className="scriptora-gateway-hero__ring-core">
                <span>{workspace.progressPercent}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

interface GatewayContinueCTAProps {
  isEmpty: boolean;
  onContinue: () => void;
  onCreateBook: () => void;
}

export function GatewayContinueCTA({ isEmpty, onContinue, onCreateBook }: GatewayContinueCTAProps) {
  return (
    <button
      type="button"
      className="scriptora-gateway-cta-primary"
      onClick={isEmpty ? onCreateBook : onContinue}
    >
      {isEmpty ? t("gw_cta_start_book") : t("gw_cta_continue_writing")}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </button>
  );
}
