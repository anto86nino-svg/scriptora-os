import type { CoverSpecRects } from "./cover-view-modes";

type Rect = { x: number; y: number; w: number; h: number };

/** Premium flat print-wrap finish — separators, paper depth, panel labels. */
export function drawWrapPremiumFinish(
  ctx: CanvasRenderingContext2D,
  spec: CoverSpecRects,
  opts?: { showLabels?: boolean; italian?: boolean },
) {
  if (!spec.isPrint || !spec.backRect || !spec.spineRect) return;

  const { backRect, spineRect, frontRect, bleedPx = 0 } = spec;
  const showLabels = opts?.showLabels ?? false;
  const italian = opts?.italian ?? true;

  ctx.save();

  // Paper shadow under entire wrap
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = spec.width * 0.018;
  ctx.shadowOffsetY = spec.width * 0.006;
  ctx.fillStyle = "rgba(0,0,0,0.02)";
  ctx.fillRect(bleedPx, bleedPx, spec.width - bleedPx * 2, spec.height - bleedPx * 2);
  ctx.shadowColor = "transparent";

  // Inner spine shadows (fold depth)
  drawSpineFold(ctx, spineRect, "left");
  drawSpineFold(ctx, spineRect, "right");

  // Panel edge highlights
  drawPanelEdge(ctx, frontRect, "left", "highlight");
  drawPanelEdge(ctx, backRect, "right", "highlight");
  drawPanelEdge(ctx, frontRect, "top", "subtle");
  drawPanelEdge(ctx, backRect, "top", "subtle");

  // Subtle grain on wrap
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < 120; i++) {
    const x = bleedPx + ((i * 17) % (spec.width - bleedPx * 2));
    const y = bleedPx + ((i * 31) % (spec.height - bleedPx * 2));
    ctx.fillStyle = i % 2 ? "#fff" : "#000";
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  if (showLabels) {
    drawPanelLabel(ctx, backRect, italian ? "RETRO" : "BACK");
    drawPanelLabel(ctx, spineRect, italian ? "DORSO" : "SPINE");
    drawPanelLabel(ctx, frontRect, italian ? "FRONTE" : "FRONT");
  }

  ctx.restore();
}

function drawSpineFold(ctx: CanvasRenderingContext2D, rect: Rect, side: "left" | "right") {
  const x = side === "left" ? rect.x : rect.x + rect.w - 2;
  const grad = ctx.createLinearGradient(x, rect.y, x + (side === "left" ? rect.w * 0.35 : -rect.w * 0.35), rect.y);
  grad.addColorStop(0, side === "left" ? "rgba(0,0,0,0.28)" : "rgba(255,255,255,0.12)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(side === "left" ? rect.x : rect.x + rect.w * 0.65, rect.y, rect.w * 0.35, rect.h);
}

function drawPanelEdge(ctx: CanvasRenderingContext2D, rect: Rect, edge: "left" | "right" | "top", kind: "highlight" | "subtle") {
  ctx.strokeStyle = kind === "highlight" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)";
  ctx.lineWidth = Math.max(1, rect.w * 0.002);
  ctx.beginPath();
  if (edge === "left") {
    ctx.moveTo(rect.x + 1, rect.y);
    ctx.lineTo(rect.x + 1, rect.y + rect.h);
  } else if (edge === "right") {
    ctx.moveTo(rect.x + rect.w - 1, rect.y);
    ctx.lineTo(rect.x + rect.w - 1, rect.y + rect.h);
  } else {
    ctx.moveTo(rect.x, rect.y + 1);
    ctx.lineTo(rect.x + rect.w, rect.y + 1);
  }
  ctx.stroke();
}

function drawPanelLabel(ctx: CanvasRenderingContext2D, rect: Rect, label: string) {
  const fs = Math.max(9, rect.w * 0.022);
  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h * 0.018);
}

export function drawBackPanelBase(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  opts: {
    backImageDataUrl?: string | null;
    backgroundDraw?: () => void;
    loadImage?: (src: string) => Promise<HTMLImageElement>;
    fit?: "cover" | "contain" | "soft";
  },
): Promise<void> {
  const { backImageDataUrl, backgroundDraw, loadImage, fit = "cover" } = opts;
  if (backImageDataUrl && loadImage) {
    return loadImage(backImageDataUrl)
      .then((img) => {
        drawImageCover(ctx, img, rect, fit);
      })
      .catch(() => {
        backgroundDraw?.();
      });
  }
  backgroundDraw?.();
  return Promise.resolve();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  rect: Rect,
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
    ctx.globalAlpha = 0.5;
    ctx.filter = "blur(16px)";
    ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
  ctx.drawImage(image, dx, dy, drawW, drawH);
  const overlay = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  overlay.addColorStop(0, "rgba(0,0,0,0.08)");
  overlay.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = overlay;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
}
