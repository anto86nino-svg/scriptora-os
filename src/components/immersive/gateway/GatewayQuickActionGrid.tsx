import {
  BookOpen,
  FileDown,
  ImagePlus,
  Stethoscope,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { t } from "@/lib/i18n";
import type { NarrativeWorkspaceActions } from "../NarrativeWorkspace";

type QuickAction = {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  action: () => void;
};

interface GatewayQuickActionGridProps {
  actions: NarrativeWorkspaceActions;
}

export function GatewayQuickActionGrid({ actions }: GatewayQuickActionGridProps) {
  const quickActions: QuickAction[] = [
    { id: "editor", icon: BookOpen, labelKey: "gw_action_editor", action: actions.onContinueWriting },
    { id: "diagnose", icon: Stethoscope, labelKey: "gw_action_diagnose", action: actions.onDiagnoseChapter },
    { id: "cover", icon: ImagePlus, labelKey: "gw_action_cover", action: actions.onCover },
    { id: "market", icon: TrendingUp, labelKey: "gw_action_market", action: actions.onMarketIntel ?? actions.onOpenToolbox },
    { id: "characters", icon: Users, labelKey: "gw_action_characters", action: actions.onCharacters },
    { id: "export", icon: FileDown, labelKey: "gw_action_export", action: actions.onExport },
  ];

  return (
    <section className="scriptora-gateway-panel scriptora-gateway-actions" aria-label={t("gw_actions_title")}>
      <div className="scriptora-gateway-panel__head">
        <h2>{t("gw_actions_title")}</h2>
      </div>
      <div className="scriptora-gateway-actions__grid">
        {quickActions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className="scriptora-gateway-action-tile"
              onClick={item.action}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
