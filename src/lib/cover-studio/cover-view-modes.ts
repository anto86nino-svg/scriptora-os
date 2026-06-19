import type { CoverLayer } from "./cover-layers";

export type CoverViewMode = "front" | "back" | "spine" | "paperback" | "open-book" | "mockup-3d" | "thumbnail";

export type CoverPanel = "front" | "back" | "spine";

export type CoverSpecRects = {
  isPrint: boolean;
  width: number;
  height: number;
  bleedPx: number;
  frontRect: { x: number; y: number; w: number; h: number };
  backRect?: { x: number; y: number; w: number; h: number };
  spineRect?: { x: number; y: number; w: number; h: number };
};

export const COVER_VIEW_MODES: { id: CoverViewMode; labelIt: string; labelEn: string }[] = [
  { id: "front", labelIt: "Front", labelEn: "Front" },
  { id: "back", labelIt: "Retro", labelEn: "Back" },
  { id: "spine", labelIt: "Dorso", labelEn: "Spine" },
  { id: "paperback", labelIt: "Full KDP Wrap", labelEn: "Full KDP Wrap" },
  { id: "open-book", labelIt: "Open Book", labelEn: "Open Book" },
  { id: "mockup-3d", labelIt: "3D Mockup", labelEn: "3D Mockup" },
  { id: "thumbnail", labelIt: "Thumbnail Amazon", labelEn: "Amazon Thumbnail" },
];

export const TRIM_PRESETS_PRO = [
  { id: "5x8", label: "5 × 8 in", width: 5, height: 8 },
  { id: "5.5x8.5", label: "5.5 × 8.5 in", width: 5.5, height: 8.5 },
  { id: "6x9", label: "6 × 9 in", width: 6, height: 9 },
  { id: "a4", label: "A4 (8.27 × 11.69 in)", width: 8.27, height: 11.69 },
  { id: "custom", label: "Custom", width: 6, height: 9 },
] as const;

/** Safe text inset as % inside a panel (KDP/Lulu editorial margin). */
export const SAFE_TEXT_INSET_PCT = 10;

export function getLayerPanel(type: string, layer?: CoverLayer): CoverPanel {
  if (type === "image" && layer?.style?.imagePanel) {
    const p = String(layer.style.imagePanel);
    if (p === "back") return "back";
    if (p === "spine") return "spine";
    return "front";
  }
  if (type.startsWith("back-")) return "back";
  if (type.startsWith("spine-")) return "spine";
  return "front";
}

export function getViewClipStyle(
  mode: CoverViewMode,
  spec: CoverSpecRects,
): { objectPosition?: string; objectFit?: "contain"; transform?: string; width?: string; height?: string } | null {
  if (!spec.isPrint || mode === "open-book" || mode === "paperback") return null;

  const { width, height, frontRect, backRect, spineRect } = spec;
  if (!frontRect) return null;

  if (mode === "front" || mode === "back" || mode === "spine" || mode === "mockup-3d") {
    const panel = mode === "back" ? backRect ?? frontRect : mode === "spine" ? spineRect ?? frontRect : frontRect;
    const cx = ((panel.x + panel.w / 2) / width) * 100;
    const cy = ((panel.y + panel.h / 2) / height) * 100;
    const scale = Math.max(width / panel.w, height / panel.h);
    return {
      objectFit: "contain",
      objectPosition: `${cx}% ${cy}%`,
      transform: `scale(${scale})`,
      transformOrigin: `${cx}% ${cy}%`,
    };
  }

  if (mode === "thumbnail") {
    const cx = ((frontRect.x + frontRect.w / 2) / width) * 100;
    const cy = ((frontRect.y + frontRect.h / 2) / height) * 100;
    const thumbScale = Math.max(width / frontRect.w, (height * 0.62) / frontRect.h);
    return {
      objectFit: "contain",
      objectPosition: `${cx}% ${cy}%`,
      transform: `scale(${thumbScale * 1.05})`,
      transformOrigin: `${cx}% ${cy}%`,
    };
  }

  return null;
}

export function getPanelRect(spec: CoverSpecRects, panel: CoverPanel) {
  if (panel === "back") return spec.backRect ?? spec.frontRect;
  if (panel === "spine") return spec.spineRect ?? spec.frontRect;
  return spec.frontRect;
}

/** Map pointer on stage (full canvas display) to panel-local 0–100%. */
export function pointerToPanelPercent(
  stageRect: DOMRect,
  clientX: number,
  clientY: number,
  spec: CoverSpecRects,
  panel: CoverPanel,
  viewMode: CoverViewMode,
): { x: number; y: number } | null {
  const canvasAspect = spec.width / spec.height;
  const stageAspect = stageRect.width / stageRect.height;
  let drawW = stageRect.width;
  let drawH = stageRect.height;
  let offsetX = 0;
  let offsetY = 0;

  if (canvasAspect > stageAspect) {
    drawH = stageRect.width / canvasAspect;
    offsetY = (stageRect.height - drawH) / 2;
  } else {
    drawW = stageRect.height * canvasAspect;
    offsetX = (stageRect.width - drawW) / 2;
  }

  const relX = clientX - stageRect.left - offsetX;
  const relY = clientY - stageRect.top - offsetY;
  if (relX < 0 || relY < 0 || relX > drawW || relY > drawH) return null;

  const canvasX = (relX / drawW) * spec.width;
  const canvasY = (relY / drawH) * spec.height;

  let target = getPanelRect(spec, panel);
  if (viewMode === "front" || viewMode === "thumbnail" || viewMode === "mockup-3d") {
    target = spec.frontRect;
  } else if (viewMode === "back") {
    target = getPanelRect(spec, "back");
  } else if (viewMode === "spine") {
    target = getPanelRect(spec, "spine");
  }

  const x = ((canvasX - target.x) / target.w) * 100;
  const y = ((canvasY - target.y) / target.h) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

export function drawPrintSafeGuides(
  ctx: CanvasRenderingContext2D,
  spec: CoverSpecRects,
  italian = true,
) {
  if (!spec.isPrint) return;
  const panels = [spec.backRect, spec.spineRect, spec.frontRect].filter(Boolean) as {
    x: number;
    y: number;
    w: number;
    h: number;
  }[];

  ctx.save();
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = Math.max(1, spec.width * 0.0012);
  ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
  ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
  ctx.font = `600 ${Math.max(10, spec.width * 0.008)}px system-ui, sans-serif`;

  for (const panel of panels) {
    const inset = panel.w * (SAFE_TEXT_INSET_PCT / 100);
    const insetY = panel.h * (SAFE_TEXT_INSET_PCT / 100);
    ctx.strokeRect(panel.x + inset, panel.y + insetY, panel.w - inset * 2, panel.h - insetY * 2);

    const barcodeW = panel.w * 0.25;
    const barcodeH = panel.h * 0.09;
    const pad = panel.w * 0.1;
    if (panel === spec.backRect) {
      ctx.strokeStyle = "rgba(251, 191, 36, 0.6)";
      ctx.strokeRect(
        panel.x + panel.w - pad - barcodeW,
        panel.y + panel.h - pad - barcodeH,
        barcodeW,
        barcodeH,
      );
      ctx.fillStyle = "rgba(251, 191, 36, 0.85)";
      ctx.fillText(italian ? "ISBN safe" : "ISBN safe", panel.x + panel.w - pad - barcodeW + 4, panel.y + panel.h - pad - barcodeH - 4);
      ctx.strokeStyle = "rgba(56, 189, 248, 0.55)";
    }
  }

  if (spec.bleedPx > 0) {
    ctx.strokeStyle = "rgba(167, 139, 250, 0.45)";
    ctx.strokeRect(spec.bleedPx, spec.bleedPx, spec.width - spec.bleedPx * 2, spec.height - spec.bleedPx * 2);
  }
  ctx.restore();
}
