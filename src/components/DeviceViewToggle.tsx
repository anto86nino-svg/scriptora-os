import { Monitor, Smartphone, Sparkles } from "lucide-react";
import { useDeviceView } from "@/hooks/useDeviceView";
import { t, useUILanguage } from "@/lib/i18n";

/** Compact control for dashboard / app toolbars — next to language selector. */
export function DeviceViewToolbarControl() {
  useUILanguage();
  const { effectiveLayout, preference, toggleLayout, resetToAuto } = useDeviceView();

  const isMobileLayout = effectiveLayout === "mobile";
  const label = isMobileLayout ? t("device_view_desktop") : t("device_view_mobile");
  const Icon = isMobileLayout ? Monitor : Smartphone;

  return (
    <div className="relative z-[120] flex shrink-0 items-center gap-1">
      {preference !== "auto" && (
        <button
          type="button"
          onClick={resetToAuto}
          className="ios-toolbar-button hidden h-8 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70 sm:inline-flex"
          title={t("device_view_auto_hint")}
        >
          <Sparkles className="h-3 w-3 shrink-0" />
          {t("device_view_auto")}
        </button>
      )}
      <button
        type="button"
        onClick={toggleLayout}
        className="ios-toolbar-button relative z-[120] h-8 min-w-8 px-0 text-xs font-medium min-[480px]:w-auto min-[480px]:px-3"
        title={
          isMobileLayout
            ? t("device_view_desktop_hint")
            : t("device_view_mobile_hint")
        }
        aria-label={label}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden min-[480px]:inline">{label}</span>
      </button>
    </div>
  );
}
