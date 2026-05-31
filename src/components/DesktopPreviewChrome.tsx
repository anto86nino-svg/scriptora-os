import { Smartphone } from "lucide-react";
import { useDeviceView } from "@/hooks/useDeviceView";
import { t, useUILanguage } from "@/lib/i18n";

/** Fixed controls when phone/tablet runs scaled desktop preview — always reachable, not inside #root transform. */
export function DesktopPreviewChrome() {
  useUILanguage();
  const { isDesktopPreview, toggleLayout, viewportWidth, viewportHeight, desktopPreviewScale } =
    useDeviceView();

  if (!isDesktopPreview) return null;

  const isPortrait = viewportHeight > viewportWidth;
  const showRotateHint = isPortrait && desktopPreviewScale < 0.55;

  return (
    <div className="scriptora-desktop-preview-chrome" aria-live="polite">
      {showRotateHint && (
        <p className="scriptora-desktop-preview-rotate-hint">{t("device_view_rotate_hint")}</p>
      )}
      <button
        type="button"
        className="scriptora-desktop-preview-exit"
        onClick={toggleLayout}
        aria-label={t("device_view_mobile")}
      >
        <Smartphone className="h-4 w-4 shrink-0" />
        {t("device_view_mobile")}
      </button>
    </div>
  );
}
