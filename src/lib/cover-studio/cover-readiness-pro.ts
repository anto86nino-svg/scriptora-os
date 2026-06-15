import type { CoverComposition, CoverLayer } from "./cover-layers";
import type { CoverScore } from "./cover-types";
import { getBackgroundById } from "./cover-backgrounds";

export interface CoverReadinessPro {
  titleReadability: number;
  genreMatch: number;
  thumbnailImpact: number;
  authorVisibility: number;
  contrast: number;
  digitalReadiness: number;
  marketClarity: number;
  warnings: string[];
  strengths: string[];
  improvements: string[];
}

export function assessCoverReadinessPro(
  composition: CoverComposition,
  score: CoverScore,
  genre: string,
  italian = true,
): CoverReadinessPro {
  const warnings: string[] = [];
  const strengths: string[] = [];
  const improvements: string[] = [];

  const titleLayer = composition.layers.find((l) => l.type === "title");
  const authorLayer = composition.layers.find((l) => l.type === "author");
  const stickers = composition.layers.filter((l) => l.type === "sticker" && l.visible !== false);
  const bg = getBackgroundById(composition.backgroundPresetId);

  const titleSize = Number(titleLayer?.style?.fontSize ?? 100);
  const titleY = titleLayer?.y ?? 50;
  const authorY = authorLayer?.y ?? 84;

  if (titleSize < 70) warnings.push(italian ? "Titolo troppo piccolo in miniatura" : "Title too small at thumbnail size");
  if (titleY < 12 || titleY > 88) warnings.push(italian ? "Titolo fuori area sicura" : "Title outside safe area");
  if (authorY > 92) warnings.push(italian ? "Nome autore troppo in basso" : "Author name too low");
  if (stickers.length > 6) warnings.push(italian ? "Troppi elementi possono ridurre l'impatto" : "Too many elements may reduce impact");
  if (bg?.readability === "low") warnings.push(italian ? "Sfondo complesso — verifica contrasto titolo" : "Busy background — check title contrast");

  const readabilityPenalty =
    (titleSize < 70 ? 15 : 0) +
    (stickers.length > 6 ? 10 : 0) +
    (bg?.readability === "low" ? 12 : 0) +
    (composition.effects.darkOverlay > 60 && composition.effects.readabilityBoost < 20 ? 8 : 0);

  const titleReadability = Math.max(0, Math.min(100, score.titleReadability - readabilityPenalty * 0.5));
  const thumbnailImpact = Math.max(0, Math.min(100, score.thumbnailReadability - stickers.length * 2));
  const digitalReadiness = Math.max(0, Math.min(100, score.kdpReadiness - (bg?.readability === "low" ? 8 : 0)));

  if (titleReadability >= 70) strengths.push(italian ? "Titolo leggibile in miniatura" : "Title readable at thumbnail size");
  if (score.genreFit >= 70) strengths.push(italian ? "Genere visivamente coerente" : "Genre visually coherent");
  if (thumbnailImpact >= 65) strengths.push(italian ? "Buon impatto anteprima store" : "Good store preview impact");

  if (titleReadability < 65) improvements.push(italian ? "Aumenta dimensione o contrasto del titolo" : "Increase title size or contrast");
  if (stickers.length > 4) improvements.push(italian ? "Riduci sticker decorativi" : "Reduce decorative stickers");
  if (composition.effects.readabilityBoost < 15 && bg?.readability !== "high") {
    improvements.push(italian ? "Attiva boost leggibilità" : "Enable readability boost");
  }
  improvements.push(italian ? "Concept cover digitale — non paperback wrap" : "Digital cover concept — not paperback wrap");

  return {
    titleReadability: Math.round(titleReadability),
    genreMatch: score.genreFit,
    thumbnailImpact: Math.round(thumbnailImpact),
    authorVisibility: score.authorReadability,
    contrast: score.contrast,
    digitalReadiness: Math.round(digitalReadiness),
    marketClarity: score.marketFit,
    warnings,
    strengths,
    improvements,
  };
}

export function countVisibleStickers(layers: CoverLayer[]) {
  return layers.filter((l) => l.type === "sticker" && l.visible !== false).length;
}
