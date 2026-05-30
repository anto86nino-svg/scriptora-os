import { useAtmosphereProfile } from "@/hooks/useAtmosphereProfile";

/**
 * Global living background — CSS-only layers (no canvas, mobile-safe).
 * Sits behind app content; atmosphere profile drives motion via data attribute on html.
 */
export function LivingBackgroundLayer() {
  const { profileId } = useAtmosphereProfile();

  return (
    <div
      className="scriptora-living-bg pointer-events-none fixed inset-0 -z-[1] overflow-hidden"
      aria-hidden
      data-living-profile={profileId}
    >
      <div className="scriptora-living-bg__depth" />
      <div className="scriptora-living-bg__fog" />
      <div className="scriptora-living-bg__dust" />
      <div className="scriptora-living-bg__light" />
      <div className="scriptora-living-bg__grain" />
    </div>
  );
}
