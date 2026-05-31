import { t } from "@/lib/i18n";
import type { NarrativeWorkspaceSnapshot } from "@/lib/immersive/workspace-state";
import { resolveActiveBookBadges, workspaceStateTheme } from "@/lib/immersive/workspace-os-intelligence";

interface ActiveBookMockupProps {
  snapshot: NarrativeWorkspaceSnapshot;
}

export function ActiveBookMockup({ snapshot }: ActiveBookMockupProps) {
  const badges = resolveActiveBookBadges(snapshot);
  const theme = workspaceStateTheme(snapshot.state);

  return (
    <div className="scriptora-book-mockup-wrap" aria-hidden>
      <div
        className="scriptora-book-mockup scriptora-book-mockup--active"
        data-mock-theme={theme}
        data-genre-theme={snapshot.genreTheme}
      >
        <span className="scriptora-book-mockup__badge scriptora-book-mockup__badge--tl">
          {t(badges[0])}
        </span>
        <span className="scriptora-book-mockup__badge scriptora-book-mockup__badge--tr">
          {t(badges[1])}
        </span>
        <span className="scriptora-book-mockup__badge scriptora-book-mockup__badge--br">
          {t(badges[2])}
        </span>
        <div className="scriptora-book-mockup__stack">
          <div className="scriptora-book-mockup__spine" />
          <div className="scriptora-book-mockup__cover">
            <span className="scriptora-book-mockup__brand">SCRIPTORA</span>
            {snapshot.genre && (
              <span className="scriptora-book-mockup__genre">{snapshot.genre}</span>
            )}
            <p className="scriptora-book-mockup__title">
              {snapshot.title || t("untitled")}
            </p>
            {snapshot.authorPenName && (
              <p className="scriptora-book-mockup__author">{snapshot.authorPenName}</p>
            )}
          </div>
          <div className="scriptora-book-mockup__pages" />
          {(theme === "refining" || theme === "drafting") && (
            <div className="scriptora-book-mockup__overlay scriptora-book-mockup__overlay--scan" />
          )}
          {theme === "publishing" && (
            <div className="scriptora-book-mockup__overlay scriptora-book-mockup__overlay--frame" />
          )}
        </div>
      </div>
    </div>
  );
}
