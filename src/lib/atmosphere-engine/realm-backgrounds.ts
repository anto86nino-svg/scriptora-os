import type { AtmosphereProfileId } from "./types";

export type RealmBackgroundLayers = {
  image: string;
  overlay: string;
};

/** Canonical realm background images — independent of custom appearance picker. */
const REALM_BACKGROUNDS: Partial<Record<AtmosphereProfileId, RealmBackgroundLayers>> = {
  "fantasy-realm": {
    image: "url('/backgrounds/scriptora-atmospheres/fantasy-kingdom.webp')",
    overlay:
      "linear-gradient(rgba(4, 6, 14, 0.72), rgba(6, 8, 18, 0.82)), radial-gradient(ellipse 55% 38% at 18% 12%, rgba(88, 80, 141, 0.08), transparent 58%), radial-gradient(ellipse 45% 30% at 82% 8%, rgba(212, 175, 98, 0.05), transparent 52%)",
  },
};

const FALLBACK_REALM = REALM_BACKGROUNDS["fantasy-realm"]!;

export function getRealmBackgroundLayers(profileId: AtmosphereProfileId): RealmBackgroundLayers {
  return REALM_BACKGROUNDS[profileId] ?? FALLBACK_REALM;
}
