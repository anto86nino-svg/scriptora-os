import { useCallback, useRef, useState } from "react";
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
  getViewClipStyle,
  pointerToPanelPercent,
  type CoverPanel,
  type CoverSpecRects,
  type CoverViewMode,
} from "@/lib/cover-studio/cover-view-modes";
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
};

type DragState = {
  layerId: string;
  pointerId: number;
  mode: "move" | "resize";
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
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  const effectiveSpec: CoverSpecRects = spec ?? {
    isPrint: false,
    width: 1600,
    height: 2560,
    bleedPx: 0,
    frontRect: { x: 0, y: 0, w: 1600, h: 2560 },
  };

  const draggableLayers = getDraggableLayersForView(composition, viewMode, activePanel).sort(
    (a, b) => a.zIndex - b.zIndex,
  );

  const clipStyle = getViewClipStyle(viewMode, effectiveSpec);

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
    const { x, y } = {
      x: Math.max(2, Math.min(98, ((clientX - stageRect.left) / stageRect.width) * 100)),
      y: Math.max(2, Math.min(98, ((clientY - stageRect.top) / stageRect.height) * 100)),
    };
    return { x, y };
  };

  const onPointerDown = (layer: CoverLayer, e: React.PointerEvent) => {
    if (!isDraggableLayer(layer)) return;
    e.preventDefault();
    e.stopPropagation();
    onSelectLayer(layer.id);
    if (onActivePanelChange) onActivePanelChange(getLayerPanel(layer.type));
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { layerId: layer.id, pointerId: e.pointerId, mode: "move" };
    setDraggingId(layer.id);
  };

  const onResizeDown = (layer: CoverLayer, e: React.PointerEvent) => {
    if (!isDraggableLayer(layer) || layer.type === "title" || layer.type === "subtitle" || layer.type === "author") return;
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
      const size = Math.max(6, Math.min(50, (dx + dy) * 0.9));
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

  const panelRect = getPanelRect(effectiveSpec, activePanel);
  const usePanelMapping =
    effectiveSpec.isPrint &&
    (viewMode === "open-book" || viewMode === "paperback" || viewMode === "front" || viewMode === "thumbnail");
  const mappedPanel =
    viewMode === "front" || viewMode === "thumbnail" ? effectiveSpec.frontRect : panelRect;
  const hitboxScale = usePanelMapping
    ? {
        leftPct: (mappedPanel.x / effectiveSpec.width) * 100,
        topPct: (mappedPanel.y / effectiveSpec.height) * 100,
        widthPct: (mappedPanel.w / effectiveSpec.width) * 100,
        heightPct: (mappedPanel.h / effectiveSpec.height) * 100,
      }
    : { leftPct: 0, topPct: 0, widthPct: 100, heightPct: 100 };

  return (
    <div className="cover-preview-stage-root w-full max-w-full">
      <div
        ref={stageRef}
        className={cn(
          "cover-studio-pro-stage relative inline-block max-w-full touch-none select-none",
          viewMode === "thumbnail" && "cover-studio-pro-stage--thumbnail",
        )}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <canvas
          ref={canvasRef}
          className={canvasClassName}
          style={clipStyle ?? undefined}
        />
        <div className="cover-interaction-layer pointer-events-none absolute inset-0">
          {effectiveSpec.isPrint && (viewMode === "open-book" || viewMode === "paperback") && (
            <div className="pointer-events-auto absolute inset-0 flex">
              {(["back", "spine", "front"] as CoverPanel[]).map((panel) => {
                const r = getPanelRect(effectiveSpec, panel);
                return (
                  <button
                    key={panel}
                    type="button"
                    className={cn(
                      "cover-panel-selector",
                      activePanel === panel && "cover-panel-selector--active",
                    )}
                    style={{
                      left: `${(r.x / effectiveSpec.width) * 100}%`,
                      top: `${(r.y / effectiveSpec.height) * 100}%`,
                      width: `${(r.w / effectiveSpec.width) * 100}%`,
                      height: `${(r.h / effectiveSpec.height) * 100}%`,
                    }}
                    onClick={() => onActivePanelChange?.(panel)}
                    aria-label={panel}
                  />
                );
              })}
            </div>
          )}

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
              const isText = !layer.type.startsWith("sticker") && layer.type !== "badge" && layer.type !== "shape";
              const canResize = layer.type === "sticker" || layer.type === "badge" || layer.type === "shape";
              return (
                <div
                  key={layer.id}
                  className={cn(
                    "cover-layer-hitbox pointer-events-auto absolute",
                    selected && "cover-layer-hitbox--selected",
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
                  title={layer.content ?? layer.type}
                >
                  {selected && (
                    <span className="cover-layer-hitbox-label">
                      {isText ? getLayerDisplayShort(layer, italianUi) : layer.content?.slice(0, 14) ?? "sticker"}
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
      <p className="mt-2 text-center text-[10px] text-muted-foreground lg:text-left">
        {italianUi
          ? "Trascina elementi · snap editoriale · safe area aware"
          : "Drag elements · editorial snap · safe area aware"}
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
