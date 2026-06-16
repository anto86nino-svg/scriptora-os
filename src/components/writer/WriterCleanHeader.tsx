import { ArrowLeft, Focus, MoreHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type WriterCleanHeaderProps = {
  bookTitle: string;
  sectionLabel: string;
  progressLabel: string;
  isGenerating?: boolean;
  focusMode?: boolean;
  onFocusMode?: () => void;
  menuOpen?: boolean;
  onMenuToggle?: () => void;
  className?: string;
};

export function WriterCleanHeader({
  bookTitle,
  sectionLabel,
  progressLabel,
  isGenerating,
  focusMode,
  onFocusMode,
  onMenuToggle,
  className,
}: WriterCleanHeaderProps) {
  return (
    <header
      className={cn(
        "scriptora-writer-clean-header flex shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#0a0a0f]/90 px-3 py-2.5 backdrop-blur-xl md:gap-3 md:px-4",
        className,
      )}
    >
      <Link
        to="/dashboard"
        className="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-2.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.06] hover:text-white md:px-3"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Torna</span>
      </Link>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          {bookTitle}
        </p>
        <p className="truncate text-sm font-semibold text-white">{sectionLabel}</p>
      </div>

      <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/65 sm:flex">
        {isGenerating && (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]" />
        )}
        {progressLabel}
      </div>

      {onFocusMode && (
        <button
          type="button"
          onClick={onFocusMode}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
            focusMode
              ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200"
              : "border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white",
          )}
          title="Focus mode"
        >
          <Focus className="h-4 w-4" />
        </button>
      )}

      {onMenuToggle && (
        <button
          type="button"
          onClick={onMenuToggle}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
          title="Menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    </header>
  );
}
