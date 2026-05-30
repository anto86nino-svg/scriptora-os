import type { AtmosphereProfileId } from "./types";

export type RealmAtmosphereLayers = {
  /** Static realm layer — CSS gradients only, never appearance-picker wallpapers. */
  background: string;
  /** Dashboard tile preview — same mood, tuned for small cards. */
  tilePreview: string;
};

/**
 * Canonical realm atmospheres — procedural visual moods (Layer 1).
 * Independent from Advanced Appearance → Background picker (custom wallpapers).
 */
const REALM_ATMOSPHERES: Record<AtmosphereProfileId, RealmAtmosphereLayers> = {
  "fantasy-realm": {
    background:
      "linear-gradient(180deg, rgba(15, 16, 28, 0.94), rgba(10, 12, 20, 0.96)), radial-gradient(circle at 18% 20%, rgba(245, 158, 11, 0.16), transparent 22%), radial-gradient(circle at 82% 30%, rgba(168, 85, 247, 0.14), transparent 24%), radial-gradient(ellipse 55% 38% at 50% -8%, rgba(88, 80, 141, 0.12), transparent 58%)",
    tilePreview:
      "linear-gradient(180deg, rgba(15, 16, 28, 0.88), rgba(10, 12, 20, 0.92)), radial-gradient(circle at 22% 24%, rgba(245, 158, 11, 0.22), transparent 28%), radial-gradient(circle at 78% 18%, rgba(168, 85, 247, 0.2), transparent 30%), radial-gradient(ellipse 60% 42% at 50% 100%, rgba(88, 80, 141, 0.16), transparent 62%)",
  },
  "space-scifi": {
    background:
      "linear-gradient(120deg, rgba(8, 14, 35, 0.96), rgba(10, 16, 42, 0.94)), radial-gradient(circle at 30% 26%, rgba(56, 189, 248, 0.2), transparent 26%), radial-gradient(circle at 75% 18%, rgba(192, 132, 252, 0.16), transparent 24%), radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.1), transparent 5%)",
    tilePreview:
      "linear-gradient(120deg, rgba(8, 14, 35, 0.9), rgba(10, 16, 42, 0.88)), radial-gradient(circle at 28% 30%, rgba(56, 189, 248, 0.28), transparent 32%), radial-gradient(circle at 72% 20%, rgba(192, 132, 252, 0.22), transparent 28%), radial-gradient(circle at 14% 12%, rgba(255, 255, 255, 0.14), transparent 6%)",
  },
  "nature-calm": {
    background:
      "linear-gradient(180deg, rgba(6, 14, 18, 0.96), rgba(8, 20, 24, 0.94)), radial-gradient(circle at 18% 25%, rgba(34, 197, 94, 0.2), transparent 26%), radial-gradient(circle at 80% 72%, rgba(34, 211, 102, 0.14), transparent 20%), radial-gradient(circle at 62% 78%, rgba(16, 185, 129, 0.1), transparent 22%)",
    tilePreview:
      "linear-gradient(180deg, rgba(6, 14, 18, 0.9), rgba(8, 20, 24, 0.88)), radial-gradient(circle at 20% 28%, rgba(34, 197, 94, 0.28), transparent 30%), radial-gradient(circle at 78% 68%, rgba(34, 211, 102, 0.2), transparent 24%), radial-gradient(circle at 50% 88%, rgba(16, 185, 129, 0.14), transparent 26%)",
  },
  "dark-luxury": {
    background:
      "linear-gradient(135deg, rgba(2, 6, 23, 0.98), rgba(9, 9, 11, 0.96) 50%, rgba(0, 0, 0, 0.98)), radial-gradient(circle at 75% 10%, rgba(212, 175, 98, 0.1), transparent 42%), radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.05), transparent 38%), radial-gradient(circle at 50% 50%, rgba(148, 163, 184, 0.04), transparent 55%)",
    tilePreview:
      "linear-gradient(135deg, rgba(2, 6, 23, 0.94), rgba(9, 9, 11, 0.92) 50%, rgba(0, 0, 0, 0.94)), radial-gradient(circle at 72% 14%, rgba(212, 175, 98, 0.16), transparent 40%), radial-gradient(circle at 24% 78%, rgba(255, 255, 255, 0.08), transparent 36%)",
  },
  "horror-gothic": {
    background:
      "linear-gradient(180deg, rgba(5, 10, 24, 0.96), rgba(10, 18, 40, 0.94)), radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.24), transparent 36%), radial-gradient(circle at 30% 20%, rgba(147, 51, 234, 0.16), transparent 32%), radial-gradient(circle at 84% 18%, rgba(76, 180, 255, 0.08), transparent 24%)",
    tilePreview:
      "linear-gradient(180deg, rgba(5, 10, 24, 0.9), rgba(10, 18, 40, 0.88)), radial-gradient(circle at 50% 0%, rgba(220, 38, 38, 0.32), transparent 38%), radial-gradient(circle at 28% 22%, rgba(147, 51, 234, 0.2), transparent 34%), radial-gradient(circle at 82% 16%, rgba(76, 180, 255, 0.1), transparent 26%)",
  },
};

export function getRealmBackgroundLayers(profileId: AtmosphereProfileId): RealmAtmosphereLayers {
  return REALM_ATMOSPHERES[profileId] ?? REALM_ATMOSPHERES["fantasy-realm"];
}

export function getAtmosphereTilePreview(profileId: AtmosphereProfileId): string {
  return getRealmBackgroundLayers(profileId).tilePreview;
}
