import type { CoverComposition } from "./cover-layers";
import type { CoverScore } from "./cover-types";
import { assessCoverReadinessPro } from "./cover-readiness-pro";

export type CoverCommercialIntelligence = {
  overallScore: number;
  genreFit: number;
  thumbnailReadability: number;
  titleVisibility: number;
  contrast: number;
  bookTokImpact: number;
  commercialClarity: number;
  suggestions: string[];
  strengths: string[];
};

export function assessCoverCommercialIntelligence(
  composition: CoverComposition,
  score: CoverScore,
  genre: string,
  italian = true,
): CoverCommercialIntelligence {
  const pro = assessCoverReadinessPro(composition, score, genre, italian);
  const titleLayer = composition.layers.find((l) => l.type === "title");
  const titleSize = Number(titleLayer?.style?.fontSize ?? 100);
  const stickers = composition.layers.filter((l) => l.type === "sticker" && l.visible !== false).length;

  const titleVisibility = Math.round(
    Math.max(0, Math.min(100, pro.titleReadability * 0.55 + score.titleReadability * 0.45)),
  );
  const thumbnailReadability = Math.round(
    Math.max(0, Math.min(100, pro.thumbnailImpact * 0.6 + score.thumbnailReadability * 0.4)),
  );
  const bookTokImpact = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        score.booktokPotential * 0.5 +
          thumbnailReadability * 0.25 +
          (titleSize >= 85 ? 12 : 0) -
          stickers * 3,
      ),
    ),
  );
  const commercialClarity = Math.round(
    Math.max(0, Math.min(100, pro.marketClarity * 0.4 + score.marketFit * 0.35 + pro.digitalReadiness * 0.25)),
  );

  const overallScore = Math.round(
    genreFitWeight(pro.genreMatch) * 0.16 +
      thumbnailReadability * 0.18 +
      titleVisibility * 0.18 +
      pro.contrast * 0.14 +
      bookTokImpact * 0.14 +
      commercialClarity * 0.2,
  );

  const suggestions: string[] = [...pro.improvements];
  const strengths: string[] = [...pro.strengths];

  if (thumbnailReadability < 65) {
    suggestions.push(
      italian
        ? "Aumenta contrasto e dimensione titolo per la miniatura store"
        : "Boost title size and contrast for store thumbnail",
    );
  }
  if (bookTokImpact < 60) {
    suggestions.push(
      italian
        ? "Prova un hook visivo più forte — meno elementi, più impatto"
        : "Try a bolder visual hook — fewer elements, more punch",
    );
  }
  if (commercialClarity < 62) {
    suggestions.push(
      italian
        ? "Rendi immediato genere e promessa — il lettore deve capire in 1 secondo"
        : "Make genre and promise instant — reader must get it in 1 second",
    );
  }

  return {
    overallScore,
    genreFit: pro.genreMatch,
    thumbnailReadability,
    titleVisibility,
    contrast: pro.contrast,
    bookTokImpact,
    commercialClarity,
    suggestions: Array.from(new Set(suggestions)).slice(0, 6),
    strengths,
  };
}

function genreFitWeight(score: number): number {
  return Math.max(0, Math.min(100, score));
}
