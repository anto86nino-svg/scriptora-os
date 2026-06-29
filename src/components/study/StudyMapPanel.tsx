import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Copy, Maximize2, Network, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";
import type { StudyExercise, StudySessionResult } from "@/lib/study-session";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  buildStudyConceptMap,
  getConceptMapLevelLabel,
  layoutConceptMapSvg,
  type ConceptMapLevel,
} from "@/lib/study-os/study-concept-map";

interface StudyMapPanelProps {
  result: StudySessionResult;
  kernelPlan?: StudyKernelPlan | null;
  exercises?: StudyExercise[];
}

const EXERCISE_LABELS: Record<StudyExercise["type"], string> = {
  guided: "Guidato",
  free: "Libero",
  correction: "Corretto",
  application: "Applicazione",
  reasoning: "Ragionamento",
};

const LEVELS: ConceptMapLevel[] = ["base", "avanzata", "esame"];
const MIN_SCALE = 0.6;
const MAX_SCALE = 2.5;

export function StudyMapPanel({ result, kernelPlan, exercises = [] }: StudyMapPanelProps) {
  const [level, setLevel] = useState<ConceptMapLevel>(
    kernelPlan?.quizDifficulty === "esame" ? "esame" : "base",
  );
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const mapData = useMemo(
    () => buildStudyConceptMap(result, kernelPlan, level),
    [result, kernelPlan, level],
  );
  const layout = useMemo(() => layoutConceptMapSvg(mapData), [mapData]);
  const visibleNodes = useMemo(
    () => layout.nodes.filter((n) => n.id === "root" || !collapsed.has(n.id)),
    [layout.nodes, collapsed],
  );
  const visibleEdges = useMemo(() => {
    const ids = new Set(visibleNodes.map((n) => n.id));
    return layout.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  }, [layout.edges, visibleNodes]);

  const toggleCollapse = useCallback((nodeId: string) => {
    if (nodeId === "root") return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  function handlePointerDown(event: React.PointerEvent) {
    if (event.pointerType === "touch" && (event.target as HTMLElement).closest("[data-node-id]")) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.panX + (event.clientX - dragRef.current.x),
      y: dragRef.current.panY + (event.clientY - dragRef.current.y),
    });
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleTouchStart(event: React.TouchEvent) {
    if (event.touches.length === 2) {
      const [a, b] = [event.touches[0], event.touches[1]];
      const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { distance, scale };
    }
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (event.touches.length !== 2 || !pinchRef.current) return;
    const [a, b] = [event.touches[0], event.touches[1]];
    const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const ratio = distance / pinchRef.current.distance;
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchRef.current.scale * ratio)));
  }

  function handleTouchEnd() {
    pinchRef.current = null;
  }

  function handleWheel(event: React.WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + delta)));
  }

  if (!mapData.nodes.length && exercises.length === 0) {
    return (
      <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
        Nessuna mappa disponibile. Rigenera la sessione per creare mappe ed esercizi.
      </p>
    );
  }

  async function copyMap() {
    await navigator.clipboard.writeText(mapData.exportText);
    toast.success("Mappa copiata");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-emerald-200" />
              <h3 className="font-semibold">Mappa concettuale</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{mapData.title}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Trascina per spostare · pinch o rotella per zoom</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={[
                  "min-h-[40px] rounded-xl px-3 py-1.5 text-xs font-semibold",
                  level === l ? "bg-emerald-300 text-slate-950" : "border border-white/10 bg-white/[0.04] text-muted-foreground",
                ].join(" ")}
              >
                {getConceptMapLevelLabel(l)}
              </button>
            ))}
            <button type="button" onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.2))} className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-muted-foreground">
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.2))} className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-muted-foreground">
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }} className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-muted-foreground">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={copyMap}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
              Copia
            </button>
          </div>
        </div>

        <div
          ref={viewportRef}
          className="mt-4 touch-none overflow-hidden rounded-2xl border border-white/10 bg-background/30"
          style={{ minHeight: 220, maxHeight: 360 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: dragRef.current ? "none" : "transform 0.15s ease-out",
            }}
          >
            <svg
              viewBox="0 0 320 280"
              className="mx-auto w-full max-w-full"
              style={{ minHeight: 200 }}
              role="img"
              aria-label={`Mappa concettuale ${mapData.title}`}
            >
              {visibleEdges.map((edge) => {
                const from = layout.nodes.find((n) => n.id === edge.from);
                const to = layout.nodes.find((n) => n.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    key={edge.id}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="rgba(110, 231, 183, 0.35)"
                    strokeWidth={1.5}
                  />
                );
              })}
              {visibleNodes.map((node) => (
                <g
                  key={node.id}
                  data-node-id={node.id}
                  style={{ cursor: node.id === "root" ? "default" : "pointer" }}
                  onClick={() => {
                    if (node.id === "root") return;
                    setExpandedDetail((prev) => (prev === node.id ? null : node.id));
                  }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.id === "root" ? 28 : 22}
                    fill={expandedDetail === node.id ? "rgba(52, 211, 153, 0.45)" : node.id === "root" ? "rgba(52, 211, 153, 0.25)" : "rgba(255,255,255,0.08)"}
                    stroke="rgba(110, 231, 183, 0.5)"
                    strokeWidth={1.5}
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="currentColor"
                    className="fill-foreground text-[9px] font-semibold"
                    style={{ pointerEvents: "none" }}
                  >
                    {node.label.length > 14 ? `${node.label.slice(0, 12)}…` : node.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {expandedDetail && (
          <div className="mt-3 rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-sm text-foreground/90">
            {mapData.nodes.find((n) => n.id === expandedDetail)?.detail}
          </div>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {mapData.nodes.filter((n) => n.id !== "root").map((node) => {
            const isCollapsed = collapsed.has(node.id);
            const isOpen = expandedDetail === node.id;
            return (
              <div key={node.id} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                <button
                  type="button"
                  onClick={() => {
                    toggleCollapse(node.id);
                    setExpandedDetail((prev) => (prev === node.id ? null : node.id));
                  }}
                  className="flex w-full items-start gap-2 text-left"
                >
                  {isCollapsed ? (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{node.label}</p>
                    {!isCollapsed && isOpen && (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{node.detail}</p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {mapData.edges.length > 0 && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-background/45 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Relazioni</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {mapData.edges.slice(0, 8).map((relation) => {
                const from = mapData.nodes.find((n) => n.id === relation.from)?.label ?? relation.from;
                const to = mapData.nodes.find((n) => n.id === relation.to)?.label ?? relation.to;
                return (
                  <li key={relation.id}>
                    {from} → {relation.label} → {to}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {exercises.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
          <h3 className="font-semibold">Esercizi adattivi</h3>
          <div className="mt-3 grid gap-3">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                    {EXERCISE_LABELS[exercise.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">{exercise.difficulty}</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{exercise.prompt}</p>
                {exercise.solution && (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground/90">Soluzione attesa: </span>
                    {exercise.solution}
                  </p>
                )}
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{exercise.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
