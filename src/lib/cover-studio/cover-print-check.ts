import type { CoverComposition } from "./cover-layers";
import type { CoverScore } from "./cover-types";
import { getBackgroundById } from "./cover-backgrounds";
import { SAFE_TEXT_INSET_PCT } from "./cover-view-modes";

export type PrintCheckStatus = "pass" | "warning" | "fail";

export interface PrintCheckItem {
  id: string;
  status: PrintCheckStatus;
  message: string;
  suggestion?: string;
}

export interface PrintCompatibilityReport {
  overall: PrintCheckStatus;
  score: number;
  items: PrintCheckItem[];
  summary: string;
}

type PrintCheckInput = {
  composition: CoverComposition;
  score: CoverScore;
  genre?: string;
  spineWidthIn?: number;
  pageCount?: number;
  italian?: boolean;
};

export function assessPrintCompatibility(input: PrintCheckInput): PrintCompatibilityReport {
  const { composition, score, spineWidthIn = 0.5, italian = true } = input;
  const items: PrintCheckItem[] = [];

  const title = composition.layers.find((l) => l.type === "title");
  const author = composition.layers.find((l) => l.type === "author");
  const bio = composition.layers.find((l) => l.type === "back-bio");
  const blurb = composition.layers.find((l) => l.type === "back-blurb");
  const stickers = composition.layers.filter((l) => l.type === "sticker" && l.visible !== false).length;
  const bg = getBackgroundById(composition.backgroundPresetId);

  const push = (id: string, status: PrintCheckStatus, message: string, suggestion?: string) => {
    items.push({ id, status, message, suggestion });
  };

  if ((title?.y ?? 50) < SAFE_TEXT_INSET_PCT || (title?.y ?? 50) > 100 - SAFE_TEXT_INSET_PCT) {
    push(
      "title-edge",
      "fail",
      italian ? "Titolo troppo vicino al bordo trim" : "Title too close to trim edge",
      italian ? "Sposta il titolo verso il centro safe area" : "Move title toward safe area center",
    );
  } else if ((title?.x ?? 50) < SAFE_TEXT_INSET_PCT + 2 || (title?.x ?? 50) > 100 - SAFE_TEXT_INSET_PCT - 2) {
    push(
      "title-lateral",
      "warning",
      italian ? "Titolo vicino al margine laterale" : "Title near lateral margin",
      italian ? "Centra il titolo nel front cover" : "Center title on front cover",
    );
  } else {
    push("title-edge", "pass", italian ? "Titolo dentro safe area" : "Title within safe area");
  }

  if (spineWidthIn < 0.08) {
    push(
      "spine-narrow",
      "fail",
      italian ? "Dorso troppo stretto per titolo leggibile" : "Spine too narrow for readable title",
      italian ? "Aumenta numero pagine o spessore carta" : "Increase page count or paper thickness",
    );
  } else if (spineWidthIn < 0.2) {
    push(
      "spine-narrow",
      "warning",
      italian ? "Dorso stretto — titolo dorso abbreviato" : "Narrow spine — spine text will be short",
      italian ? "Usa titolo corto sul dorso" : "Use short spine title",
    );
  } else {
    push("spine-narrow", "pass", italian ? "Dorso adeguato" : "Spine width OK");
  }

  if (score.thumbnailReadability < 55) {
    push(
      "thumbnail",
      "fail",
      italian ? "Titolo illegibile in miniatura Amazon" : "Title illegible at Amazon thumbnail",
      italian ? "Aumenta dimensione e contrasto titolo" : "Increase title size and contrast",
    );
  } else if (score.thumbnailReadability < 68) {
    push(
      "thumbnail",
      "warning",
      italian ? "Miniatura debole" : "Weak thumbnail",
      italian ? "Sposta titolo più in alto e aumenta contrasto" : "Move title higher and boost contrast",
    );
  } else {
    push("thumbnail", "pass", italian ? "Miniatura Amazon leggibile" : "Amazon thumbnail readable");
  }

  if (score.contrast < 58) {
    push(
      "contrast",
      "warning",
      italian ? "Contrasto insufficiente" : "Insufficient contrast",
      italian ? "Aumenta contrasto titolo o boost leggibilità" : "Boost title contrast or readability",
    );
  } else {
    push("contrast", "pass", italian ? "Contrasto adeguato" : "Contrast OK");
  }

  const bioLen = bio?.content?.length ?? 0;
  if (bioLen > 420) {
    push(
      "bio-long",
      "warning",
      italian ? "Bio autore troppo lunga per retro" : "Author bio too long for back cover",
      italian ? "Riduci bio a 2–3 frasi editoriali" : "Shorten bio to 2–3 editorial sentences",
    );
  } else if (bioLen < 20) {
    push(
      "bio-missing",
      "warning",
      italian ? "Bio autore assente o troppo corta" : "Author bio missing or too short",
      italian ? "Aggiungi bio credibilità autore" : "Add author credibility bio",
    );
  } else {
    push("bio-long", "pass", italian ? "Bio autore proporzionata" : "Author bio proportioned");
  }

  if ((author?.y ?? 84) > 92 || Number(author?.style?.fontSize ?? 100) < 70) {
    push(
      "author-vis",
      "warning",
      italian ? "Autore poco visibile sul fronte" : "Author low visibility on front",
      italian ? "Aumenta visibilità autore" : "Improve author visibility",
    );
  } else {
    push("author-vis", "pass", italian ? "Autore visibile" : "Author visible");
  }

  if (stickers > 7) {
    push(
      "busy",
      "fail",
      italian ? "Cover troppo confusa per stampa" : "Cover too busy for print",
      italian ? "Riduci sticker decorativi" : "Reduce decorative stickers",
    );
  } else if (stickers > 5) {
    push(
      "busy",
      "warning",
      italian ? "Molti elementi decorativi" : "Many decorative elements",
      italian ? "Semplifica per stampa paperback" : "Simplify for paperback print",
    );
  } else {
    push("busy", "pass", italian ? "Composizione equilibrata" : "Balanced composition");
  }

  if (bg?.readability === "low") {
    push(
      "bg-busy",
      "warning",
      italian ? "Sfondo complesso per stampa" : "Busy background for print",
      italian ? "Usa sfondo più pulito o vignette" : "Use cleaner background or vignette",
    );
  }

  if ((blurb?.content?.length ?? 0) > 900) {
    push(
      "blurb-long",
      "warning",
      italian ? "Testo retro troppo lungo" : "Back blurb too long",
      italian ? "Riduci descrizione a 6–8 righe" : "Reduce blurb to 6–8 lines",
    );
  }

  const failCount = items.filter((i) => i.status === "fail").length;
  const warnCount = items.filter((i) => i.status === "warning").length;
  const passCount = items.filter((i) => i.status === "pass").length;
  const scorePct = Math.round((passCount * 100 + warnCount * 55) / Math.max(1, items.length));

  const overall: PrintCheckStatus = failCount > 0 ? "fail" : warnCount > 0 ? "warning" : "pass";
  const summary =
    overall === "pass"
      ? italian
        ? "Compatibile stampa KDP/Lulu — verifica proof fisico"
        : "KDP/Lulu print compatible — verify physical proof"
      : overall === "warning"
        ? italian
          ? "Stampabile con aggiustamenti consigliati"
          : "Printable with recommended adjustments"
        : italian
          ? "Correggi errori prima della stampa"
          : "Fix issues before printing";

  return { overall, score: scorePct, items, summary };
}
