import { BookConfig } from "@/types/book";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ProjectConfigFields } from "@/components/ProjectConfigFields";
import { PlanBadge } from "@/components/PlanBadge";
import { t } from "@/lib/i18n";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { Cloud, CloudOff, Loader2 } from "lucide-react";

interface MobileProjectSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: BookConfig;
  onUpdateConfig: (key: keyof BookConfig, value: unknown) => void;
  syncStatus?: SyncStatus;
  tokensUsed?: number;
}

export function MobileProjectSettingsSheet({
  open,
  onOpenChange,
  config,
  onUpdateConfig,
  syncStatus,
  tokensUsed,
}: MobileProjectSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl border-white/10 bg-background/95 px-4 pb-8 pt-5">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle className="text-base">{t("project_settings")}</SheetTitle>
        </SheetHeader>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <PlanBadge tokensUsed={tokensUsed} />
          {syncStatus && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              {syncStatus === "saving" && <Loader2 className="h-3 w-3 animate-spin" />}
              {syncStatus === "offline" && <CloudOff className="h-3 w-3" />}
              {(syncStatus === "saved" || syncStatus === "idle" || syncStatus === "pending") && <Cloud className="h-3 w-3" />}
              {syncStatus === "offline" ? t("sync_offline") : syncStatus === "saving" ? t("sync_saving") : syncStatus === "pending" ? t("sync_pending") : t("sync_saved")}
            </span>
          )}
        </div>

        <ProjectConfigFields config={config} onUpdateConfig={onUpdateConfig} layout="stacked" />
      </SheetContent>
    </Sheet>
  );
}
