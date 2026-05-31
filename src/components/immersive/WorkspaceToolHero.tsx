import { t } from "@/lib/i18n";
import type { NarrativeWorkspaceSnapshot } from "@/lib/immersive/workspace-state";
import type { WorkspaceToolId } from "@/lib/immersive/workspace-tool-mode";
import { workspaceToolLabelKey } from "@/lib/immersive/workspace-tool-mode";
import { ActiveBookMockup } from "./ActiveBookMockup";
import { WorkspaceToolVisual } from "./WorkspaceToolVisual";

interface WorkspaceToolHeroProps {
  snapshot: NarrativeWorkspaceSnapshot;
  tool: WorkspaceToolId;
}

/** Compact hero: mini book (left) + premium tool visual (right). */
export function WorkspaceToolHero({ snapshot, tool }: WorkspaceToolHeroProps) {
  return (
    <div className="scriptora-wos-tool-hero" data-active-tool={tool}>
      <div className="scriptora-wos-tool-hero__book">
        <ActiveBookMockup snapshot={snapshot} size="mini" />
      </div>
      <div className="scriptora-wos-tool-hero__stage">
        <p className="scriptora-wos-tool-hero__kicker">{t("wos_tool_mode_active")}</p>
        <p className="scriptora-wos-tool-hero__label">{t(workspaceToolLabelKey(tool))}</p>
        <WorkspaceToolVisual tool={tool} />
      </div>
    </div>
  );
}
