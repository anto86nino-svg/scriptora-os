import { LayoutGrid } from "lucide-react";
import { t } from "@/lib/i18n";
import type { GatewaySnapshot } from "@/lib/immersive/gateway-state";
import type { WorkspaceToolId } from "@/lib/immersive/workspace-tool-mode";
import type { NarrativeWorkspaceActions } from "./NarrativeWorkspace";
import { WorkspaceToolHero } from "./WorkspaceToolHero";
import { GatewayHeroCard, GatewayContinueCTA } from "./gateway/GatewayHeroCard";
import { GatewayNewBookStrip, type GatewayGenreId } from "./gateway/GatewayNewBookStrip";
import {
  GatewayActivityTimeline,
  GatewayDailyGoalCard,
  GatewayIntelligenceRail,
} from "./gateway/GatewayIntelligenceRail";
import { GatewayQuickActionGrid } from "./gateway/GatewayQuickActionGrid";
import { ScriptoraCreditsCard } from "@/components/billing/ScriptoraCreditsCard";

interface ScriptoraGatewayOSProps {
  gateway: GatewaySnapshot;
  actions: NarrativeWorkspaceActions;
  activeTool?: WorkspaceToolId | null;
  onGenreSelect: (genre: GatewayGenreId) => void;
  className?: string;
}

export function ScriptoraGatewayOS({
  gateway,
  actions,
  activeTool = null,
  onGenreSelect,
  className = "",
}: ScriptoraGatewayOSProps) {
  const { workspace } = gateway;
  const isEmpty = workspace.state === "empty";
  const isToolMode = activeTool != null && !isEmpty;

  if (isToolMode) {
    return (
      <section
        className={`scriptora-workspace-os scriptora-gateway-tool-bridge border border-white/10 ${className}`}
        data-workspace-theme={workspace.state}
        data-genre-theme={workspace.genreTheme}
        data-mode="tool"
        aria-label={workspace.title || t("gw_hero_kicker")}
      >
        <div className="scriptora-workspace-os-bg" aria-hidden />
        <div className="scriptora-workspace-os-inner">
          <div className="scriptora-workspace-hero scriptora-workspace-hero--tool">
            <WorkspaceToolHero snapshot={workspace} tool={activeTool} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <div
      className={`scriptora-gateway-os ${className}`}
      data-genre-theme={workspace.genreTheme}
      data-gateway-state={isEmpty ? "empty" : workspace.state}
    >
      <GatewayHeroCard gateway={gateway} />

      <ScriptoraCreditsCard className="mb-4" />

      <GatewayContinueCTA
        isEmpty={isEmpty}
        onContinue={actions.onContinueWriting}
        onCreateBook={actions.onCreateBook}
      />

      <GatewayNewBookStrip onCreateBook={actions.onCreateBook} onGenreSelect={onGenreSelect} />

      <div className="scriptora-gateway-stack">
        <GatewayIntelligenceRail insights={gateway.insights} />
        <GatewayDailyGoalCard
          current={gateway.dailyProgress.current}
          goal={gateway.dailyProgress.goal}
          percent={gateway.dailyProgress.percent}
        />
      </div>

      <GatewayActivityTimeline items={gateway.activity} />

      <GatewayQuickActionGrid actions={actions} />

      <button type="button" className="scriptora-gateway-toolbox-link" onClick={actions.onOpenToolbox}>
        <LayoutGrid className="h-4 w-4" aria-hidden />
        {t("gw_all_tools")}
      </button>
    </div>
  );
}

export type { GatewayGenreId };
