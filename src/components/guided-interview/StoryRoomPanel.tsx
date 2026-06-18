import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { buildStoryRoomSnapshot } from "@/lib/guided-interview/story-room-engine";
import { cn } from "@/lib/utils";

export type StoryRoomPanelProps = {
  state: GuidedInterviewState;
  className?: string;
  compact?: boolean;
  progressPct?: number;
  progressLabel?: string;
  blueprintReady?: boolean;
};

export function StoryRoomPanel({
  state,
  className,
  compact = false,
  progressPct,
  progressLabel,
  blueprintReady = false,
}: StoryRoomPanelProps) {
  const snapshot = useMemo(() => buildStoryRoomSnapshot(state), [state]);
  const visiblePct = typeof progressPct === "number" ? progressPct : snapshot.completionPct;
  const label =
    progressLabel ??
    (blueprintReady || visiblePct >= 100
      ? "100% · pronto per blueprint"
      : `${visiblePct}% · suggerimenti narrativi`);
  const badgeLabel =
    blueprintReady || visiblePct >= 100 ? "Pronto" : `${visiblePct}%`;
  const [expanded, setExpanded] = useState(!compact);

  if (!snapshot.visible) return null;

  return (
    <section
      className={cn(
        "scriptora-story-room shrink-0 border-b border-white/[0.08] bg-gradient-to-b from-indigo-500/[0.06] to-transparent",
        className,
      )}
      aria-label="Story Room"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-indigo-200/80">
            Story Room
          </p>
          <p className="truncate text-[11px] text-white/50">
            {expanded ? snapshot.highlight : label}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-indigo-100">
          {badgeLabel}
        </span>
        {compact && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/10 text-white/55"
            aria-expanded={expanded}
            aria-label={expanded ? "Comprimi Story Room" : "Espandi Story Room"}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {expanded && (
        <div
          className={cn(
            "grid gap-2 px-3 pb-2 sm:grid-cols-4 sm:px-4 sm:pb-3",
            compact ? "grid-cols-2" : "grid-cols-2",
          )}
        >
          {snapshot.sections.map((section) => (
            <article
              key={section.id}
              className={cn(
                "rounded-xl border px-2 py-1.5 transition-colors sm:px-2.5 sm:py-2",
                section.complete
                  ? "border-emerald-400/25 bg-emerald-500/10"
                  : snapshot.activeSection === section.id
                    ? "border-indigo-400/30 bg-indigo-500/12"
                    : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{section.emoji}</span>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                  {section.label}
                </p>
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/55 sm:text-[11px]">
                {section.summary}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
