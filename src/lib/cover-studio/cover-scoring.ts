import type { CoverBrief, CoverScore } from "./cover-types";
import { getTemplateById, recommendTemplate } from "./cover-templates";

export function clampScore(v: number): number {
  if (!Number.isFinite(v)) return 50;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function scoreCover(
  brief: CoverBrief,
  opts: {
    templateId?: string;
    titleLength?: number;
    subtitleLength?: number;
    hasUpload?: boolean;
    darkTemplate?: boolean;
  },
): CoverScore {
  const tpl = getTemplateById(opts.templateId || "") || recommendTemplate(brief.genreFamily);
  const titleLen = opts.titleLength ?? brief.title.length;
  const subLen = opts.subtitleLength ?? brief.subtitle.length;
  const hasTitle = Boolean(
    brief.title.trim() && brief.title !== "Senza titolo" && brief.title !== "Untitled",
  );

  let titleReadability = 78;
  if (!hasTitle) titleReadability = 12;
  else {
    if (titleLen > 42) titleReadability -= 18;
    if (titleLen > 55) titleReadability -= 12;
    if (titleLen < 8) titleReadability += 6;
    if (titleLen <= 28) titleReadability += 8;
  }

  let authorReadability = brief.author.trim() ? 82 : 35;
  if (brief.author.length > 28) authorReadability -= 10;

  const thumbnailReadability = clampScore(tpl.thumbnailStrength - (titleLen > 40 ? 12 : 0));
  const contrast = clampScore(opts.darkTemplate !== false ? tpl.thumbnailStrength * 0.92 : 74);
  const genreFit = clampScore(tpl.kdpFit * 0.55 + tpl.booktokFit * 0.2 + 25);
  const typography = clampScore(72 + (titleLen <= 32 ? 10 : -6));
  const marketFit = clampScore(tpl.kdpFit);
  const emotionalPull = clampScore(tpl.booktokFit * 0.6 + genreFit * 0.4);
  const professionalPolish = clampScore(tpl.kdpFit * 0.5 + typography * 0.3 + (opts.hasUpload ? 8 : 0));
  let kdpReadiness = clampScore(
    (hasTitle && brief.author.trim() ? 70 : 40) +
      tpl.kdpFit * 0.25 +
      thumbnailReadability * 0.15,
  );
  const booktokPotential = clampScore(tpl.booktokFit);

  let finalScore = clampScore(
    genreFit * 0.14 +
      titleReadability * 0.16 +
      thumbnailReadability * 0.14 +
      contrast * 0.1 +
      typography * 0.1 +
      marketFit * 0.12 +
      emotionalPull * 0.08 +
      professionalPolish * 0.08 +
      kdpReadiness * 0.08,
  );

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const improvements: string[] = [];

  if (titleReadability >= 75) strengths.push("Titolo leggibile in formato KDP");
  else if (!hasTitle) weaknesses.push("Titolo mancante");
  else weaknesses.push("Titolo troppo lungo per thumbnail");
  if (thumbnailReadability >= 78) strengths.push("Buona thumbnail power");
  if (genreFit >= 75) strengths.push("Coerenza genere/template");
  else weaknesses.push("Template non allineato al genere");
  if (brief.author.trim()) strengths.push("Autore visibile");
  else {
    weaknesses.push("Autore mancante");
    improvements.push("Aggiungi nome autore in basso");
  }
  if (subLen > 90) {
    weaknesses.push("Sottotitolo troppo lungo");
    improvements.push("Accorcia sottotitolo o sposta copy nel retro");
  }
  if (contrast < 60) improvements.push("Aumenta contrasto titolo/sfondo");

  if (titleReadability < 50) finalScore = Math.min(finalScore, 68);
  if (!hasTitle) finalScore = Math.min(finalScore, 65);
  if (thumbnailReadability < 55) finalScore = Math.min(finalScore, 75);
  if (genreFit < 55) finalScore = Math.min(finalScore, 70);
  if (!brief.author.trim()) kdpReadiness = Math.min(kdpReadiness, 55);

  return {
    genreFit,
    titleReadability: clampScore(titleReadability),
    authorReadability: clampScore(authorReadability),
    thumbnailReadability,
    contrast,
    typography,
    marketFit,
    emotionalPull,
    professionalPolish,
    kdpReadiness: clampScore(kdpReadiness),
    booktokPotential,
    finalScore,
    strengths,
    weaknesses,
    improvements,
  };
}

export function harmonizeCoverScore(score: CoverScore): CoverScore {
  const s = { ...score };
  if (s.finalScore >= 75 && s.titleReadability < 50) s.titleReadability = 50;
  if (s.thumbnailReadability < 55) s.finalScore = Math.min(s.finalScore, 75);
  if (s.genreFit < 55) s.finalScore = Math.min(s.finalScore, 70);
  return s;
}
