import type { CSSProperties } from "react";
import type { CoverPanel, CoverViewMode } from "./cover-view-modes";

export type CoverLayerType =
  | "title"
  | "subtitle"
  | "author"
  | "sticker"
  | "shape"
  | "line"
  | "badge"
  | "texture"
  | "back-tagline"
  | "back-blurb"
  | "back-bio"
  | "back-quote"
  | "spine-title"
  | "spine-author";

export interface CoverLayer {
  id: string;
  type: CoverLayerType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  content?: string;
  presetId?: string;
  style?: Record<string, string | number>;
}

export interface CoverEffectsState {
  vignette: number;
  grain: number;
  blur: number;
  contrast: number;
  darkOverlay: number;
  lightOverlay: number;
  glow: number;
  spotlight: number;
  paperTexture: number;
  cinematicShadow: number;
  readabilityBoost: number;
}

export const DEFAULT_COVER_EFFECTS: CoverEffectsState = {
  vignette: 0,
  grain: 0,
  blur: 0,
  contrast: 0,
  darkOverlay: 0,
  lightOverlay: 0,
  glow: 0,
  spotlight: 0,
  paperTexture: 0,
  cinematicShadow: 0,
  readabilityBoost: 0,
};

export interface CoverComposition {
  version: 1;
  backgroundPresetId: string;
  templateId: string;
  templateIndex: number;
  layers: CoverLayer[];
  effects: CoverEffectsState;
  updatedAt: string;
  viewMode?: CoverViewMode;
  showPrintGuides?: boolean;
  activePanel?: CoverPanel;
}

export type TextPositionPreset =
  | "title-top"
  | "title-center"
  | "title-bottom"
  | "author-top"
  | "author-bottom"
  | "classic"
  | "thriller"
  | "romance"
  | "nonfiction"
  | "study";

const uid = () => `cl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function createTextLayer(
  type: "title" | "subtitle" | "author",
  content: string,
  defaults: Partial<CoverLayer> = {},
): CoverLayer {
  const base: Record<typeof type, Partial<CoverLayer>> = {
    title: {
      x: 50,
      y: 43,
      width: 80,
      style: {
        fontSize: 100,
        fontWeight: 700,
        color: "#fff8e8",
        align: "center",
        letterSpacing: 2,
        lineHeight: 1.05,
        uppercase: 1,
        textShadow: "0 4px 24px rgba(0,0,0,0.55)",
      },
      zIndex: 30,
    },
    subtitle: {
      x: 50,
      y: 61,
      width: 75,
      style: {
        fontSize: 100,
        fontWeight: 400,
        color: "#d9c9aa",
        align: "center",
        letterSpacing: 0,
        lineHeight: 1.28,
        uppercase: 0,
        fontStyle: "italic",
        textShadow: "0 2px 12px rgba(0,0,0,0.4)",
      },
      zIndex: 28,
    },
    author: {
      x: 50,
      y: 84,
      width: 70,
      style: {
        fontSize: 100,
        fontWeight: 600,
        color: "#fff8e8",
        align: "center",
        letterSpacing: 3,
        lineHeight: 1.1,
        uppercase: 1,
        textShadow: "0 2px 16px rgba(0,0,0,0.5)",
      },
      zIndex: 26,
    },
  };

  return {
    id: uid(),
    type,
    visible: true,
    opacity: 1,
    rotation: 0,
    content,
    ...base[type],
    ...defaults,
  } as CoverLayer;
}

export function createDefaultLayers(title: string, subtitle: string, author: string): CoverLayer[] {
  const layers: CoverLayer[] = [
    createTextLayer("title", title),
    createTextLayer("subtitle", subtitle, { visible: Boolean(subtitle.trim()) }),
    createTextLayer("author", author),
  ];
  return layers.sort((a, b) => a.zIndex - b.zIndex);
}

export function createBackMatterLayers(opts: {
  tagline: string;
  blurb: string;
  bio: string;
  quote?: string;
  spineTitle?: string;
  spineAuthor?: string;
}): CoverLayer[] {
  const layers: CoverLayer[] = [
    {
      id: uid(),
      type: "back-tagline",
      content: opts.tagline,
      x: 12,
      y: 14,
      width: 78,
      visible: Boolean(opts.tagline.trim()),
      zIndex: 40,
      style: { fontSize: 100, fontWeight: 700, align: "left", color: "#e6c36a", lineHeight: 1.15 },
    },
    {
      id: uid(),
      type: "back-blurb",
      content: opts.blurb,
      x: 12,
      y: 38,
      width: 78,
      visible: Boolean(opts.blurb.trim()),
      zIndex: 38,
      style: { fontSize: 100, fontWeight: 400, align: "left", color: "#d9c9aa", lineHeight: 1.35 },
    },
    {
      id: uid(),
      type: "back-bio",
      content: opts.bio,
      x: 12,
      y: 72,
      width: 78,
      visible: Boolean(opts.bio.trim()),
      zIndex: 36,
      style: { fontSize: 100, fontWeight: 400, align: "left", color: "#cfc6b3", lineHeight: 1.3 },
    },
    {
      id: uid(),
      type: "spine-title",
      content: opts.spineTitle ?? "",
      x: 50,
      y: 42,
      width: 90,
      visible: true,
      zIndex: 34,
      style: { fontSize: 100, fontWeight: 700, align: "center", uppercase: 1, letterSpacing: 2 },
    },
    {
      id: uid(),
      type: "spine-author",
      content: opts.spineAuthor ?? "",
      x: 50,
      y: 58,
      width: 90,
      visible: Boolean((opts.spineAuthor ?? "").trim()),
      zIndex: 32,
      style: { fontSize: 90, fontWeight: 600, align: "center", uppercase: 1 },
    },
  ];
  if (opts.quote?.trim()) {
    layers.push({
      id: uid(),
      type: "back-quote",
      content: opts.quote,
      x: 50,
      y: 56,
      width: 72,
      visible: true,
      zIndex: 37,
      style: { fontSize: 95, fontStyle: "italic", align: "center", color: "#f5d27a", lineHeight: 1.25 },
    });
  }
  return layers;
}

export function isBackMatterLayer(type: CoverLayerType): boolean {
  return type.startsWith("back-") || type.startsWith("spine-");
}

export function isDraggableLayerType(type: CoverLayerType): boolean {
  return !["shape", "line", "texture"].includes(type);
}

export function syncBackMatterContent(
  layers: CoverLayer[],
  tagline: string,
  blurb: string,
  bio: string,
  quote: string,
  spineTitle: string,
  spineAuthor: string,
): CoverLayer[] {
  return layers.map((layer) => {
    if (layer.type === "back-tagline") return { ...layer, content: tagline, visible: Boolean(tagline.trim()) };
    if (layer.type === "back-blurb") return { ...layer, content: blurb, visible: Boolean(blurb.trim()) };
    if (layer.type === "back-bio") return { ...layer, content: bio, visible: Boolean(bio.trim()) };
    if (layer.type === "back-quote") return { ...layer, content: quote, visible: Boolean(quote.trim()) };
    if (layer.type === "spine-title") return { ...layer, content: spineTitle || layer.content };
    if (layer.type === "spine-author") return { ...layer, content: spineAuthor, visible: Boolean(spineAuthor.trim()) };
    return layer;
  });
}

export function createStickerLayer(presetId: string, name: string): CoverLayer {
  return {
    id: uid(),
    type: "sticker",
    presetId,
    content: name,
    x: 50,
    y: 50,
    width: 18,
    height: 18,
    rotation: 0,
    opacity: 0.85,
    zIndex: 20,
    visible: true,
    style: { color: "#e6c36a" },
  };
}

export function migrateComposition(
  raw: Partial<CoverComposition> | null | undefined,
  fallback: {
    title: string;
    subtitle: string;
    author: string;
    templateId: string;
    templateIndex: number;
    backgroundPresetId: string;
    tagline?: string;
    blurb?: string;
    bio?: string;
    quote?: string;
  },
): CoverComposition {
  if (raw?.version === 1 && Array.isArray(raw.layers) && raw.layers.length > 0) {
    const hasBack = raw.layers.some((l) => isBackMatterLayer(l.type));
    const frontLayers = raw.layers.filter((l) => !isBackMatterLayer(l.type));
    const backLayers = hasBack
      ? raw.layers.filter((l) => isBackMatterLayer(l.type))
      : createBackMatterLayers({
          tagline: fallback.tagline ?? "",
          blurb: fallback.blurb ?? "",
          bio: fallback.bio ?? "",
          quote: fallback.quote ?? "",
          spineTitle: fallback.title,
          spineAuthor: fallback.author,
        });
    return {
      version: 1,
      backgroundPresetId: raw.backgroundPresetId || fallback.backgroundPresetId,
      templateId: raw.templateId || fallback.templateId,
      templateIndex: raw.templateIndex ?? fallback.templateIndex,
      layers: [...frontLayers, ...backLayers].map((l) => ({ ...l, visible: l.visible !== false })),
      effects: { ...DEFAULT_COVER_EFFECTS, ...raw.effects },
      updatedAt: raw.updatedAt || new Date().toISOString(),
      viewMode: raw.viewMode ?? "front",
      showPrintGuides: raw.showPrintGuides ?? false,
      activePanel: raw.activePanel ?? "front",
    };
  }
  return {
    version: 1,
    backgroundPresetId: fallback.backgroundPresetId,
    templateId: fallback.templateId,
    templateIndex: fallback.templateIndex,
    layers: [
      ...createDefaultLayers(fallback.title, fallback.subtitle, fallback.author),
      ...createBackMatterLayers({
        tagline: fallback.tagline ?? "Una storia creata con Scriptora OS",
        blurb: fallback.blurb ?? "",
        bio: fallback.bio ?? "",
        quote: fallback.quote ?? "",
        spineTitle: fallback.title,
        spineAuthor: fallback.author,
      }),
    ],
    effects: { ...DEFAULT_COVER_EFFECTS },
    updatedAt: new Date().toISOString(),
    viewMode: "front",
    showPrintGuides: false,
    activePanel: "front",
  };
}

export function syncTextLayerContent(layers: CoverLayer[], title: string, subtitle: string, author: string): CoverLayer[] {
  return layers.map((layer) => {
    if (layer.type === "title") return { ...layer, content: title };
    if (layer.type === "subtitle") return { ...layer, content: subtitle, visible: Boolean(subtitle.trim()) };
    if (layer.type === "author") return { ...layer, content: author };
    return layer;
  });
}

export function updateLayer(layers: CoverLayer[], id: string, patch: Partial<CoverLayer>): CoverLayer[] {
  return layers.map((l) => (l.id === id ? { ...l, ...patch, style: patch.style ? { ...l.style, ...patch.style } : l.style } : l));
}

export function removeLayer(layers: CoverLayer[], id: string): CoverLayer[] {
  return layers.filter(
    (l) =>
      l.id !== id ||
      l.type === "title" ||
      l.type === "subtitle" ||
      l.type === "author" ||
      l.type === "spine-title",
  );
}

export function duplicateLayer(layers: CoverLayer[], id: string): CoverLayer[] {
  const source = layers.find((l) => l.id === id);
  if (!source || source.type === "title" || source.type === "subtitle" || source.type === "author") return layers;
  const copy: CoverLayer = {
    ...source,
    id: uid(),
    x: clamp(source.x + 4, 5, 95),
    y: clamp(source.y + 4, 5, 95),
    zIndex: Math.max(...layers.map((l) => l.zIndex), 0) + 1,
  };
  return [...layers, copy];
}

export function reorderLayer(layers: CoverLayer[], id: string, direction: "up" | "down"): CoverLayer[] {
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const idx = sorted.findIndex((l) => l.id === id);
  if (idx < 0) return layers;
  const swapIdx = direction === "up" ? idx + 1 : idx - 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return layers;
  const a = sorted[idx];
  const b = sorted[swapIdx];
  return layers.map((l) => {
    if (l.id === a.id) return { ...l, zIndex: b.zIndex };
    if (l.id === b.id) return { ...l, zIndex: a.zIndex };
    return l;
  });
}

const TEXT_PRESETS: Record<TextPositionPreset, Partial<Record<"title" | "subtitle" | "author", Partial<CoverLayer>>>> = {
  "title-top": { title: { x: 50, y: 22 } },
  "title-center": { title: { x: 50, y: 45 } },
  "title-bottom": { title: { x: 50, y: 68 } },
  "author-top": { author: { x: 50, y: 14 } },
  "author-bottom": { author: { x: 50, y: 88 } },
  classic: { title: { x: 50, y: 40 }, subtitle: { x: 50, y: 58 }, author: { x: 50, y: 84 } },
  thriller: { title: { x: 50, y: 36, style: { letterSpacing: 4, uppercase: 1 } }, author: { x: 50, y: 90 } },
  romance: { title: { x: 50, y: 38, style: { fontStyle: "normal" } }, subtitle: { x: 50, y: 55 }, author: { x: 50, y: 82 } },
  nonfiction: { title: { x: 50, y: 32, style: { uppercase: 0 } }, subtitle: { x: 50, y: 48 }, author: { x: 50, y: 78 } },
  study: { title: { x: 50, y: 30, style: { uppercase: 0, fontWeight: 700 } }, subtitle: { x: 50, y: 46 }, author: { x: 50, y: 76 } },
};

export function applyTextPositionPreset(layers: CoverLayer[], preset: TextPositionPreset): CoverLayer[] {
  const patch = TEXT_PRESETS[preset];
  if (!patch) return layers;
  return layers.map((layer) => {
    const p = patch[layer.type as "title" | "subtitle" | "author"];
    if (!p) return layer;
    return {
      ...layer,
      ...p,
      style: p.style ? { ...layer.style, ...p.style } : layer.style,
    };
  });
}

export function getLayerStyle(layer: CoverLayer, scale = 1): CSSProperties {
  const s = layer.style ?? {};
  const fontSize = typeof s.fontSize === "number" ? s.fontSize * scale * 0.32 : 16;
  return {
    position: "absolute",
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    transform: `translate(-50%, -50%) rotate(${layer.rotation ?? 0}deg)`,
    width: layer.width ? `${layer.width}%` : undefined,
    opacity: layer.opacity ?? 1,
    color: String(s.color ?? "#fff"),
    fontSize: `${fontSize}px`,
    fontWeight: s.fontWeight as CSSProperties["fontWeight"],
    fontStyle: s.fontStyle as CSSProperties["fontStyle"],
    textAlign: (s.align as CSSProperties["textAlign"]) ?? "center",
    letterSpacing: typeof s.letterSpacing === "number" ? `${s.letterSpacing}px` : undefined,
    lineHeight: typeof s.lineHeight === "number" ? s.lineHeight : undefined,
    textTransform: s.uppercase ? "uppercase" : undefined,
    textShadow: s.textShadow as string | undefined,
    backgroundColor: s.boxBackground as string | undefined,
    padding: s.boxBackground ? "4px 10px" : undefined,
    borderRadius: s.boxBackground ? "6px" : undefined,
    pointerEvents: layer.locked ? "none" : "auto",
    zIndex: layer.zIndex,
  };
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function quickPosition(layer: CoverLayer, pos: "top" | "center" | "bottom" | "left" | "right"): CoverLayer {
  const patch: Partial<CoverLayer> = {};
  if (pos === "top") patch.y = 18;
  if (pos === "center") patch.y = 50;
  if (pos === "bottom") patch.y = 82;
  if (pos === "left") patch.x = 22;
  if (pos === "right") patch.x = 78;
  return { ...layer, ...patch };
}
