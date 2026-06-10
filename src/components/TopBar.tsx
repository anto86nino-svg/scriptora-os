import { useState, type ReactNode } from "react";
import { BookConfig } from "@/types/book";
import { Download, Image, Loader2, FileText, FileType, Rocket, Home, Cloud, CloudOff, Lock, CreditCard, LogOut, Settings2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { t, tt, useUILanguage } from "@/lib/i18n";
import type { SyncStatus } from "@/hooks/useSyncStatus";
import { usePlan, PLAN_LIMITS, useQuota } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { UpgradeModal } from "@/components/UpgradeModal";
import { PlanBadge } from "@/components/PlanBadge";
import { getWordBudget } from "@/lib/subscription";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { BookProject } from "@/types/book";
import { ProjectConfigFields } from "@/components/ProjectConfigFields";
import { MobileProjectSettingsSheet } from "@/components/mobile/MobileProjectSettingsSheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { GlobalCreditBar } from "@/components/billing/GlobalCreditBar";

interface TopBarProps {
  config: BookConfig | null;
  onUpdateConfig: (key: keyof BookConfig, value: any) => void;
  isGenerating: boolean;
  hasProject: boolean;
  onExport: () => void;
  onExportDocx: () => void;
  onExportPdf: () => void;
  onCover: () => void;
  onPublish: () => void;
  isExporting: boolean;
  exportLabel?: string;
  phase: string;
  syncStatus?: SyncStatus;
  projectId?: string | null;
  project?: BookProject | null;
  onMobileGenerate?: () => void;
}

export function TopBar({
  config,
  onUpdateConfig,
  isGenerating,
  hasProject,
  onExport,
  onExportDocx,
  onExportPdf,
  onCover,
  onPublish,
  isExporting,
  exportLabel,
  phase,
  syncStatus,
  projectId,
  project,
  onMobileGenerate,
}: TopBarProps) {
  useUILanguage();
  const isMobile = useIsMobile();
  const { plan } = usePlan();
  const isFreePlan = plan === "free";
  const nav = useNavigate();
  const dev = isDevMode();
  const canExport = PLAN_LIMITS[plan].canExport;
  const { quota } = useQuota(projectId || null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const guard = (fn: () => void) => () => (canExport ? fn() : setShowUpgrade(true));

  if (!config) return null;

  const budget = project ? getWordBudget(plan, project) : null;
  const budgetTone = !budget
    ? ""
    : budget.exceeded
      ? "bg-destructive/15 text-destructive border-destructive/40"
      : budget.percent >= 85
        ? "bg-amber-500/15 text-amber-500 border-amber-500/40"
        : "bg-muted/40 text-muted-foreground border-border";
  const syncTone =
    syncStatus === "offline"
      ? "border-red-500/20 bg-red-500/10"
      : syncStatus === "saving"
        ? "border-amber-500/20 bg-amber-500/10"
        : syncStatus === "pending"
          ? "border-sky-500/20 bg-sky-500/10"
          : "border-emerald-500/20 bg-emerald-500/10";

  const actionButtons = (
    <>
      {isGenerating && (
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2 py-1">
          <Loader2 className="h-3 w-3 animate-spin text-primary" />
          <span className="text-[10px] font-medium text-primary">{t("generating")}</span>
        </div>
      )}
      <button onClick={onCover} className="ios-toolbar-button shrink-0 px-2.5 text-[11px] font-medium">
        <Image className="h-3 w-3" /> {t("cover")}
      </button>
      <button
        onClick={guard(onExportDocx)}
        disabled={isExporting || phase !== "complete"}
        title={canExport ? tt("export_format_title", { format: "DOCX" }) : (phase !== "complete" ? t("export_phase_incomplete_hint") : t("export_locked_title"))}
        className="ios-toolbar-button shrink-0 px-2.5 text-[11px] font-medium disabled:opacity-40"
      >
        {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
        {!canExport ? tt("unlock_format", { format: "DOCX" }) : "DOCX"}
      </button>
      <button
        onClick={guard(onExportPdf)}
        disabled={isExporting || phase !== "complete"}
        title={canExport ? tt("export_format_title", { format: "PDF" }) : (phase !== "complete" ? t("export_phase_incomplete_hint") : t("export_locked_title"))}
        className="ios-toolbar-button shrink-0 px-2.5 text-[11px] font-medium disabled:opacity-40"
      >
        {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <FileType className="h-3 w-3" />}
        {!canExport ? tt("unlock_format", { format: "PDF" }) : "PDF"}
      </button>
      <button
        onClick={guard(onExport)}
        disabled={isExporting || phase !== "complete"}
        title={canExport ? tt("export_format_title", { format: "EPUB" }) : (phase !== "complete" ? t("export_phase_incomplete_hint") : t("export_locked_title"))}
        className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:opacity-40"
      >
        {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
        {!canExport ? tt("unlock_format", { format: "EPUB" }) : "EPUB"}
      </button>
      <button
        onClick={onPublish}
        disabled={phase !== "complete"}
        className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 text-[11px] font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-40"
      >
        <Rocket className="h-3 w-3" /> {t("publish")}
      </button>
    </>
  );

  if (isMobile && hasProject) {
    return (
      <>
        <div className="ios-glass-soft mb-2 ml-10 min-w-0 shrink-0 rounded-lg md:ml-0">
          <div className="flex h-12 min-w-0 items-center gap-2 px-3">
            <h1 className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{config.title || t("untitled")}</h1>
            <button
              onClick={onMobileGenerate}
              disabled={isGenerating || !onMobileGenerate}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-[12px] font-semibold text-primary-foreground disabled:opacity-40"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {t("generate")}
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="ios-toolbar-button h-9 w-9 shrink-0 p-0"
              title={t("project_settings")}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <MobileProjectSettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          config={config}
          onUpdateConfig={onUpdateConfig}
          syncStatus={syncStatus}
          tokensUsed={quota?.tokensUsed}
        />
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
      </>
    );
  }

  return (
    <div className="ios-glass-soft mb-2 ml-10 min-w-0 shrink-0 rounded-lg md:ml-0">
      <div className="flex h-14 min-w-0 items-center gap-2 overflow-x-auto px-3">
        <button onClick={() => nav("/dashboard")} className="ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
          <Home className="h-3.5 w-3.5" /> {t("home")}
        </button>

        <button onClick={() => nav("/pricing")} className="hidden md:inline-flex ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground" title={t("pricing")}>
          <CreditCard className="h-3.5 w-3.5" /> {t("pricing")}
        </button>
        <button onClick={() => nav("/downloads")} className="hidden md:inline-flex ios-toolbar-button shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground" title={t("downloads")}>
          <Download className="h-3.5 w-3.5" /> {t("downloads")}
        </button>

        <span className="hidden md:contents">
          <Divider />
          <ProjectConfigFields config={config} onUpdateConfig={onUpdateConfig} layout="toolbar" />
        </span>

        <div className="hidden lg:flex shrink-0">
          <GlobalCreditBar variant="inline" />
        </div>

        <div className="flex-1" />

        {syncStatus && (
          <div
            className={`mr-1 flex h-7 shrink-0 items-center gap-1 rounded-lg border px-2 ${syncTone}`}
            title={syncStatus === "offline" ? t("sync_offline") : syncStatus === "pending" ? t("sync_pending") : syncStatus === "saving" ? t("sync_saving") : t("sync_saved")}
          >
            {syncStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                <span className="text-[10px] font-semibold text-amber-500">{t("sync_saving")}</span>
              </>
            )}
            {syncStatus === "pending" && (
              <>
                <Cloud className="h-3 w-3 text-sky-500" />
                <span className="text-[10px] font-semibold text-sky-500">{t("sync_pending")}</span>
              </>
            )}
            {(syncStatus === "saved" || syncStatus === "idle") && (
              <>
                <Cloud className="h-3 w-3 text-emerald-500" />
                <span className="text-[10px] font-semibold text-emerald-500">{t("sync_saved")}</span>
              </>
            )}
            {syncStatus === "offline" && (
              <>
                <CloudOff className="h-3 w-3 text-red-500" />
                <span className="text-[10px] font-semibold text-red-500">{t("sync_offline")}</span>
              </>
            )}
          </div>
        )}

        {hasProject && <div className="hidden md:flex shrink-0 items-center gap-1.5">{actionButtons}</div>}

        <div className="ml-2 shrink-0">
          <PlanBadge tokensUsed={quota?.tokensUsed} />
        </div>

        {budget && (
          <div
            title={
              dev
                ? `[DEV SIM] ${budget.used.toLocaleString()} / ${budget.max.toLocaleString()} ${t("words_unit")} — simulated tier, not real usage`
                : budget.exceeded
                  ? t("word_limit_reached")
                  : `${budget.used.toLocaleString()} / ${budget.max.toLocaleString()} ${t("words_unit")}`
            }
            className={`hidden md:flex items-center gap-1 ml-1 px-2 h-7 rounded-md border text-[10px] font-semibold tabular-nums shrink-0 ${budgetTone}`}
          >
            {dev && <span className="text-[8px] font-bold uppercase tracking-wider opacity-55 mr-0.5">SIM</span>}
            <span>{formatCount(budget.used)}</span>
            <span className="opacity-60">/</span>
            <span>{formatCount(budget.max)}</span>
            <span className="opacity-70 normal-case font-normal">{t("words_unit")}</span>
          </div>
        )}

        {user && (
          <button
            onClick={async () => {
              await signOut();
              toast.success(t("toast_signed_out"));
              nav("/auth");
            }}
            title={user.email || t("sign_out")}
            className="ios-toolbar-button ml-1 shrink-0 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-3 w-3" />
          </button>
        )}
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return String(n);
}

function Divider() {
  return <div className="h-6 w-px shrink-0 bg-white/10" />;
}
