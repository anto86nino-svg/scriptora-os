import { useAtmosphereProfile } from "@/hooks/useAtmosphereProfile";

/**
 * Scriptora Living Atmosphere Engine — profile-specific ambient glow orbs.
 * CSS-only, fixed under content, no interaction.
 */
export function LivingAtmosphereAmbience() {
  const { profileId } = useAtmosphereProfile();

  return (
    <div
      className="scriptora-atmo-ambience pointer-events-none fixed inset-0 -z-[1] overflow-hidden"
      aria-hidden
      data-ambience-profile={profileId}
    >
      <div className="scriptora-atmo-ambience__orb scriptora-atmo-ambience__orb--a" />
      <div className="scriptora-atmo-ambience__orb scriptora-atmo-ambience__orb--b" />
      <div className="scriptora-atmo-ambience__orb scriptora-atmo-ambience__orb--c" />
      <div className="scriptora-atmo-ambience__sheen" />
    </div>
  );
}
