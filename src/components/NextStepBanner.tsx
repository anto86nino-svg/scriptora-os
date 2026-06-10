import { ArrowRight, Compass } from "lucide-react";

interface NextStepBannerProps {
  title: string;
  hint: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Subtle “what to do next” guidance — one clear action per screen. */
export function NextStepBanner({ title, hint, actionLabel, onAction }: NextStepBannerProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-sky-300/20 bg-sky-400/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-200">
          <Compass className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-200/90">{title}</p>
          <p className="mt-0.5 text-sm leading-5 text-foreground/85">{hint}</p>
        </div>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-white px-3 text-xs font-bold text-slate-950 shadow-sm transition-colors hover:bg-slate-100 sm:self-center"
        >
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
