import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  backLabel?: string;
  children: ReactNode;
  className?: string;
  maxWidthClass?: string;
};

/** Fullscreen dedicated surface — never lengthens the Dashboard scroll. */
export function DedicatedToolScreen({
  open,
  title,
  description,
  onClose,
  backLabel = "Torna alla Dashboard",
  children,
  className,
  maxWidthClass = "max-w-3xl",
}: Props) {
  if (!open) return null;

  return (
    <div className="scriptora-dedicated-screen fixed inset-0 z-[90] flex flex-col bg-background/95 backdrop-blur-2xl safe-area-pt pb-safe">
      <header className="shrink-0 border-b border-white/10 bg-background/90 px-4 py-3 sm:px-6">
        <div className={cn("mx-auto flex w-full items-center justify-between gap-3", maxWidthClass)}>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/85 transition-colors hover:bg-white/[0.10]"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
            <span className="sm:hidden">Indietro</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-white/60 hover:text-white"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className={cn("mx-auto mt-3 w-full", maxWidthClass)}>
          <h1 className="text-lg font-bold text-white sm:text-xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-white/58">{description}</p>}
        </div>
      </header>
      <div className={cn("scriptora-dedicated-screen-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6", className)}>
        <div className={cn("mx-auto w-full", maxWidthClass)}>{children}</div>
      </div>
    </div>
  );
}
