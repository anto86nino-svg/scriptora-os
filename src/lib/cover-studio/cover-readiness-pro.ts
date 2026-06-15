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

function effectIntensity(composition: CoverComposition) {
  const e = composition.effects;
  return e.vignette + e.grain + e.darkOverlay + e.spotlight + e.cinematicShadow;
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
  const stickers = countVisibleStickers(composition.layers);
  const bg = getBackgroundById(composition.backgroundPresetId);

  const titleSize = Number(titleLayer?.style?.fontSize ?? 100);
  const titleY = titleLayer?.y ?? 50;
  const titleX = titleLayer?.x ?? 50;
  const authorY = authorLayer?.y ?? 84;
  const authorSize = Number(authorLayer?.style?.fontSize ?? 100);
  const fx = effectIntensity(composition);

  if (titleSize < 70) warnings.push(italian ? "Titolo troppo piccolo" : "Title too small");
  if (titleY < 10 || titleY > 90) warnings.push(italian ? "Titolo troppo vicino ai bordi" : "Title too close to edges");
  if (titleX < 12 || titleX > 88) warnings.push(italian ? "Titolo spostato lateralmente fuori area" : "Title shifted outside safe zone");
  if (authorY > 93 || authorSize < 65) warnings.push(italian ? "Autore poco visibile" : "Author hard to see");
  if (stickers > 6) warnings.push(italian ? "Troppi sticker decorativi" : "Too many decorative stickers");
  if (fx > 180) warnings.push(italian ? "Troppi effetti sovrapposti" : "Too many stacked effects");
  if (bg?.readability === "low") warnings.push(italian ? "Sfondo troppo complesso" : "Background too busy");
  if (score.genreFit < 55) warnings.push(italian ? "Cover poco coerente col genere" : "Cover weak genre match");
  if (score.thumbnailReadability < 58) warnings.push(italian ? "Miniatura debole" : "Weak thumbnail impact");

  const readabilityPenalty =
    (titleSize < 70 ? 18 : 0) +
    (titleY < 10 || titleY > 90 ? 10 : 0) +
    (stickers > 6 ? 12 : 0) +
    (bg?.readability === "low" ? 14 : 0) +
    (fx > 180 ? 8 : 0) +
    (composition.effects.darkOverlay > 60 && composition.effects.readabilityBoost < 20 ? 10 : 0);

  const titleReadability = Math.max(0, Math.min(100, score.titleReadability - readabilityPenalty * 0.45));
  const thumbnailImpact = Math.max(0, Math.min(100, score.thumbnailReadability - stickers * 2.2));
  const digitalReadiness = Math.max(0, Math.min(100, score.kdpReadiness - (bg?.readability === "low" ? 10 : 0)));

  if (titleReadability >= 72) strengths.push(italian ? "Titolo leggibile in miniatura" : "Title readable at thumbnail");
  if (score.genreFit >= 70) strengths.push(italian ? "Coerenza di genere visiva" : "Visual genre coherence");
  if (thumbnailImpact >= 68) strengths.push(italian ? "Buona per anteprima store digitale" : "Good for digital store preview");
  strengths.push(italian ? "Concept cover avanzato — da verificare prima di stampa paperback" : "Advanced digital concept — verify before paperback print");

  if (titleSize < 75) improvements.push(italian ? "Aumenta dimensione titolo" : "Increase title size");
  if (titleY > 72) improvements.push(italian ? "Sposta il titolo più in alto" : "Move title higher");
  if (titleY < 18) improvements.push(italian ? "Abbassa leggermente il titolo per equilibrio" : "Lower title slightly for balance");
  if (authorY > 90) improvements.push(italian ? "Aumenta visibilità autore" : "Improve author visibility");
  if (stickers > 4) improvements.push(italian ? "Riduci sticker decorativi" : "Reduce decorative stickers");
  if (bg?.readability !== "high") improvements.push(italian ? "Usa sfondo più pulito o boost leggibilità" : "Use cleaner background or readability boost");
  if (Number(titleLayer?.style?.color) === undefined && score.contrast < 65) {
    improvements.push(italian ? "Aumenta contrasto titolo" : "Increase title contrast");
  }
  improvements.push(italian ? "Pronta per anteprima store — non paperback wrap completo" : "Store preview ready — not full paperback wrap");

  return {
    titleReadability: Math.round(titleReadability),
    genreMatch: score.genreFit,
    thumbnailImpact: Math.round(thumbnailImpact),
    authorVisibility: Math.round(Math.max(0, score.authorReadability - (authorY > 92 ? 12 : 0))),
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
