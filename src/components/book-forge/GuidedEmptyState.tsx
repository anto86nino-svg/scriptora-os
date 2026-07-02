import { Loader2, PenLine, Sparkles } from "lucide-react";

type Props = {
  missingLabel: string;
  description?: string;
  onGenerate: () => void;
  onWrite: () => void;
  generating?: boolean;
  generateLabel?: string;
};

export default function GuidedEmptyState({
  missingLabel,
  description,
  onGenerate,
  onWrite,
  generating = false,
  generateLabel = "Genera per me",
}: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">
        Manca: {missingLabel}
      </p>
      {description && (
        <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={generating}
          onClick={onGenerate}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generateLabel}
        </button>
        <button
          type="button"
          onClick={onWrite}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80"
        >
          <PenLine className="h-3.5 w-3.5" />
          Lo scrivo io
        </button>
      </div>
    </div>
  );
}
