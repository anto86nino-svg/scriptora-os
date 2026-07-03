import { memo } from "react";
import { Loader2, PenLine, RefreshCw, Sparkles, Target } from "lucide-react";

type Props = {
  generating?: boolean;
  hasValue?: boolean;
  onWrite?: () => void;
  onGenerate: () => void;
  onSuggest?: () => void;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
  compact?: boolean;
  writeLabel?: string;
  generateLabel?: string;
};

export default memo(function GuidedFieldActions({
  generating = false,
  hasValue = false,
  onWrite,
  onGenerate,
  onSuggest,
  onRegenerate,
  showRegenerate = false,
  compact = false,
  writeLabel = "Scrivo io",
  generateLabel = "Genera per me",
}: Props) {
  const btn = compact
    ? "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold"
    : "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-semibold";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onWrite && (
        <button
          type="button"
          onClick={onWrite}
          className={`${btn} border-white/15 bg-white/5 text-white/80 hover:bg-white/10`}
        >
          <PenLine className="h-3 w-3" />
          {writeLabel}
        </button>
      )}
      <button
        type="button"
        disabled={generating}
        onClick={onGenerate}
        className={`${btn} border-sky-400/35 bg-sky-500/15 text-sky-100 hover:bg-sky-500/25 disabled:opacity-50`}
      >
        {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {generateLabel}
      </button>
      {onSuggest && (
        <button
          type="button"
          disabled={generating}
          onClick={onSuggest}
          className={`${btn} border-violet-400/30 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20 disabled:opacity-50`}
        >
          <Target className="h-3 w-3" />
          Suggerisci
        </button>
      )}
      {showRegenerate && onRegenerate && hasValue && (
        <button
          type="button"
          disabled={generating}
          onClick={onRegenerate}
          className={`${btn} border-amber-400/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 disabled:opacity-50`}
        >
          <RefreshCw className="h-3 w-3" />
          Rigenera
        </button>
      )}
    </div>
  );
});
