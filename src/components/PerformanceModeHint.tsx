import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  dismissPerformanceHint,
  isPerformanceHintDismissed,
  loadVisualPreset,
  SCRIPTORA_OPEN_APPEARANCE_KEY,
  useVisualPreset,
} from "@/lib/performance-mode";
import { t } from "@/lib/i18n";

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
