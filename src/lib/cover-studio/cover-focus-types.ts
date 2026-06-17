export type CoverFocusPanelId =
  | "style"
  | "text"
  | "images"
  | "layers"
  | "stickers"
  | "effects"
  | "format"
  | "marketplace"
  | "readiness"
  | "print"
  | "export";

export type CoverTextHighlight = "title" | "subtitle" | "author" | null;

export type MarketplaceStoreId = "amazon" | "apple" | "kobo" | "google";

export const COVER_FOCUS_PANEL_LABELS: Record<
  CoverFocusPanelId,
  { it: string; en: string }
> = {
  style: { it: "Stile", en: "Style" },
  text: { it: "Testo", en: "Text" },
  images: { it: "Immagini", en: "Images" },
  layers: { it: "Layer", en: "Layers" },
  stickers: { it: "Sticker", en: "Stickers" },
  effects: { it: "Effetti", en: "Effects" },
  format: { it: "Formato", en: "Format" },
  marketplace: { it: "Store", en: "Store" },
  readiness: { it: "Score", en: "Score" },
  print: { it: "Stampa", en: "Print" },
  export: { it: "Export", en: "Export" },
};

export function mapFocusPanelToStudioTab(
  panel: CoverFocusPanelId,
): "style" | "text" | "images" | "layers" | "stickers" | "effects" | "print" | "readiness" | null {
  if (panel === "export" || panel === "format" || panel === "marketplace") return null;
  return panel;
}
