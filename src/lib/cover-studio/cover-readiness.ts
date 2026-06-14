import type { CoverBrief, CoverReadiness } from "./cover-types";
import type { CoverScore } from "./cover-types";
import { isItalianLanguage } from "./cover-brief";

export function assessCoverReadiness(
  brief: CoverBrief,
  score: CoverScore,
  opts: { hasSavedCover?: boolean; exportFormat?: "epub" | "print" },
): CoverReadiness {
  const italian = isItalianLanguage(brief.language);
  const warnings: string[] = [];
  const nextActions: string[] = [];

  const hasTitle = Boolean(brief.title.trim() && brief.title !== "Senza titolo" && brief.title !== "Untitled");
  const hasAuthor = Boolean(brief.author.trim());
  const hasSubtitle = Boolean(brief.subtitle.trim());
  const hasGenre = Boolean(brief.genre.trim() && brief.genre !== "Generale" && brief.genre !== "General");
  const hasSavedCover = Boolean(opts.hasSavedCover);
  const thumbnailReadable = score.thumbnailReadability >= 60;
  const kdpReady = hasTitle && hasAuthor && score.kdpReadiness >= 65 && thumbnailReadable;
  const exportCompatible = hasTitle && hasAuthor && (opts.exportFormat !== "epub" || hasSavedCover || score.kdpReadiness >= 55);

  if (!hasTitle) warnings.push(italian ? "Titolo mancante" : "Missing title");
  if (!hasAuthor) warnings.push(italian ? "Autore mancante" : "Missing author");
  if (!thumbnailReadable) warnings.push(italian ? "Titolo difficile in miniatura" : "Title hard to read at thumbnail size");
  if (!hasSavedCover) warnings.push(italian ? "Cover non ancora salvata nel progetto" : "Cover not saved to project yet");
  if (brief.subtitle.length > 100) warnings.push(italian ? "Sottotitolo troppo lungo" : "Subtitle too long");

  if (!hasAuthor) nextActions.push(italian ? "Inserisci autore" : "Add author name");
  if (!hasSavedCover) nextActions.push(italian ? "Salva cover nel progetto" : "Save cover to project");
  if (score.improvements.length) nextActions.push(score.improvements[0]);
  if (kdpReady) nextActions.push(italian ? "Pronta per export EPUB/KDP" : "Ready for EPUB/KDP export");
  else nextActions.push(italian ? "Raffina titolo e contrasto" : "Refine title and contrast");

  return {
    hasTitle,
    hasAuthor,
    hasSubtitle,
    hasGenre,
    hasSavedCover,
    exportCompatible,
    thumbnailReadable,
    kdpReady,
    warnings,
    nextActions,
  };
}
