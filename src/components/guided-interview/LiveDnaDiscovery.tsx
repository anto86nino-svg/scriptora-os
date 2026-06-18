import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import { cn } from "@/lib/utils";
import { safeDisplayText } from "@/lib/safe-display-text";
import { Check, Circle, Loader2 } from "lucide-react";

export type DnaDiscoverySignal = {
  id: string;
  label: string;
  field: keyof GuidedInterviewState["extracted"] | "inferredGenre" | "inferredBookType";
  minLength?: number;
};

export const DNA_DISCOVERY_SIGNALS: DnaDiscoverySignal[] = [
  { id: "emotionalTone", label: "Tema emotivo", field: "emotionalTone", minLength: 10 },
  { id: "centralConflict", label: "Conflitto centrale", field: "centralConflict", minLength: 10 },
  { id: "protagonist", label: "Tipo di protagonista", field: "setting", minLength: 10 },
  { id: "readerTransformation", label: "Finale emotivo", field: "readerTransformation", minLength: 10 },
  { id: "genreDNA", label: "Tono narrativo", field: "genreDNA", minLength: 10 },
  { id: "promise", label: "Promessa lettore", field: "promise", minLength: 10 },
  { id: "targetReader", label: "Target", field: "targetReader", minLength: 10 },
];

export type SignalStatus = "done" | "active" | "pending";

function resolveSignalValue(
  state: GuidedInterviewState,
  signal: DnaDiscoverySignal,
): string {
  if (signal.field === "inferredGenre") {
    return state.selectedGenre || state.inferredProfile?.genre || "";
  }
  if (signal.field === "inferredBookType") {
    return state.inferredProfile?.bookType || state.selectedBookType || "";
  }
  const val = state.extracted?.[signal.field as keyof typeof state.extracted];
  return typeof val === "string" ? val.trim() : "";
}

function signalStatus(
  state: GuidedInterviewState,
  signal: DnaDiscoverySignal,
  activeField: string | null,
  isThinking: boolean,
): SignalStatus {
  const value = resolveSignalValue(state, signal);
  const min = signal.minLength ?? 10;
  if (value.length >= min) return "done";
  if (isThinking && activeField === signal.field) return "active";
  if (activeField === signal.field) return "active";
  const firstPending = DNA_DISCOVERY_SIGNALS.find((s) => resolveSignalValue(state, s).length < (s.minLength ?? 10));
  if (firstPending?.id === signal.id && !isThinking) return "active";
  return "pending";
}

export function getActiveDiscoveryField(state: GuidedInterviewState): string | null {
  const pending = DNA_DISCOVERY_SIGNALS.find(
    (s) => resolveSignalValue(state, s).length < (s.minLength ?? 10),
  );
  return pending?.field ?? null;
}

export function LiveDnaDiscovery({
  state,
  isThinking,
  compact,
  className,
}: {
  state: GuidedInterviewState;
  isThinking?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const activeField = getActiveDiscoveryField(state);
  const doneCount = DNA_DISCOVERY_SIGNALS.filter(
    (s) => resolveSignalValue(state, s).length >= (s.minLength ?? 10),
  ).length;

  return (
    <div
      className={cn(
        "scriptora-live-dna-discovery border-b border-white/[0.08] bg-gradient-to-b from-violet-500/[0.06] to-transparent",
        compact ? "px-4 py-2.5" : "px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-200/80">
          Scriptora sta capendo…
        </p>
        <span className="text-[10px] tabular-nums text-white/45">
          {doneCount}/{DNA_DISCOVERY_SIGNALS.length}
        </span>
      </div>

      <ul className={cn("mt-2 space-y-1", compact && "mt-1.5")}>
        {DNA_DISCOVERY_SIGNALS.map((signal) => {
          const status = signalStatus(state, signal, activeField, !!isThinking);
          const value = resolveSignalValue(state, signal);

          return (
            <li
              key={signal.id}
              className={cn(
                "flex items-start gap-2 rounded-xl px-2 py-1.5 text-[11px] transition-all duration-500",
                status === "done" && "bg-emerald-500/[0.08] text-emerald-100/90",
                status === "active" && "bg-violet-500/12 text-violet-100 animate-in fade-in duration-300",
                status === "pending" && "text-white/35",
              )}
            >
              <SignalIcon status={status} />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{signal.label}</span>
                {status === "done" && value && (
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/50">
                    {safeDisplayText(value)}
                  </p>
                )}
                {status === "active" && isThinking && (
                  <p className="mt-0.5 text-[10px] text-violet-200/60">analisi in corso…</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SignalIcon({ status }: { status: SignalStatus }) {
  if (status === "done") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-300">
        <Check className="h-2.5 w-2.5" />
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-500/30 text-violet-200">
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/30">
      <Circle className="h-2 w-2" />
    </span>
  );
}
