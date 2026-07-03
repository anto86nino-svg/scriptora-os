import { memo } from "react";
import type { AutoDetectionProposal } from "@/lib/book-forge/auto-detection-engine";
import { Sparkles } from "lucide-react";

type Props = {
  proposal: AutoDetectionProposal;
  onAccept: () => void;
  onKeep: () => void;
};

export default memo(function AutoDetectionProposalCard({ proposal, onAccept, onKeep }: Props) {
  return (
    <div className="rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/10 via-sky-500/5 to-transparent p-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-50">Scriptora ha letto la tua idea</p>
          <p className="mt-1 text-xs font-medium text-violet-100/90">
            Ho rilevato: <span className="text-white">{proposal.detectedLabel}</span>
          </p>
          <p className="mt-1 text-xs leading-5 text-white/60">{proposal.rationale}</p>
          <dl className="mt-3 grid gap-1.5 text-[11px] sm:grid-cols-2">
            <div><dt className="text-white/45">Genere</dt><dd className="font-medium text-white">{proposal.genre}</dd></div>
            <div><dt className="text-white/45">Formato</dt><dd className="font-medium text-white">{proposal.bookFormat}</dd></div>
            {proposal.subgenre && (
              <div className="sm:col-span-2"><dt className="text-white/45">Sottogenere</dt><dd className="font-medium text-white">{proposal.subgenre}</dd></div>
            )}
            {proposal.tone && (
              <div className="sm:col-span-2"><dt className="text-white/45">Tono</dt><dd className="font-medium text-white">{proposal.tone}</dd></div>
            )}
            {proposal.targetReader && (
              <div className="sm:col-span-2"><dt className="text-white/45">Pubblico</dt><dd className="font-medium text-white">{proposal.targetReader}</dd></div>
            )}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAccept}
              className="rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white"
            >
              Accetta proposta
            </button>
            <button
              type="button"
              onClick={onKeep}
              className="rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold text-white/75"
            >
              Tengo le mie scelte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
