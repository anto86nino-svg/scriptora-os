import { ArrowRight, Flame, Plus, Rocket, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { QuickLaunchPanel, type QuickLaunchPanelProps } from "@/components/QuickLaunchPanel";

export type LaunchMode = "quick" | "advanced" | "manual";

interface LaunchBookModalProps {
  open: boolean;
  mode: LaunchMode;
  onModeChange: (mode: LaunchMode) => void;
  onClose: () => void;
  onAdvancedLaunch: () => void;
  onManualSetup: () => void;
  manualLocked?: boolean;
  busy?: boolean;
  quickLaunch: QuickLaunchPanelProps;
}

const MODES: Array<{
  id: LaunchMode;
  icon: typeof Flame;
  iconBg: string;
  titleKey: "launch_quick_action" | "launch_advanced_action" | "launch_manual_action";
  descKey: "launch_mode_quick_desc" | "launch_mode_advanced_desc" | "launch_mode_manual_desc";
}> = [
  {
    id: "quick",
    icon: Flame,
    iconBg: "ios-icon-blue",
    titleKey: "launch_quick_action",
    descKey: "launch_mode_quick_desc",
  },
  {
    id: "advanced",
    icon: Rocket,
    iconBg: "ios-icon-violet",
    titleKey: "launch_advanced_action",
    descKey: "launch_mode_advanced_desc",
  },
  {
    id: "manual",
    icon: Plus,
    iconBg: "ios-icon-green",
    titleKey: "launch_manual_action",
    descKey: "launch_mode_manual_desc",
  },
];

export function LaunchBookModal({
  open,
  mode,
  onModeChange,
  onClose,
  onAdvancedLaunch,
  onManualSetup,
  manualLocked = false,
  busy = false,
  quickLaunch,
}: LaunchBookModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/70 p-3 backdrop-blur-2xl sm:p-4"
      style={{
        paddingTop: "max(0.75rem, env(safe-area-inset-top))",
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
      onClick={() => !busy && onClose()}
    >
      <div
        className="ios-panel relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] animate-scriptora-dialog-entrance"
        style={{
          maxHeight: "min(92dvh, calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 24px))",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="launch-book-title"
        aria-modal="true"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

        <div className="shrink-0 border-b border-white/10 p-4 sm:p-5 sm:pb-4">
          <div className="mb-3 flex items-start justify-between gap-3 sm:mb-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="ios-icon ios-icon-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] sm:h-11 sm:w-11 sm:rounded-[18px]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="launch-book-title" className="text-base font-bold text-foreground sm:text-lg">
                  {t("launch_book_title")}
                </h2>
                <p className="text-[11px] text-muted-foreground sm:text-xs">{t("launch_book_subtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-50"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {MODES.map(({ id, icon: Icon, iconBg, titleKey, descKey }) => {
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onModeChange(id)}
                  disabled={busy}
                  className={cn(
                    "rounded-2xl border p-3 text-left transition-all duration-200 disabled:opacity-50",
                    selected
                      ? "border-primary/50 bg-primary/10 shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-primary/30"
                      : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]",
                  )}
                >
                  <span className={cn("ios-icon mb-2 inline-flex h-9 w-9 items-center justify-center rounded-[14px]", iconBg)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="block text-xs font-bold text-foreground">{t(titleKey)}</span>
                  <span className="mt-1 block text-[10px] leading-snug text-muted-foreground">{t(descKey)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-3 sm:p-5 sm:pt-4">
          {mode === "quick" && <QuickLaunchPanel {...quickLaunch} />}

          {mode === "advanced" && (
            <div className="flex flex-col items-center px-1 py-2 text-center sm:px-2 sm:py-4">
              <div className="ios-icon ios-icon-violet mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] sm:mb-4 sm:h-14 sm:w-14 sm:rounded-[20px]">
                <Rocket className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{t("launch_advanced_action")}</h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                {t("launch_mode_advanced_body")}
              </p>
            </div>
          )}

          {mode === "manual" && (
            <div className="flex flex-col items-center px-1 py-2 text-center sm:px-2 sm:py-4">
              <div className="ios-icon ios-icon-green mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] sm:mb-4 sm:h-14 sm:w-14 sm:rounded-[20px]">
                <Plus className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">{t("launch_manual_action")}</h3>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                {t("launch_mode_manual_body")}
              </p>
              {manualLocked && (
                <p className="mt-3 text-xs text-amber-300/90">{t("upgrade_more_books")}</p>
              )}
            </div>
          )}
        </div>

        {(mode === "advanced" || mode === "manual") && (
          <div
            className="shrink-0 border-t border-white/10 bg-card/95 p-4 backdrop-blur-sm sm:p-5"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            {mode === "advanced" && (
              <button
                type="button"
                onClick={onAdvancedLaunch}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                {t("launch_mode_advanced_cta")}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {mode === "manual" && !manualLocked && (
              <button
                type="button"
                onClick={onManualSetup}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-6 text-sm font-semibold text-slate-950 shadow-lg shadow-black/20 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                {t("launch_mode_manual_cta")}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
