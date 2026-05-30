import { useAtmosphereProfile } from "@/hooks/useAtmosphereProfile";

/**
 * Scriptora Living Atmosphere Engine — global depth, motion, light.
 * CSS-only layers (no canvas). Profile-driven via data-living-profile + html[data-atmosphere-profile].
 */
export function LivingBackgroundLayer() {
  const { profileId } = useAtmosphereProfile();

  return (
    <div
      className="scriptora-living-bg pointer-events-none fixed inset-0 -z-[2] overflow-hidden"
      aria-hidden
      data-living-profile={profileId}
    >
      <div className="scriptora-living-bg__gradients" />
      <div className="scriptora-living-bg__depth" />
      <div className="scriptora-living-bg__parallax" />
      <div className="scriptora-living-bg__fog" />
      <div className="scriptora-living-bg__dust" />
      <div className="scriptora-living-bg__particles" />
      <div className="scriptora-living-bg__light" />
      <div className="scriptora-living-bg__reflection" />
      <div className="scriptora-living-bg__grain" />
    </div>
  );
}
