import { t } from "@/lib/i18n";
import type { ConsoleFeatureId } from "./creative-console-types";

const MOCK_TITLE_KEYS: Record<ConsoleFeatureId, string> = {
  create: "cc_mock_create",
  import: "cc_mock_import",
  analyze: "cc_mock_analyze",
  cover: "cc_mock_cover",
  export: "cc_mock_export",
  author: "cc_mock_author",
  publish: "cc_mock_publish",
  editor: "cc_mock_editor",
};

const BADGE_KEYS: Record<ConsoleFeatureId, [string, string, string]> = {
  create: ["cc_badge_ai_editor", "cc_badge_book_intel", "cc_badge_export_ready"],
  import: ["cc_badge_import", "cc_badge_book_intel", "cc_badge_ai_editor"],
  analyze: ["cc_badge_book_intel", "cc_badge_ai_editor", "cc_badge_scan"],
  cover: ["cc_badge_cover", "cc_badge_export_ready", "cc_badge_ai_editor"],
  export: ["cc_badge_export_ready", "cc_badge_print_ready", "cc_badge_book_intel"],
  author: ["cc_badge_author", "cc_badge_ai_editor", "cc_badge_export_ready"],
  publish: ["cc_badge_kdp", "cc_badge_export_ready", "cc_badge_book_intel"],
  editor: ["cc_badge_chapter_dr", "cc_badge_ai_editor", "cc_badge_book_intel"],
};

interface ScriptoraBookMockupProps {
  feature: ConsoleFeatureId;
}

export function ScriptoraBookMockup({ feature }: ScriptoraBookMockupProps) {
  const badges = BADGE_KEYS[feature];

  return (
    <div className="scriptora-book-mockup-wrap" aria-hidden>
      <div className="scriptora-book-mockup" data-mock-theme={feature}>
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
            <p className="scriptora-book-mockup__title">{t(MOCK_TITLE_KEYS[feature])}</p>
          </div>
          <div className="scriptora-book-mockup__pages" />
          <div className="scriptora-book-mockup__overlay scriptora-book-mockup__overlay--scan" />
          <div className="scriptora-book-mockup__overlay scriptora-book-mockup__overlay--frame" />
        </div>
      </div>
    </div>
  );
}
