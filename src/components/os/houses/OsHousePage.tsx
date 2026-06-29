import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { OsShell } from "@/components/os/OsShell";
import { OsHouseGrid } from "@/components/os/houses/OsHouseGrid";
import { getOsHouse, type OsHouseToolCard } from "@/lib/os/os-house-registry";
import type { OsHouseId } from "@/lib/os/os-house-registry";
import { isAdvancedLaunchpadEnabled } from "@/components/one-flow/ProfileMenuDialog";

type Props = {
  houseId: OsHouseId;
};

export function OsHousePage({ houseId }: Props) {
  const house = getOsHouse(houseId);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showProTools = isAdvancedLaunchpadEnabled();

  const openTool = useCallback(
    (tool: OsHouseToolCard) => {
      if (tool.dashboardTool === "settings-hub") {
        navigate("/dashboard", { state: { openSettings: true } });
        return;
      }
      if (tool.dashboardTool) {
        navigate("/dashboard", {
          state: tool.dashboardTool === "advanced-tools"
            ? { openAdvancedTools: true }
            : tool.dashboardTool === "book-forge"
              ? { openForge: true }
              : { openTool: tool.dashboardTool },
        });
        return;
      }
      navigate(tool.route);
    },
    [navigate],
  );

  const requestedOpen = searchParams.get("open");
  const visibleTools = house.tools.filter((tool) => !tool.proOnly || showProTools);
  const highlightTool = visibleTools.find((tool) => tool.id === requestedOpen || tool.dashboardTool === requestedOpen);

  return (
    <OsShell title={house.label} subtitle={house.subtitle} badge="Scriptora OS" accent={house.accent}>
      {highlightTool ? (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/65">
          Accesso rapido: <span className="font-semibold text-white">{highlightTool.label}</span>
        </div>
      ) : null}
      <OsHouseGrid tools={visibleTools} onOpenTool={openTool} />
    </OsShell>
  );
}
