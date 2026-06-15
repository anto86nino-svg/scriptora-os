import type { CoverComposition } from "./cover-layers";
import type { CoverLayer } from "./cover-layers";
import type { CanvasRect } from "./cover-backgrounds";
import { drawBackgroundPreset, getBackgroundById } from "./cover-backgrounds";
import { drawStickerSymbol, getStickerById } from "./cover-stickers";
import { applyCoverEffects } from "./cover-effects";

type CoverTemplateLike = {
  dark: boolean;
  textColor: string;
  mutedText: string;
  accentColor: string;
  font: string;
};

export async function drawComposedFrontCover(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  opts: {
    composition: CoverComposition;
    template: CoverTemplateLike;
    uploadedImage?: string | null;
    imageFit?: "cover" | "contain" | "soft";
    seed?: number;
    loadImage?: (src: string) => Promise<HTMLImageElement>;
    legacyDraw?: () => void;
  },
) {
  const { composition, template, seed = 1 } = opts;
  const frontImage =
    opts.uploadedImage ?? composition.images?.front ?? null;

  if (frontImage && opts.loadImage) {
    try {
      const image = await opts.loadImage(frontImage);
      drawImageInRect(ctx, image, rect, opts.imageFit ?? composition.imageFit ?? "soft");
      const overlay = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
      overlay.addColorStop(0, template.dark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.06)");
      overlay.addColorStop(0.55, template.dark ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.14)");
      overlay.addColorStop(1, template.dark ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.32)");
      ctx.fillStyle = overlay;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    } catch {
      drawBaseBackground();
    }
  } else {
    drawBaseBackground();
  }

  const sorted = [...composition.layers]
    .filter((l) => l.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    if (layer.type === "image" && layer.style?.imagePanel !== "back" && layer.style?.imagePanel !== "spine") {
      await drawImageLayer(ctx, rect, layer, opts.loadImage);
    }
  }

  for (const layer of sorted) {
    if (layer.type === "sticker") drawStickerLayer(ctx, rect, layer);
  }

  for (const layer of sorted) {
    if (layer.type === "title" || layer.type === "subtitle" || layer.type === "author") {
      drawTextLayer(ctx, rect, layer, template);
    }
  }

  applyCoverEffects(ctx, rect, composition.effects);

  function drawBaseBackground() {
    const bg = getBackgroundById(composition.backgroundPresetId);
    if (bg) {
      drawBackgroundPreset(ctx, rect, bg, seed);
    } else if (opts.legacyDraw) {
      opts.legacyDraw();
    }
  }
}

export async function drawPanelImageLayers(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  composition: CoverComposition,
  panel: "front" | "back" | "spine",
  loadImage?: (src: string) => Promise<HTMLImageElement>,
) {
  const panelImage =
    panel === "back"
      ? composition.images?.back
      : panel === "spine"
        ? composition.images?.spine
        : composition.images?.front;

  if (panelImage && loadImage) {
    try {
      const image = await loadImage(panelImage);
      drawImageInRect(ctx, image, rect, composition.imageFit ?? "cover");
    } catch {
      /* skip */
    }
  }

  const sorted = [...composition.layers]
    .filter((l) => l.visible !== false && l.type === "image" && l.style?.imagePanel === panel)
    .sort((a, b) => a.zIndex - b.zIndex);

  for (const layer of sorted) {
    await drawImageLayer(ctx, rect, layer, loadImage);
  }
}

async function drawImageLayer(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  layer: CoverLayer,
  loadImage?: (src: string) => Promise<HTMLImageElement>,
) {
  const src = layer.content?.trim();
  if (!src?.startsWith("data:image") || !loadImage) return;
  try {
    const image = await loadImage(src);
    const wPct = layer.width ?? 92;
    const hPct = layer.height ?? 92;
    const cx = rect.x + (rect.w * layer.x) / 100;
    const cy = rect.y + (rect.h * layer.y) / 100;
    const drawW = rect.w * (wPct / 100);
    const drawH = rect.h * (hPct / 100);
    const fit = (layer.style?.objectFit as "cover" | "contain" | "soft") ?? "cover";
    const blur = Number(layer.style?.blur ?? 0);

    ctx.save();
    ctx.globalAlpha = layer.opacity ?? 1;
    if (layer.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }
    if (blur > 0) ctx.filter = `blur(${blur}px)`;

    const imageRect = {
      x: cx - drawW / 2,
      y: cy - drawH / 2,
      w: drawW,
      h: drawH,
    };
    drawImageInRect(ctx, image, imageRect, fit);
    ctx.restore();
  } catch {
    /* skip broken image */
  }
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  layer: CoverLayer,
  template: CoverTemplateLike,
) {
  const content = layer.content?.trim();
  if (!content) return;

  const s = layer.style ?? {};
  const scale = Number(s.fontSize ?? 100) / 100;
  const baseSize =
    layer.type === "title"
      ? clamp(Math.round(rect.w * (content.length > 36 ? 0.066 : content.length > 22 ? 0.078 : 0.091) * scale), 28, 190)
      : layer.type === "subtitle"
        ? clamp(Math.round(rect.w * 0.034 * scale), 16, 78)
        : clamp(Math.round(rect.w * 0.032 * scale), 16, 72);

  const x = rect.x + (rect.w * layer.x) / 100;
  const y = rect.y + (rect.h * layer.y) / 100;
  const maxWidth = rect.w * ((layer.width ?? 80) / 100);
  const color = String(s.color ?? (layer.type === "subtitle" ? template.mutedText : template.textColor));
  const fontFamily = canvasFontFamily(String(s.fontFamily ?? template.font), layer.type === "author" ? "sans-serif" : "serif");
  const weight = s.fontWeight ?? (layer.type === "title" ? 700 : layer.type === "author" ? 600 : 400);
  const italic = s.fontStyle === "italic" ? "italic " : "";
  const uppercase = s.uppercase ? content.toUpperCase() : content;

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (s.textShadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = rect.w * 0.012;
    ctx.shadowOffsetY = rect.w * 0.004;
  }
  if (s.boxBackground) {
    ctx.fillStyle = String(s.boxBackground);
    ctx.fillRect(x - maxWidth / 2, y - baseSize * 0.6, maxWidth, baseSize * 1.4);
  }
  ctx.fillStyle = color;
  ctx.font = `${italic}${weight} ${baseSize}px ${fontFamily}`;
  ctx.textAlign = (s.align as CanvasTextAlign) ?? "center";
  ctx.textBaseline = "middle";
  const letterSpacing = Number(s.letterSpacing ?? 0);
  if (letterSpacing > 0 && "letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${letterSpacing}px`;
  }
  const lineHeight = baseSize * Number(s.lineHeight ?? (layer.type === "subtitle" ? 1.28 : 1.05));
  wrapText(ctx, uppercase, x, y, maxWidth, lineHeight, layer.type === "title" ? 5 : 3, (s.align as CanvasTextAlign) ?? "center");
  ctx.restore();
}

function drawStickerLayer(ctx: CanvasRenderingContext2D, rect: CanvasRect, layer: CoverLayer) {
  const preset = layer.presetId ? getStickerById(layer.presetId) : undefined;
  const symbol = preset?.symbol ?? "star";
  const cx = rect.x + (rect.w * layer.x) / 100;
  const cy = rect.y + (rect.h * layer.y) / 100;
  const wPct = layer.width ?? preset?.defaultStyle.width ?? 18;
  const size = rect.w * (wPct / 100);
  const color = String(layer.style?.color ?? preset?.defaultStyle.color ?? "#e6c36a");
  const opacity = layer.opacity ?? preset?.defaultStyle.opacity ?? 0.85;
  const rotation = layer.rotation ?? preset?.defaultStyle.rotation ?? 0;
  drawStickerSymbol(ctx, symbol, cx, cy, size, color, opacity, rotation);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
  align: CanvasTextAlign,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const testLine = line + (line ? " " : "") + word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  const prev = ctx.textAlign;
  ctx.textAlign = align;
  const startY = y - ((visible.length - 1) * lineHeight) / 2;
  visible.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  ctx.textAlign = prev;
}

function drawImageInRect(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: CanvasRect,
  fit: "cover" | "contain" | "soft",
) {
  const imageRatio = image.width / image.height;
  const rectRatio = rect.w / rect.h;
  let drawW = rect.w;
  let drawH = rect.h;
  if (fit === "contain") {
    if (imageRatio > rectRatio) {
      drawW = rect.w;
      drawH = rect.w / imageRatio;
    } else {
      drawH = rect.h;
      drawW = rect.h * imageRatio;
    }
  } else if (imageRatio > rectRatio) {
    drawH = rect.h;
    drawW = rect.h * imageRatio;
  } else {
    drawW = rect.w;
    drawH = rect.w / imageRatio;
  }
  const dx = rect.x + (rect.w - drawW) / 2;
  const dy = rect.y + (rect.h - drawH) / 2;
  if (fit === "soft") {
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.filter = "blur(18px)";
    ctx.drawImage(image, rect.x - rect.w * 0.03, rect.y - rect.h * 0.03, rect.w * 1.06, rect.h * 1.06);
    ctx.restore();
    ctx.globalAlpha = 0.92;
  }
  ctx.drawImage(image, dx, dy, drawW, drawH);
}

function canvasFontFamily(font: string, generic: "serif" | "sans-serif") {
  const clean = font.replace(/"/g, "");
  return clean.includes(" ") ? `"${clean}", ${generic}` : `${clean}, ${generic}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
