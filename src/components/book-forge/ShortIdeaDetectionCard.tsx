import type { GenreHypothesis } from "@/lib/book-forge/auto-detection-engine";
import { Zap } from "lucide-react";

type Props = {
  hypotheses: GenreHypothesis[];
  onAskQuestions: () => void;
  onExpand: () => void;
  onDetectAnyway: () => void;
  expanding?: boolean;
};

export default function ShortIdeaDetectionCard({
  hypotheses,
  onAskQuestions,
  onExpand,
  onDetectAnyway,
  expanding = false,
}: Props) {
  return (
    <div className="rounded-2xl border border-sky-400/25 bg-gradient-to-br from-sky-500/10 via-violet-500/5 to-transparent p-4">
      <p className="text-sm font-semibold text-sky-50">Idea breve — genere con confidenza</p>
      <p className="mt-1 text-xs leading-5 text-white/55">
        Con poche parole posso solo ipotizzare. Ecco i filoni più probabili:
      </p>

      {hypotheses.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {hypotheses.map((hypothesis) => (
            <li
              key={`${hypothesis.genre}-${hypothesis.bookTypeId}`}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
            >
              <span className="font-medium text-white">{hypothesis.label}</span>
              <span className="tabular-nums font-bold text-violet-200">{hypothesis.confidencePercent}%</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAskQuestions}
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/15 px-3 py-2 text-xs font-semibold text-violet-100"
        >
          <Zap className="h-3.5 w-3.5" />
          Fammi 3 domande
        </button>
        <button
          type="button"
          disabled={expanding}
          onClick={onExpand}
          className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/30 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 disabled:opacity-50"
        >
          <Zap className="h-3.5 w-3.5" />
          Espandi automaticamente
        </button>
        <button
          type="button"
          onClick={onDetectAnyway}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80"
        >
          <Zap className="h-3.5 w-3.5" />
          Rileva comunque genere
        </button>
      </div>
    </div>
  );
}
