import type { CoverComposition, CoverLayer } from "./cover-layers";
import { isBackMatterLayer } from "./cover-layers";
import type { CanvasRect } from "./cover-backgrounds";
import { drawBackgroundPreset, getBackgroundById } from "./cover-backgrounds";
import { applyCoverEffects } from "./cover-effects";

type CoverTemplateLike = {
  dark: boolean;
  textColor: string;
  mutedText: string;
  accentColor: string;
  font: string;
};

export function drawComposedBackMatter(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  composition: CoverComposition,
  template: CoverTemplateLike,
  opts?: {
    authorImage?: HTMLImageElement | null;
    seed?: number;
  },
) {
  const seed = opts?.seed ?? 1;
  const bg = getBackgroundById(composition.backgroundPresetId);
  if (bg) {
    drawBackgroundPreset(ctx, rect, bg, seed + 3);
  } else {
    const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
    grad.addColorStop(0, template.dark ? "#0a0a0c" : "#f8f4ec");
    grad.addColorStop(1, template.dark ? "#1a1420" : "#e8e0d0");
    ctx.fillStyle = grad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  ctx.save();
  ctx.fillStyle = template.dark ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.18)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

  const backLayers = composition.layers
    .filter((l) => isBackMatterLayer(l.type) && l.type.startsWith("back-") && l.visible !== false)
    .sort((a, b) => a.zIndex - b.zIndex);

  const hasPhoto = Boolean(opts?.authorImage);
  const photoLayout = hasPhoto ? computePhotoLayout(rect, opts!.authorImage!) : null;

  if (photoLayout) {
    drawAuthorPhoto(ctx, photoLayout, template, opts!.authorImage!);
    const tagline = backLayers.find((l) => l.type === "back-tagline");
    if (tagline) {
      drawBackTextLayer(ctx, rect, { ...tagline, x: photoLayout.textX, y: tagline.y, width: photoLayout.textWidth }, template, "left");
    }
    for (const layer of backLayers.filter((l) => l.type !== "back-tagline")) {
      if (layer.type === "back-bio" && hasPhoto) {
        drawBackTextLayer(ctx, rect, { ...layer, y: Math.max(layer.y, photoLayout.bioY) }, template, "left");
      } else {
        drawBackTextLayer(ctx, rect, layer, template, layer.type === "back-quote" ? "center" : "left");
      }
    }
  } else {
    for (const layer of backLayers) {
      drawBackTextLayer(ctx, rect, layer, template, layer.type === "back-quote" ? "center" : "left");
    }
  }

  drawBarcodeSafeArea(ctx, rect, template);
}

export function drawComposedSpine(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  composition: CoverComposition,
  template: CoverTemplateLike,
) {
  ctx.save();
  ctx.fillStyle = template.dark ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.28)";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  if (rect.w < 28) {
    ctx.restore();
    return;
  }

  const spineTitle = composition.layers.find((l) => l.type === "spine-title" && l.visible !== false);
  const spineAuthor = composition.layers.find((l) => l.type === "spine-author" && l.visible !== false);
  const titleText = (spineTitle?.content ?? "").toUpperCase().slice(0, 48);
  const authorText = spineAuthor?.content ? ` | ${spineAuthor.content.toUpperCase().slice(0, 32)}` : "";
  const combined = `${titleText}${authorText}`.trim();

  ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = template.textColor;
  const fontSize = clamp(Math.round(rect.w * 0.42), 12, 34);
  ctx.font = `700 ${fontSize}px ${template.font}, serif`;
  ctx.fillText(combined, 0, 0, rect.h * 0.84);
  ctx.restore();
}

function computePhotoLayout(rect: CanvasRect, image: HTMLImageElement) {
  const pad = rect.w * 0.1;
  const photoW = clamp(Math.round(rect.w * 0.22), 100, 240);
  const photoH = Math.round(photoW * 1.22);
  const textX = ((pad + photoW + rect.w * 0.045) / rect.w) * 100;
  const textWidth = 100 - textX - 10;
  return {
    x: rect.x + pad,
    y: rect.y + rect.h * 0.12,
    w: photoW,
    h: photoH,
    textX,
    textWidth,
    bioY: 68,
  };
}

function drawAuthorPhoto(
  ctx: CanvasRenderingContext2D,
  layout: { x: number; y: number; w: number; h: number },
  template: CoverTemplateLike,
  image: HTMLImageElement,
) {
  ctx.save();
  roundRect(ctx, layout.x, layout.y, layout.w, layout.h, 8);
  ctx.clip();
  const ratio = image.width / image.height;
  let dw = layout.w;
  let dh = layout.h;
  if (ratio > layout.w / layout.h) {
    dh = layout.h;
    dw = layout.h * ratio;
  } else {
    dw = layout.w;
    dh = layout.w / ratio;
  }
  ctx.drawImage(image, layout.x + (layout.w - dw) / 2, layout.y + (layout.h - dh) / 2, dw, dh);
  ctx.restore();
  ctx.strokeStyle = template.accentColor;
  ctx.lineWidth = Math.max(2, layout.w * 0.012);
  roundRect(ctx, layout.x, layout.y, layout.w, layout.h, 8, false, true);
}

function drawBackTextLayer(
  ctx: CanvasRenderingContext2D,
  rect: CanvasRect,
  layer: CoverLayer,
  template: CoverTemplateLike,
  align: CanvasTextAlign,
) {
  const content = layer.content?.trim();
  if (!content) return;
  const s = layer.style ?? {};
  const scale = Number(s.fontSize ?? 100) / 100;
  const padX = rect.w * 0.1;
  const x =
    align === "left"
      ? rect.x + padX + ((layer.x - 10) / 90) * (rect.w - padX * 2)
      : rect.x + (rect.w * layer.x) / 100;
  const y = rect.y + (rect.h * layer.y) / 100;
  const maxWidth = rect.w * ((layer.width ?? 78) / 100);

  const baseSize =
    layer.type === "back-tagline"
      ? clamp(Math.round(rect.w * 0.043 * scale), 22, 52)
      : layer.type === "back-quote"
        ? clamp(Math.round(rect.w * 0.028 * scale), 16, 36)
        : clamp(Math.round(rect.w * 0.024 * scale), 14, 30);

  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  ctx.fillStyle = String(s.color ?? (layer.type === "back-tagline" ? template.accentColor : template.mutedText));
  const weight = s.fontWeight ?? (layer.type === "back-tagline" ? 700 : 400);
  const italic = s.fontStyle === "italic" ? "italic " : "";
  ctx.font = `${italic}${weight} ${baseSize}px ${layer.type === "back-bio" ? "Arial, sans-serif" : `${template.font}, serif`}`;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  const lineHeight = baseSize * Number(s.lineHeight ?? 1.32);
  const maxLines = layer.type === "back-blurb" ? 10 : layer.type === "back-bio" ? 5 : 4;
  wrapText(ctx, content, x, y, maxWidth, lineHeight, maxLines, align);
  ctx.restore();
}

function drawBarcodeSafeArea(ctx: CanvasRenderingContext2D, rect: CanvasRect, template: CoverTemplateLike) {
  const pad = rect.w * 0.1;
  const barcodeW = rect.w * 0.25;
  const barcodeH = rect.h * 0.09;
  const barcodeX = rect.x + rect.w - pad - barcodeW;
  const barcodeY = rect.y + rect.h - pad - barcodeH;
  ctx.fillStyle = template.dark ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.96)";
  roundRect(ctx, barcodeX, barcodeY, barcodeW, barcodeH, 8, true, false);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.font = `600 ${clamp(Math.round(rect.w * 0.014), 9, 16)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("ISBN / BARCODE", barcodeX + barcodeW / 2, barcodeY + barcodeH / 2 - 6);
  ctx.fillText("978-0000000000", barcodeX + barcodeW / 2, barcodeY + barcodeH / 2 + 10);
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
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line + (line ? " " : "") + word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  const visible = lines.slice(0, maxLines);
  if (lines.length > maxLines && visible.length) {
    visible[visible.length - 1] = `${visible[visible.length - 1].replace(/[.,;:!?]$/, "")}…`;
  }
  visible.forEach((l, i) => ctx.fillText(l, x, y + i * lineHeight));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill = false,
  stroke = false,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
