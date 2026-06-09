import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Crown, Gauge, Sparkles, X, Zap } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  dismissPerformanceHint,
  isPerformanceHintDismissed,
  loadVisualPreset,
  SCRIPTORA_OPEN_APPEARANCE_KEY,
  useVisualPreset,
} from "@/lib/performance-mode";
import { t } from "@/lib/i18n";

type VisualPerformanceBadgeProps = {
  onOpenSettings?: () => void;
};

export function VisualPerformanceBadge({ onOpenSettings }: VisualPerformanceBadgeProps) {
  const preset = useVisualPreset();

  const meta = {
    premium: {
      label: "Premium FX",
      mobileLabel: "FX",
      title: "Modalità visiva Premium attiva",
      icon: Sparkles,
      className: "border-fuchsia-300/25 bg-fuchsia-500/10 text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.18)]",
    },
    balanced: {
      label: "Balanced",
      mobileLabel: "BAL",
      title: "Modalità visiva Bilanciata attiva",
      icon: Gauge,
      className: "border-sky-300/25 bg-sky-500/10 text-sky-100",
    },
    performance: {
      label: "Performance",
      mobileLabel: "FAST",
      title: "Modalità Performance attiva",
      icon: Zap,
      className: "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
    },
  } as const;

  const current = meta[preset];
  const Icon = preset === "premium" ? Crown : current.icon;

  const open = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    sessionStorage.setItem(SCRIPTORA_OPEN_APPEARANCE_KEY, "1");
    window.dispatchEvent(new Event("scriptora-open-appearance-settings"));
  };

  return (
    <button
      type="button"
      onClick={open}
      title={current.title}
      aria-label={current.title}
      className={`ios-toolbar-button inline-flex h-8 max-w-[112px] items-center gap-1.5 rounded-full border px-2 text-[10px] font-semibold uppercase tracking-[0.14em] ${current.className}`}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden min-[430px]:inline">{current.label}</span>
      <span className="inline min-[430px]:hidden">{current.mobileLabel}</span>
    </button>
  );
}


export function PerformanceModeHint() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const preset = useVisualPreset();
  const [dismissed, setDismissed] = useState(isPerformanceHintDismissed);

  if (!isMobile || preset !== "premium" || dismissed) return null;
  if (loadVisualPreset() !== "premium") return null;

  const openAppearance = () => {
    sessionStorage.setItem(SCRIPTORA_OPEN_APPEARANCE_KEY, "1");
    if (location.pathname === "/dashboard") {
      window.dispatchEvent(new Event("scriptora-open-appearance-settings"));
      return;
    }
    navigate("/dashboard");
  };

  const dismiss = () => {
    dismissPerformanceHint();
    setDismissed(true);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[9990] rounded-2xl border border-primary/25 bg-card/95 p-3 shadow-lg sm:hidden">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Zap className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">{t("performance_mode_hint_title")}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {t("performance_mode_hint_body")}
          </p>
          <button
            type="button"
            onClick={openAppearance}
            className="mt-2 text-[11px] font-semibold text-primary hover:underline"
          >
            {t("performance_mode_hint_cta")}
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={t("close")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
