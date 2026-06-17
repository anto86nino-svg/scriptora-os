import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { BookDnaLock } from "@/lib/guided-interview/dna-lock";
import {
  buildForgeLiveMap,
  getNodeCompletionWhisper,
  nodeStateRank,
  type ForgeMapNode,
  type ForgeMapNodeId,
} from "@/lib/guided-interview/forge-live-map";
import { ForgeDirectionCard } from "./ForgeDirectionCard";
import { cn } from "@/lib/utils";

export type ForgeLiveMapProps = {
  state: GuidedInterviewState;
  dnaLock: BookDnaLock;
  confidencePct: number;
  isThinking?: boolean;
  activeQuestionKey?: string | null;
  isMobile?: boolean;
  onContinue?: () => void;
  onCorrect?: () => void;
  onDeepen?: () => void;
  className?: string;
};

export function ForgeLiveMap({
  state,
  dnaLock,
  confidencePct,
  isThinking,
  activeQuestionKey,
  isMobile = false,
  onContinue,
  onCorrect,
  onDeepen,
  className,
}: ForgeLiveMapProps) {
  const snapshot = useMemo(
    () => buildForgeLiveMap(state, dnaLock, !!isThinking, activeQuestionKey),
    [state, dnaLock, isThinking, activeQuestionKey],
  );

  const [expanded, setExpanded] = useState(!isMobile);
  const [whisper, setWhisper] = useState<string | null>(null);
  const prevStatesRef = useRef<Record<ForgeMapNodeId, number>>({} as Record<ForgeMapNodeId, number>);

  useEffect(() => {
    let whisperNode: ForgeMapNodeId | null = null;
    for (const node of snapshot.nodes) {
      const prev = prevStatesRef.current[node.id] ?? 0;
      const next = nodeStateRank(node.state);
      if (next >= 3 && prev < 3 && !whisperNode) {
        whisperNode = node.id;
      }
      prevStatesRef.current[node.id] = next;
    }
    if (!whisperNode) return;
    setWhisper(getNodeCompletionWhisper(whisperNode));
    const t = window.setTimeout(() => setWhisper(null), 4200);
    return () => window.clearTimeout(t);
  }, [snapshot.nodes]);

  return (
    <div
      className={cn(
        "scriptora-forge-live-map shrink-0 border-b border-white/[0.08] bg-gradient-to-b from-white/[0.03] to-transparent",
        className,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 sm:px-4">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-violet-200/75">
            Mappa editoriale
          </p>
          <p className="truncate text-[11px] text-white/50">
            {whisper || "Sto costruendo l'anima del libro in tempo reale"}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-violet-100">
          {confidencePct}%
        </span>
        {isMobile && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 text-white/55"
            aria-expanded={expanded}
            aria-label={expanded ? "Comprimi mappa" : "Espandi mappa"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div
        className={cn(
          "scriptora-forge-live-map-track overflow-x-auto overscroll-x-contain px-3 pb-2 sm:px-4",
          isMobile && !expanded && "pb-2.5",
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <ol className="flex min-w-max items-center gap-0.5">
          {snapshot.nodes.map((node, index) => (
            <li key={node.id} className="flex items-center">
              <MapNodeChip node={node} active={snapshot.activeNodeId === node.id} compact={isMobile && !expanded} />
              {index < snapshot.nodes.length - 1 && (
                <span
                  className={cn(
                    "scriptora-forge-map-connector mx-0.5 h-px w-3 sm:w-5",
                    nodeStateRank(node.state) >= 3 ? "bg-emerald-400/50" : "bg-white/12",
                  )}
                  aria-hidden
                />
              )}
            </li>
          ))}
        </ol>
      </div>

      {(expanded || !isMobile) && snapshot.missingItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-2 sm:px-4">
          {snapshot.nodes
            .filter((n) => n.state === "confirmed" || n.state === "locked")
            .slice(-3)
            .map((n) => (
              <span
                key={`ok-${n.id}`}
                className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-100/90"
              >
                ✔ {n.shortLabel}
              </span>
            ))}
          {snapshot.nodes
            .filter((n) => n.state === "clarify" || n.state === "understanding")
            .slice(0, 2)
            .map((n) => (
              <span
                key={`warn-${n.id}`}
                className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-medium text-amber-100/90"
              >
                {n.state === "clarify" ? "⚠" : "🟡"} {n.shortLabel}
              </span>
            ))}
        </div>
      )}

      {snapshot.showDirectionCard && (expanded || !isMobile) && confidencePct >= 55 && (
        <div className="px-3 pb-3 sm:px-4">
          <ForgeDirectionCard
            summary={snapshot.directionSummary}
            confidencePct={confidencePct}
            onContinue={onContinue}
            onCorrect={onCorrect}
            onDeepen={onDeepen}
            compact={isMobile}
          />
        </div>
      )}
    </div>
  );
}

function MapNodeChip({
  node,
  active,
  compact,
}: {
  node: ForgeMapNode;
  active: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "scriptora-forge-map-node flex flex-col items-center gap-0.5 rounded-xl border px-1.5 py-1 transition-all duration-500 sm:px-2",
        stateClass(node.state, active),
        node.state === "confirmed" && "scriptora-forge-map-node--confirmed",
        node.state === "locked" && "scriptora-forge-map-node--locked",
        active && "scriptora-forge-map-node--active",
      )}
      title={node.hint ? `${node.label}: ${node.hint}` : node.label}
    >
      <span className={cn("text-base leading-none sm:text-lg", compact && "text-sm")}>{node.emoji}</span>
      {!compact && (
        <span className="max-w-[52px] truncate text-[8px] font-semibold uppercase tracking-wide text-white/55 sm:max-w-none sm:text-[9px]">
          {node.shortLabel}
        </span>
      )}
    </div>
  );
}

function stateClass(state: ForgeMapNode["state"], active: boolean): string {
  if (state === "locked") return "border-violet-300/40 bg-violet-500/20";
  if (state === "confirmed") return "border-emerald-400/30 bg-emerald-500/12";
  if (state === "clarify") return "border-amber-400/35 bg-amber-500/10";
  if (state === "understanding" || active) return "border-violet-400/35 bg-violet-500/12";
  return "border-white/10 bg-white/[0.03] opacity-60";
}
