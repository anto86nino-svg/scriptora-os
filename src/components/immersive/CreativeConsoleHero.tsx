import { useCallback, useState } from "react";
import {
  FileDown,
  FileUp,
  ImagePlus,
  PenLine,
  Plus,
  Rocket,
  Sparkles,
  Stethoscope,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import type { NarrativeWorkspaceActions } from "./NarrativeWorkspace";
import { ScriptoraBookMockup } from "./ScriptoraBookMockup";
import type { ConsoleFeatureId } from "./creative-console-types";

type FeatureDef = {
  id: ConsoleFeatureId;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  benefitKey: string;
  previewKey: string;
  action: () => void;
};

interface CreativeConsoleHeroProps {
  actions: NarrativeWorkspaceActions;
  onOpenToolbox: () => void;
  className?: string;
}

export function CreativeConsoleHero({ actions, onOpenToolbox, className = "" }: CreativeConsoleHeroProps) {
  const [activeFeature, setActiveFeature] = useState<ConsoleFeatureId>("create");

  const features: FeatureDef[] = [
    {
      id: "create",
      icon: Plus,
      titleKey: "nw_create_book",
      descKey: "cc_desc_create",
      benefitKey: "cc_benefit_create",
      previewKey: "cc_preview_create",
      action: actions.onCreateBook,
    },
    {
      id: "import",
      icon: FileUp,
      titleKey: "nw_import_manuscript",
      descKey: "cc_desc_import",
      benefitKey: "cc_benefit_import",
      previewKey: "cc_preview_import",
      action: actions.onImportManuscript,
    },
    {
      id: "analyze",
      icon: Wand2,
      titleKey: "analyze_manuscript",
      descKey: "cc_desc_analyze",
      benefitKey: "cc_benefit_analyze",
      previewKey: "cc_preview_analyze",
      action: actions.onAnalyzeManuscript,
    },
    {
      id: "cover",
      icon: ImagePlus,
      titleKey: "cover_studio",
      descKey: "cc_desc_cover",
      benefitKey: "cc_benefit_cover",
      previewKey: "cc_preview_cover",
      action: actions.onCover,
    },
    {
      id: "export",
      icon: FileDown,
      titleKey: "export_studio_title",
      descKey: "cc_desc_export",
      benefitKey: "cc_benefit_export",
      previewKey: "cc_preview_export",
      action: actions.onExport,
    },
    {
      id: "author",
      icon: Users,
      titleKey: "author_identity",
      descKey: "cc_desc_author",
      benefitKey: "cc_benefit_author",
      previewKey: "cc_preview_author",
      action: actions.onAuthorIdentity ?? actions.onOpenToolbox,
    },
    {
      id: "publish",
      icon: Rocket,
      titleKey: "cc_card_publish",
      descKey: "cc_desc_publish",
      benefitKey: "cc_benefit_publish",
      previewKey: "cc_preview_publish",
      action: actions.onKdpPublish ?? actions.onOpenToolbox,
    },
    {
      id: "editor",
      icon: Stethoscope,
      titleKey: "cc_card_editor",
      descKey: "cc_desc_editor",
      benefitKey: "cc_benefit_editor",
      previewKey: "cc_preview_editor",
      action: actions.onDiagnoseChapter,
    },
  ];

  const active = features.find((f) => f.id === activeFeature) ?? features[0];

  const activate = useCallback((id: ConsoleFeatureId) => {
    setActiveFeature(id);
  }, []);

  return (
    <section
      className={`scriptora-creative-console border border-white/10 ${className}`}
      data-console-theme={activeFeature}
      aria-label={t("cc_hero_aria")}
    >
      <div className="scriptora-console-bg" aria-hidden />

      <div className="scriptora-console-inner">
        <div className="scriptora-console-hero">
          <div className="scriptora-console-copy min-w-0">
            <span className="scriptora-console-badge">
              <Sparkles className="h-3 w-3 text-white/60" aria-hidden />
              {t("cc_badge_os")}
            </span>
            <h1 className="scriptora-console-title">{t("cc_hero_title")}</h1>
            <p className="scriptora-console-subtitle">{t("cc_hero_subtitle")}</p>
            <p className="scriptora-console-micro">{t("cc_hero_microcopy")}</p>

            <div className="scriptora-console-ctas">
              <button
                type="button"
                className="scriptora-console-cta-primary"
                onClick={actions.onCreateBook}
              >
                <Plus className="h-4 w-4" aria-hidden />
                {t("nw_create_book")}
              </button>
              <button
                type="button"
                className="scriptora-console-cta-secondary"
                onClick={actions.onImportManuscript}
              >
                <FileUp className="h-4 w-4" aria-hidden />
                {t("nw_import_manuscript")}
              </button>
              <button
                type="button"
                className="scriptora-console-cta-secondary"
                onClick={actions.onAnalyzeManuscript}
              >
                <Wand2 className="h-4 w-4" aria-hidden />
                {t("analyze_manuscript")}
              </button>
            </div>

            <p className="scriptora-console-preview-line" aria-live="polite">
              {t(active.previewKey)}
            </p>
          </div>

          <ScriptoraBookMockup feature={activeFeature} />
        </div>

        <div className="scriptora-console-cards" role="list">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = feature.id === activeFeature;
            return (
              <button
                key={feature.id}
                type="button"
                role="listitem"
                data-active={isActive ? "true" : "false"}
                className="scriptora-console-card"
                aria-label={t(feature.titleKey)}
                aria-pressed={isActive}
                onMouseEnter={() => activate(feature.id)}
                onFocus={() => activate(feature.id)}
                onClick={feature.action}
              >
                <span className="scriptora-console-card__icon">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="scriptora-console-card__title">{t(feature.titleKey)}</span>
                <span className="scriptora-console-card__desc">{t(feature.descKey)}</span>
                <span className="scriptora-console-card__benefit">{t(feature.benefitKey)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex justify-center pb-1">
          <button
            type="button"
            onClick={onOpenToolbox}
            className="inline-flex min-h-10 items-center gap-1.5 text-xs font-medium text-white/40 underline-offset-4 transition-colors hover:text-white/60 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <PenLine className="h-3.5 w-3.5" aria-hidden />
            {t("nw_toolbox_link")}
          </button>
        </div>
      </div>
    </section>
  );
}
