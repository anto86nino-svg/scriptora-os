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
  "horror-gothic": {
    image: `
      radial-gradient(ellipse 48% 34% at 16% 0%, rgba(126,12,20,0.28), transparent 62%),
      radial-gradient(ellipse 34% 24% at 86% 8%, rgba(94,0,0,0.2), transparent 58%),
      radial-gradient(ellipse 72% 42% at 50% 112%, rgba(0,0,0,0.92), transparent 62%),
      linear-gradient(180deg, rgba(10,6,7,0.96), rgba(3,3,5,0.995)),
      repeating-linear-gradient(
        90deg,
        rgba(255,255,255,0.015) 0px,
        rgba(255,255,255,0.015) 1px,
        transparent 1px,
        transparent 46px
      )
    `,
    overlay: `
      radial-gradient(ellipse 42% 28% at 14% 9%, rgba(160,18,28,0.18), transparent 60%),
      radial-gradient(ellipse 60% 34% at 50% 52%, rgba(255,255,255,0.025), transparent 64%),
      linear-gradient(rgba(4,4,5,0.72), rgba(3,3,4,0.94)),
      radial-gradient(ellipse 92% 78% at 50% 50%, transparent 42%, rgba(0,0,0,0.58) 100%)
    `,
  },
  "dark-luxury": {
    image:
      "linear-gradient(135deg, rgba(11, 8, 11, 0.94), rgba(22, 13, 22, 0.98)), linear-gradient(90deg, rgba(194, 154, 79, 0.08), transparent 38%, rgba(194, 154, 79, 0.05))",
    overlay:
      "radial-gradient(ellipse 40% 30% at 82% 4%, rgba(194, 154, 79, 0.18), transparent 56%), linear-gradient(rgba(8, 5, 8, 0.76), rgba(7, 5, 8, 0.9))",
  },
  "space-scifi": {
    image:
      "linear-gradient(135deg, rgba(4, 10, 18, 0.96), rgba(2, 6, 14, 0.99)), radial-gradient(circle at 80% 12%, rgba(56, 189, 248, 0.16), transparent 34%)",
    overlay:
      "linear-gradient(rgba(2, 6, 12, 0.74), rgba(2, 6, 14, 0.9)), repeating-linear-gradient(0deg, rgba(125, 211, 252, 0.045) 0 1px, transparent 1px 44px)",
  },
};

const FALLBACK_REALM = REALM_BACKGROUNDS["fantasy-realm"]!;

export function getRealmBackgroundLayers(profileId: AtmosphereProfileId): RealmBackgroundLayers {
  return REALM_BACKGROUNDS[profileId] ?? FALLBACK_REALM;
}
