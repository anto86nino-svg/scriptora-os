import type { AtmosphereProfileId } from "./types";

export type RealmAtmosphereLayers = {
  /** Static realm layer — CSS gradients only, never appearance-picker wallpapers. */
  background: string;
  /** Dashboard tile preview — same mood, tuned for small cards. */
  tilePreview: string;
};

/**
 * Canonical realm atmospheres — real editorial scenes with a restrained UI veil (Layer 1).
 * Independent from Advanced Appearance → Background picker (custom wallpapers).
 */
const REALM_ATMOSPHERES: Record<AtmosphereProfileId, RealmAtmosphereLayers> = {
  "fantasy-realm": {
    background:
      "linear-gradient(180deg, rgba(5, 8, 18, 0.56), rgba(4, 6, 14, 0.82)), url('/backgrounds/scriptora-atmospheres/fantasy-kingdom.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(5, 8, 18, 0.28), rgba(4, 6, 14, 0.66)), url('/backgrounds/scriptora-atmospheres/fantasy-kingdom.webp')",
  },
  "space-scifi": {
    background:
      "linear-gradient(120deg, rgba(2, 8, 24, 0.58), rgba(4, 10, 30, 0.8)), url('/backgrounds/scriptora-atmospheres/space-scifi-v2.webp')",
    tilePreview:
      "linear-gradient(120deg, rgba(2, 8, 24, 0.32), rgba(4, 10, 30, 0.62)), url('/backgrounds/scriptora-atmospheres/space-scifi-v2.webp')",
  },
  "nature-calm": {
    background:
      "linear-gradient(180deg, rgba(4, 12, 20, 0.5), rgba(4, 14, 20, 0.76)), url('/backgrounds/scriptora-atmospheres/moonlit-serenity.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(4, 12, 20, 0.2), rgba(4, 14, 20, 0.54)), url('/backgrounds/scriptora-atmospheres/moonlit-serenity.webp')",
  },
  "dark-luxury": {
    background:
      "linear-gradient(135deg, rgba(2, 6, 16, 0.54), rgba(9, 7, 8, 0.8)), url('/backgrounds/scriptora-atmospheres/luxury-penthouse.webp')",
    tilePreview:
      "linear-gradient(135deg, rgba(2, 6, 16, 0.26), rgba(9, 7, 8, 0.6)), url('/backgrounds/scriptora-atmospheres/luxury-penthouse.webp')",
  },
  "horror-gothic": {
    background:
      "linear-gradient(180deg, rgba(7, 2, 7, 0.48), rgba(8, 4, 10, 0.78)), url('/backgrounds/scriptora-atmospheres/horror-gothic-v2.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(7, 2, 7, 0.16), rgba(8, 4, 10, 0.58)), url('/backgrounds/scriptora-atmospheres/horror-gothic-v2.webp')",
  },
  "ancient-manuscript": {
    background:
      "linear-gradient(180deg, rgba(18, 12, 8, 0.44), rgba(28, 20, 12, 0.76)), url('/backgrounds/scriptora-atmospheres/vintage-manuscript.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(18, 12, 8, 0.18), rgba(28, 20, 12, 0.56)), url('/backgrounds/scriptora-atmospheres/vintage-manuscript.webp')",
  },
  "cyber-author": {
    background:
      "linear-gradient(135deg, rgba(4, 6, 16, 0.5), rgba(8, 10, 24, 0.74)), url('/backgrounds/scriptora-atmospheres/tokyo-night.webp')",
    tilePreview:
      "linear-gradient(135deg, rgba(4, 6, 16, 0.2), rgba(8, 10, 24, 0.52)), url('/backgrounds/scriptora-atmospheres/tokyo-night.webp')",
  },
  "booktok-romance": {
    background:
      "linear-gradient(180deg, rgba(24, 8, 18, 0.44), rgba(18, 10, 22, 0.76)), url('/backgrounds/scriptora-atmospheres/booktok-romance-v2.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(24, 8, 18, 0.16), rgba(18, 10, 22, 0.52)), url('/backgrounds/scriptora-atmospheres/booktok-romance-v2.webp')",
  },
  "thriller-investigation": {
    background:
      "linear-gradient(180deg, rgba(6, 10, 14, 0.52), rgba(10, 14, 20, 0.82)), url('/backgrounds/scriptora-atmospheres/noir-office.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(6, 10, 14, 0.2), rgba(10, 14, 20, 0.62)), url('/backgrounds/scriptora-atmospheres/noir-office.webp')",
  },
  "epic-story-forge": {
    background:
      "linear-gradient(180deg, rgba(12, 8, 24, 0.48), rgba(8, 6, 16, 0.78)), url('/backgrounds/scriptora-atmospheres/ancient-rome.webp')",
    tilePreview:
      "linear-gradient(180deg, rgba(12, 8, 24, 0.2), rgba(8, 6, 16, 0.58)), url('/backgrounds/scriptora-atmospheres/ancient-rome.webp')",
  },
};

export function getRealmBackgroundLayers(profileId: AtmosphereProfileId): RealmAtmosphereLayers {
  return REALM_ATMOSPHERES[profileId] ?? REALM_ATMOSPHERES["fantasy-realm"];
}

export function getAtmosphereTilePreview(profileId: AtmosphereProfileId): string {
  return getRealmBackgroundLayers(profileId).tilePreview;
}
