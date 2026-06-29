import type { GapAnalysisResult } from "@/lib/study-os/study-gap-analysis";
import { gapRiskLabel } from "@/lib/study-os/study-gap-analysis";

interface StudyGapPanelProps {
  gaps: GapAnalysisResult | null;
  compact?: boolean;
}

const RISK_COLORS: Record<GapAnalysisResult["rischioBocciatura"], string> = {
  basso: "border-emerald-300/25 bg-emerald-400/10 text-emerald-100",
  medio: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  alto: "border-orange-300/25 bg-orange-400/10 text-orange-100",
  critico: "border-rose-300/25 bg-rose-400/10 text-rose-100",
};

export function StudyGapPanel({ gaps, compact = false }: StudyGapPanelProps) {
  if (!gaps) return null;

  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${RISK_COLORS[gaps.rischioBocciatura]}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold">
          Lacune · Rischio {gapRiskLabel(gaps.rischioBocciatura)} · Successo stimato {gaps.probabilitaSuccesso}%
        </p>
        {!compact && (
          <span className="shrink-0 text-[11px] opacity-80">{gaps.summary}</span>
        )}
      </div>
      {!compact && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {gaps.weakTopics.length > 0 && (
            <div className="text-[11px]">
              <span className="font-semibold">Deboli: </span>
              {gaps.weakTopics.slice(0, 4).join(", ")}
            </div>
          )}
          {gaps.strongTopics.length > 0 && (
            <div className="text-[11px]">
              <span className="font-semibold">Forti: </span>
              {gaps.strongTopics.slice(0, 4).join(", ")}
            </div>
          )}
        </div>
      )}
      {gaps.actions.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[11px] leading-5 opacity-90">
          {gaps.actions.slice(0, compact ? 2 : 4).map((action) => (
            <li key={action}>→ {action}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
