import type { CoverComposition, CoverEffectsState } from "./cover-layers";
import { DEFAULT_COVER_EFFECTS } from "./cover-layers";

export type CoverVisualIntensity = "minimal" | "editorial" | "premium" | "cinematic";

export const VISUAL_INTENSITY_OPTIONS: { id: CoverVisualIntensity; labelIt: string; labelEn: string }[] = [
  { id: "minimal", labelIt: "Minimal", labelEn: "Minimal" },
  { id: "editorial", labelIt: "Editorial", labelEn: "Editorial" },
  { id: "premium", labelIt: "Premium", labelEn: "Premium" },
  { id: "cinematic", labelIt: "Cinematic", labelEn: "Cinematic" },
];

const INTENSITY_EFFECTS: Record<CoverVisualIntensity, Partial<CoverEffectsState>> = {
  minimal: { vignette: 8, grain: 4, contrast: 6, paperTexture: 0, cinematicShadow: 0, glow: 0 },
  editorial: { vignette: 18, grain: 10, contrast: 14, paperTexture: 8, cinematicShadow: 6, glow: 4, readabilityBoost: 8 },
  premium: { vignette: 28, grain: 16, contrast: 22, paperTexture: 14, cinematicShadow: 12, glow: 8, spotlight: 10, readabilityBoost: 14 },
  cinematic: { vignette: 38, grain: 22, contrast: 28, paperTexture: 18, cinematicShadow: 22, glow: 14, spotlight: 18, darkOverlay: 8, readabilityBoost: 12 },
};

export function applyVisualIntensity(
  composition: CoverComposition,
  intensity: CoverVisualIntensity,
): CoverComposition {
  const patch = INTENSITY_EFFECTS[intensity] ?? INTENSITY_EFFECTS.premium;
  return {
    ...composition,
    visualIntensity: intensity,
    effects: { ...DEFAULT_COVER_EFFECTS, ...composition.effects, ...patch },
    updatedAt: new Date().toISOString(),
  };
}

export function getDefaultIntensity(): CoverVisualIntensity {
  return "premium";
}
