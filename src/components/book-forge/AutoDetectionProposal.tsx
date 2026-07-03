import { memo } from "react";
import type { AutoDetectionProposal } from "@/lib/book-forge/auto-detection-engine";
import { Sparkles } from "lucide-react";

type Props = {
  proposal: AutoDetectionProposal;
  onAccept: () => void;
  onModify: () => void;
};

export default memo(function AutoDetectionProposalCard({ proposal, onAccept, onModify }: Props) {
  const formatLabel = proposal.bookFormat.replace(/_/g, " ");
  return (
    <div className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-sky-500/5 to-transparent p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-50">Suggerimento da Scriptora</p>
          <p className="mt-1 text-xs font-medium text-violet-100/90">
            Abbiamo rilevato che questa idea sembra appartenere a:
          </p>
          <ul className="mt-2 space-y-1 text-xs text-white">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-300">✓</span>
              <span className="font-medium capitalize">{formatLabel}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-300">✓</span>
              <span className="font-medium">{proposal.detectedLabel}</span>
            </li>
          </ul>
          <p className="mt-2 text-xs leading-5 text-white/55">Confermi?</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white"
            >
              Conferma
            </button>
            <button
              type="button"
              onClick={onModify}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/75"
            >
              Modifica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
