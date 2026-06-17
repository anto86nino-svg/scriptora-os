import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Maximize2 } from "lucide-react";
import type { CoverTextHighlight } from "@/lib/cover-studio/cover-focus-types";
import type { CoverComposition, CoverLayer } from "@/lib/cover-studio/cover-layers";
import {
  getDraggableLayersForView,
  getLayerHitbox,
  isDraggableLayer,
  snapLayerPosition,
  type SnapGuide,
} from "@/lib/cover-studio/cover-composition-utils";
import { updateLayer } from "@/lib/cover-studio/cover-layers";
import {
  getLayerPanel,
  getPanelRect,
  pointerToPanelPercent,
  type CoverPanel,
  type CoverSpecRects,
  type CoverViewMode,
} from "@/lib/cover-studio/cover-view-modes";
import { clampUserZoom, computeViewportFit } from "@/lib/cover-studio/cover-viewport-fit";
import { cn } from "@/lib/utils";

type Props = {
  composition: CoverComposition;
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onCompositionChange: (next: CoverComposition) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  canvasClassName?: string;
  italianUi?: boolean;
  spec?: CoverSpecRects;
  viewMode?: CoverViewMode;
  activePanel?: CoverPanel;
  onActivePanelChange?: (panel: CoverPanel) => void;
  highlightLayerType?: CoverTextHighlight;
};

type DragState = {
  layerId: string;
  pointerId: number;
  mode: "move" | "resize";
};

const PANEL_LABELS: Record<CoverPanel, { it: string; en: string }> = {
  front: { it: "FRONT", en: "FRONT" },
  spine: { it: "DORSO", en: "SPINE" },
  back: { it: "RETRO", en: "BACK" },
};

export function CoverPreviewStage({
  composition,
  selectedLayerId,
  onSelectLayer,
  onCompositionChange,
  canvasRef,
  canvasClassName,
  italianUi = true,
  spec,
  viewMode = composition.viewMode ?? "front",
  activePanel = composition.activePanel ?? "front",
  onActivePanelChange,
  highlightLayerType = null,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const lastTapRef = useRef(0);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [userZoom, setUserZoom] = useState(1);
  const [containerSize, setContainerSize] = useState({ w: 320, h: 400 });
  const [isMobile, setIsMobile] = useState(false);

  const effectiveSpec: CoverSpecRects = spec ?? {
    isPrint: false,
    width: 1600,
    height: 2560,
    bleedPx: 0,
    frontRect: { x: 0, y: 0, w: 1600, h: 2560 },
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setContainerSize({ w: rect.width, h: rect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setUserZoom(1);
  }, [viewMode, effectiveSpec.width, effectiveSpec.height, activePanel]);

  const fit = computeViewportFit({
    containerWidth: containerSize.w,
    containerHeight: containerSize.h,
    canvasWidth: effectiveSpec.width,
    canvasHeight: effectiveSpec.height,
    viewMode,
    spec: effectiveSpec,
    activePanel,
    userZoom,
    isMobile,
  });

  const draggableLayers = getDraggableLayersForView(composition, viewMode, activePanel).sort(
    (a, b) => a.zIndex - b.zIndex,
  );

  const patchLayerPos = useCallback(
    (layerId: string, x: number, y: number, extra?: Partial<CoverLayer>, guides: SnapGuide[] = []) => {
      setSnapGuides(guides);
      onCompositionChange({
        ...composition,
        updatedAt: new Date().toISOString(),
        layers: updateLayer(composition.layers, layerId, { x, y, ...extra }),
      });
    },
    [composition, onCompositionChange],
  );

  const resolvePointer = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    if (effectiveSpec.isPrint) {
      const panel =
        viewMode === "front" || viewMode === "thumbnail"
          ? "front"
          : viewMode === "open-book" || viewMode === "paperback"
            ? activePanel
            : "front";
      return pointerToPanelPercent(stage.getBoundingClientRect(), clientX, clientY, effectiveSpec, panel, viewMode);
    }
    const stageRect = stage.getBoundingClientRect();
    return {
      x: Math.max(2, Math.min(98, ((clientX - stageRect.left) / stageRect.width) * 100)),
      y: Math.max(2, Math.min(98, ((clientY - stageRect.top) / stageRect.height) * 100)),
    };
  };

  const onPointerDown = (layer: CoverLayer, e: React.PointerEvent) => {
    if (!isDraggableLayer(layer)) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectLayer(layer.id);
    if (onActivePanelChange) onActivePanelChange(getLayerPanel(layer.type, layer));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { layerId: layer.id, pointerId: e.pointerId, mode: "move" };
    setDraggingId(layer.id);
  };

  const onResizeDown = (layer: CoverLayer, e: React.PointerEvent) => {
    if (!isDraggableLayer(layer)) return;
    if (["title", "subtitle", "author"].includes(layer.type)) return;
    if (layer.type.startsWith("back-") || layer.type.startsWith("spine-")) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { layerId: layer.id, pointerId: e.pointerId, mode: "resize" };
    setDraggingId(layer.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    e.preventDefault();
    const pos = resolvePointer(e.clientX, e.clientY);
    if (!pos) return;
    const layer = composition.layers.find((l) => l.id === drag.layerId);
    if (!layer) return;

    if (drag.mode === "move") {
      const snapped = snapLayerPosition(layer, pos.x, pos.y, viewMode === "thumbnail");
      patchLayerPos(drag.layerId, snapped.x, snapped.y, undefined, snapped.guides);
    } else {
      const cx = layer.x;
      const cy = layer.y;
      const dx = Math.abs(pos.x - cx);
      const dy = Math.abs(pos.y - cy);
      const size = Math.max(6, Math.min(55, (dx + dy) * 0.9));
      onCompositionChange({
        ...composition,
        updatedAt: new Date().toISOString(),
        layers: updateLayer(composition.layers, drag.layerId, { width: size, height: size }),
      });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      setDraggingId(null);
      setSnapGuides([]);
    }
  };

  const resetFit = () => setUserZoom(1);

  const onStageDoubleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) resetFit();
    lastTapRef.current = now;
  };

  const mappedPanel =
    viewMode === "front" || viewMode === "thumbnail"
      ? effectiveSpec.frontRect
      : getPanelRect(effectiveSpec, activePanel);
  const usePanelMapping =
    effectiveSpec.isPrint &&
    (viewMode === "open-book" || viewMode === "paperback" || viewMode === "front" || viewMode === "thumbnail");
  const hitboxScale = usePanelMapping
    ? {
        leftPct: (mappedPanel.x / effectiveSpec.width) * 100,
        topPct: (mappedPanel.y / effectiveSpec.height) * 100,
        widthPct: (mappedPanel.w / effectiveSpec.width) * 100,
        heightPct: (mappedPanel.h / effectiveSpec.height) * 100,
      }
    : { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 };

  const showPanelNav =
    effectiveSpec.isPrint && (viewMode === "open-book" || viewMode === "paperback");

  return (
    <div className="cover-preview-stage-root relative flex h-full min-h-0 w-full max-w-full min-w-0 flex-col">
      <div className="cover-viewport-toolbar sticky top-0 z-30 mb-2 flex w-full shrink-0 flex-wrap items-center justify-center gap-1.5 rounded-lg border border-border/50 bg-background/92 px-2 py-1.5 backdrop-blur-md">
        {showPanelNav &&
          (["front", "spine", "back"] as CoverPanel[]).map((panel) => (
            <button
              key={panel}
              type="button"
              onClick={() => onActivePanelChange?.(panel)}
              className={cn(
                "cover-panel-nav-btn rounded-lg border px-2.5 py-1 text-[10px] font-semibold tracking-wide transition",
                activePanel === panel
                  ? "border-primary bg-primary/20 text-primary shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                  : "border-border/60 text-muted-foreground hover:border-primary/40",
              )}
            >
              {italianUi ? PANEL_LABELS[panel].it : PANEL_LABELS[panel].en}
            </button>
          ))}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/60 bg-background/60 p-0.5 shadow-sm">
          <button type="button" className="cover-zoom-btn" onClick={() => setUserZoom((z) => clampUserZoom(z - 0.12))} aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="cover-zoom-pct min-w-[44px] px-1 text-[10px] font-semibold tabular-nums text-muted-foreground"
            onClick={resetFit}
            aria-label={italianUi ? "Reset zoom" : "Reset zoom"}
          >
            {Math.round(fit.userZoom * 100)}%
          </button>
          <button type="button" className="cover-zoom-btn" onClick={() => setUserZoom((z) => clampUserZoom(z + 0.12))} aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="cover-zoom-btn"
            onClick={resetFit}
            aria-label={italianUi ? "Adatta allo schermo" : "Fit to screen"}
            title={italianUi ? "Adatta allo schermo" : "Fit to screen"}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "cover-viewport-frame relative mx-auto flex min-h-0 w-full flex-1 flex-col",
          fit.userZoom > 1.02 ? "overflow-auto" : "overflow-hidden",
          isMobile ? "cover-viewport-frame--mobile" : "cover-viewport-frame--desktop",
        )}
      >
        <div ref={measureRef} className="flex min-h-0 flex-1 items-center justify-center p-1">
        <div
          ref={stageRef}
          className="cover-studio-pro-stage relative touch-none select-none shrink-0"
          style={{
            width: fit.displayWidth,
            height: fit.displayHeight,
            transform: `translate(${fit.panX}px, ${fit.panY}px)`,
            transition: draggingId ? "none" : "transform 0.28s ease-out, width 0.2s ease, height 0.2s ease",
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={resetFit}
          onClick={onStageDoubleTap}
        >
          <canvas
            ref={canvasRef}
            className={cn("scriptora-cover-studio-canvas block h-full w-full rounded-lg shadow-xl ring-1 ring-white/10", canvasClassName)}
            style={{ width: "100%", height: "100%", maxWidth: "none", maxHeight: "none" }}
          />
          <div className="cover-interaction-layer pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            {showPanelNav &&
              (["back", "spine", "front"] as CoverPanel[]).map((panel) => {
                const r = getPanelRect(effectiveSpec, panel);
                return (
                  <button
                    key={`sel-${panel}`}
                    type="button"
                    className={cn(
                      "cover-panel-selector pointer-events-none absolute border-2",
                      activePanel === panel ? "cover-panel-selector--active" : "border-transparent",
                    )}
                    style={{
                      left: `${(r.x / effectiveSpec.width) * 100}%`,
                      top: `${(r.y / effectiveSpec.height) * 100}%`,
                      width: `${(r.w / effectiveSpec.width) * 100}%`,
                      height: `${(r.h / effectiveSpec.height) * 100}%`,
                    }}
                    tabIndex={-1}
                    aria-hidden
                  />
                );
              })}

            <div
              className="absolute"
              style={{
                left: `${hitboxScale.leftPct}%`,
                top: `${hitboxScale.topPct}%`,
                width: `${hitboxScale.widthPct}%`,
                height: `${hitboxScale.heightPct}%`,
              }}
            >
              {snapGuides.map((g, i) => (
                <span
                  key={`${g.axis}-${g.value}-${i}`}
                  className={cn("cover-snap-guide", g.axis === "x" ? "cover-snap-guide--v" : "cover-snap-guide--h")}
                  style={g.axis === "x" ? { left: `${g.value}%` } : { top: `${g.value}%` }}
                />
              ))}

              {draggableLayers.map((layer) => {
                const hit = getLayerHitbox(layer);
                const selected = selectedLayerId === layer.id;
                const editingHighlight = highlightLayerType != null && layer.type === highlightLayerType;
                const isText =
                  !layer.type.startsWith("sticker") &&
                  layer.type !== "badge" &&
                  layer.type !== "shape" &&
                  layer.type !== "image";
                const canResize =
                  layer.type === "sticker" ||
                  layer.type === "badge" ||
                  layer.type === "shape" ||
                  layer.type === "image";
                return (
                  <div
                    key={layer.id}
                    className={cn(
                      "cover-layer-hitbox pointer-events-auto absolute",
                      selected && "cover-layer-hitbox--selected",
                      editingHighlight && "cover-layer-hitbox--editing",
                      draggingId === layer.id && "cover-layer-hitbox--dragging",
                      layer.locked && "cover-layer-hitbox--locked",
                    )}
                    style={{
                      left: `${layer.x}%`,
                      top: `${layer.y}%`,
                      width: `${hit.widthPct}%`,
                      height: `${hit.heightPct}%`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation ?? 0}deg)`,
                      zIndex: layer.zIndex + 100,
                    }}
                    onPointerDown={(e) => onPointerDown(layer, e)}
                    title={layer.content?.slice(0, 20) ?? layer.type}
                  >
                    {selected && (
                      <span className="cover-layer-hitbox-label">
                        {isText ? getLayerDisplayShort(layer, italianUi) : layer.type === "image" ? "IMG" : layer.content?.slice(0, 10) ?? "layer"}
                      </span>
                    )}
                    {selected && !layer.locked && canResize && (
                      <button
                        type="button"
                        className="cover-layer-resize-handle"
                        aria-label={italianUi ? "Ridimensiona" : "Resize"}
                        onPointerDown={(e) => onResizeDown(layer, e)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </div>
      <p className="mt-2 text-center text-[10px] text-muted-foreground lg:text-left">
        {italianUi
          ? "Fit automatico · doppio tap reset · trascina elementi"
          : "Auto fit · double-tap reset · drag elements"}
      </p>
    </div>
  );
}

function getLayerDisplayShort(layer: CoverLayer, italian: boolean) {
  if (layer.type === "title") return italian ? "Titolo" : "Title";
  if (layer.type === "back-blurb") return italian ? "Retro" : "Back";
  if (layer.type === "back-bio") return italian ? "Bio" : "Bio";
  return layer.type.replace("back-", "").replace("spine-", "");
}
