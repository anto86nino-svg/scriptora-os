import type { CoverComposition, CoverLayer } from "./cover-layers";
import { clamp, createStickerLayer, isBackMatterLayer, migrateComposition } from "./cover-layers";
import { getLayerPanel, type CoverPanel, type CoverSpecRects, type CoverViewMode } from "./cover-view-modes";
import { applyEditorialSnap, type SnapGuide } from "./cover-editorial-snap";

export type { SnapGuide };

export type CompositionLayoutPreset =
  | "thriller"
  | "dark-romance"
  | "fantasy-epic"
  | "self-help-clean"
  | "business-premium"
  | "study-workbook"
  | "horror-cinematic"
  | "romance-soft";

const LAYOUT_PRESETS: Record<
  CompositionLayoutPreset,
  {
    label: string;
    text: Partial<Record<"title" | "subtitle" | "author", Partial<CoverLayer>>>;
    decor?: { presetId: string; name: string; x: number; y: number; width: number };
  }
> = {
  thriller: {
    label: "Thriller layout",
    text: {
      title: { x: 50, y: 34, style: { fontSize: 110, letterSpacing: 4, uppercase: 1 } },
      subtitle: { x: 50, y: 52, style: { fontSize: 90 } },
      author: { x: 50, y: 90, style: { fontSize: 95 } },
    },
    decor: { presetId: "sk-divider", name: "Divider elegante", x: 50, y: 46, width: 55 },
  },
  "dark-romance": {
    label: "Dark romance layout",
    text: {
      title: { x: 50, y: 36, style: { fontSize: 105, color: "#fff1f5" } },
      subtitle: { x: 50, y: 54, style: { fontSize: 92, fontStyle: "italic" } },
      author: { x: 50, y: 86, style: { fontSize: 95 } },
    },
    decor: { presetId: "sk-rose-2", name: "Rosa scura", x: 82, y: 18, width: 14 },
  },
  "fantasy-epic": {
    label: "Fantasy epic layout",
    text: {
      title: { x: 50, y: 32, style: { fontSize: 112, color: "#e6c36a" } },
      subtitle: { x: 50, y: 50, style: { fontSize: 88 } },
      author: { x: 50, y: 82, style: { fontSize: 92 } },
    },
    decor: { presetId: "sk-crown-2", name: "Corona regale", x: 50, y: 14, width: 16 },
  },
  "self-help-clean": {
    label: "Self-help clean layout",
    text: {
      title: { x: 50, y: 30, style: { fontSize: 105, uppercase: 0, color: "#111827" } },
      subtitle: { x: 50, y: 46, style: { fontSize: 90, uppercase: 0 } },
      author: { x: 50, y: 78, style: { fontSize: 92, uppercase: 0 } },
    },
  },
  "business-premium": {
    label: "Business premium layout",
    text: {
      title: { x: 50, y: 28, style: { fontSize: 102, uppercase: 0, fontWeight: 700 } },
      subtitle: { x: 50, y: 44, style: { fontSize: 88 } },
      author: { x: 50, y: 76, style: { fontSize: 90 } },
    },
    decor: { presetId: "sk-chart", name: "Grafico", x: 88, y: 12, width: 12 },
  },
  "study-workbook": {
    label: "Study workbook layout",
    text: {
      title: { x: 50, y: 28, style: { fontSize: 100, uppercase: 0, fontWeight: 700 } },
      subtitle: { x: 50, y: 44, style: { fontSize: 86 } },
      author: { x: 50, y: 74, style: { fontSize: 88 } },
    },
    decor: { presetId: "sk-label-workbook", name: "Label Workbook", x: 50, y: 12, width: 28 },
  },
  "horror-cinematic": {
    label: "Horror cinematic layout",
    text: {
      title: { x: 50, y: 38, style: { fontSize: 108, letterSpacing: 3, color: "#f6f2ea" } },
      subtitle: { x: 50, y: 56, style: { fontSize: 88 } },
      author: { x: 50, y: 88, style: { fontSize: 92 } },
    },
    decor: { presetId: "sk-moon", name: "Luna", x: 50, y: 16, width: 14 },
  },
  "romance-soft": {
    label: "Romance soft layout",
    text: {
      title: { x: 50, y: 36, style: { fontSize: 104, fontStyle: "normal", color: "#fff1f5" } },
      subtitle: { x: 50, y: 54, style: { fontSize: 92, fontStyle: "italic" } },
      author: { x: 50, y: 84, style: { fontSize: 94 } },
    },
    decor: { presetId: "sk-rose", name: "Rosa", x: 18, y: 20, width: 12 },
  },
};

export const COMPOSITION_LAYOUT_PRESETS = Object.entries(LAYOUT_PRESETS).map(([id, v]) => ({
  id: id as CompositionLayoutPreset,
  label: v.label,
}));

export function applyCompositionLayoutPreset(
  composition: CoverComposition,
  preset: CompositionLayoutPreset,
  addDecor = true,
): CoverComposition {
  const def = LAYOUT_PRESETS[preset];
  if (!def) return composition;

  let layers = composition.layers.map((layer) => {
    const p = def.text[layer.type as "title" | "subtitle" | "author"];
    if (!p) return layer;
    return {
      ...layer,
      ...p,
      style: p.style ? { ...layer.style, ...p.style } : layer.style,
    };
  });

  if (addDecor && def.decor) {
    const exists = layers.some((l) => l.presetId === def.decor!.presetId);
    if (!exists) {
      const sticker = createStickerLayer(def.decor.presetId, def.decor.name);
      sticker.x = def.decor.x;
      sticker.y = def.decor.y;
      sticker.width = def.decor.width;
      sticker.height = def.decor.width;
      sticker.zIndex = Math.min(...layers.map((l) => l.zIndex), 10) - 1;
      layers = [...layers, sticker];
    }
  }

  return { ...composition, layers, updatedAt: new Date().toISOString() };
}

export function validateCoverComposition(composition: CoverComposition): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!composition.layers.some((l) => l.type === "title" && l.content?.trim())) {
    errors.push("Titolo mancante");
  }
  if (!composition.backgroundPresetId) errors.push("Sfondo non selezionato");
  for (const layer of composition.layers) {
    if (layer.x < 0 || layer.x > 100 || layer.y < 0 || layer.y > 100) {
      errors.push(`Layer ${layer.type} fuori area`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function serializeCoverComposition(composition: CoverComposition): string {
  return JSON.stringify(composition);
}

export function restoreCoverComposition(
  raw: string | null | undefined,
  fallback: Parameters<typeof migrateComposition>[1],
): CoverComposition {
  if (!raw) return migrateComposition(null, fallback);
  try {
    return migrateComposition(JSON.parse(raw) as Partial<CoverComposition>, fallback);
  } catch {
    return migrateComposition(null, fallback);
  }
}

export function pointerToCoverPercent(stageRect: DOMRect, clientX: number, clientY: number) {
  return {
    x: clamp(((clientX - stageRect.left) / stageRect.width) * 100, 2, 98),
    y: clamp(((clientY - stageRect.top) / stageRect.height) * 100, 2, 98),
  };
}

export function getLayerHitbox(layer: CoverLayer): { widthPct: number; heightPct: number } {
  if (layer.type === "title" || layer.type === "subtitle" || layer.type === "author") {
    return { widthPct: layer.width ?? 78, heightPct: layer.type === "title" ? 22 : 12 };
  }
  if (layer.type === "back-tagline") return { widthPct: layer.width ?? 55, heightPct: 14 };
  if (layer.type === "back-blurb") return { widthPct: layer.width ?? 78, heightPct: 28 };
  if (layer.type === "back-bio") return { widthPct: layer.width ?? 78, heightPct: 18 };
  if (layer.type === "back-quote") return { widthPct: layer.width ?? 72, heightPct: 12 };
  if (layer.type === "spine-title" || layer.type === "spine-author") {
    return { widthPct: 85, heightPct: 8 };
  }
  const w = layer.width ?? 18;
  return { widthPct: w, heightPct: layer.height ?? w };
}

export function getDraggableLayersForView(
  composition: CoverComposition,
  viewMode: CoverViewMode,
  activePanel: CoverPanel,
): CoverLayer[] {
  return composition.layers.filter((l) => {
    if (l.visible === false || l.locked) return false;
    if (!isDraggableLayer(l)) return false;
    const panel = getLayerPanel(l.type);
    if (viewMode === "front" || viewMode === "thumbnail") return panel === "front";
    if (viewMode === "open-book" || viewMode === "paperback") return panel === activePanel;
    return panel === "front";
  });
}

export function snapLayerPosition(
  layer: CoverLayer,
  x: number,
  y: number,
  thumbnailMode = false,
): { x: number; y: number; guides: SnapGuide[] } {
  return applyEditorialSnap(x, y, layer, { thumbnailMode });
}

export function getLayerDisplayName(layer: CoverLayer, italian = true): string {
  if (layer.type === "title") return italian ? "Titolo" : "Title";
  if (layer.type === "subtitle") return italian ? "Sottotitolo" : "Subtitle";
  if (layer.type === "author") return italian ? "Autore" : "Author";
  if (layer.type === "back-tagline") return italian ? "Tagline retro" : "Back tagline";
  if (layer.type === "back-blurb") return italian ? "Testo retro" : "Back blurb";
  if (layer.type === "back-bio") return italian ? "Bio autore" : "Author bio";
  if (layer.type === "back-quote") return italian ? "Citazione" : "Review quote";
  if (layer.type === "spine-title") return italian ? "Titolo dorso" : "Spine title";
  if (layer.type === "spine-author") return italian ? "Autore dorso" : "Spine author";
  return layer.content ?? layer.presetId ?? layer.type;
}

export function toggleLayerVisibility(layers: CoverLayer[], id: string): CoverLayer[] {
  return layers.map((l) => (l.id === id ? { ...l, visible: l.visible === false } : l));
}

export function toggleLayerLock(layers: CoverLayer[], id: string): CoverLayer[] {
  return layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l));
}

export function isDraggableLayer(layer: CoverLayer): boolean {
  return layer.visible !== false && !layer.locked;
}
