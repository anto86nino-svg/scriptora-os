import type { CoverComposition } from "./cover-layers";
import type { CanvasRect } from "./cover-backgrounds";
import { drawBackgroundPreset, getBackgroundById } from "./cover-backgrounds";
import { drawStickerSymbol, getStickerById } from "./cover-stickers";
import { applyCoverEffects } from "./cover-effects";
import type { CoverLayer } from "./cover-layers";

type CoverTemplateLike = {
  dark: boolean;
  textColor: string;
  mutedText: string;
  accentColor: string;
  font: string;
};

export function drawComposedFrontCover(
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
  const bg = getBackgroundById(composition.backgroundPresetId);

  if (opts.uploadedImage && opts.loadImage) {
    void opts.loadImage(opts.uploadedImage).then((image) => {
      drawImageInRect(ctx, image, rect, opts.imageFit ?? "soft");
      finishCompose();
    }).catch(() => finishCompose());
    return;
  }

  finishCompose();

  function finishCompose() {
    if (bg) {
      drawBackgroundPreset(ctx, rect, bg, seed);
    } else if (opts.legacyDraw) {
      opts.legacyDraw();
    }

    const sorted = [...composition.layers]
      .filter((l) => l.visible !== false)
      .sort((a, b) => a.zIndex - b.zIndex);

    for (const layer of sorted) {
      if (layer.type === "sticker") drawStickerLayer(ctx, rect, layer);
    }

    for (const layer of sorted) {
      if (layer.type === "title" || layer.type === "subtitle" || layer.type === "author") {
        drawTextLayer(ctx, rect, layer, template);
      }
    }

    applyCoverEffects(ctx, rect, composition.effects);
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
    const metrics = ctx.measureText(uppercase);
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
  if (imageRatio > rectRatio) {
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
    ctx.globalAlpha = 0.42;
    ctx.filter = "blur(22px)";
    ctx.drawImage(image, rect.x - rect.w * 0.04, rect.y - rect.h * 0.04, rect.w * 1.08, rect.h * 1.08);
    ctx.restore();
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
