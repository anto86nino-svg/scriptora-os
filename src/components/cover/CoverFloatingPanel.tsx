import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  isMobile?: boolean;
  className?: string;
};

export function CoverFloatingPanel({
  open,
  title,
  onClose,
  children,
  isMobile = false,
  className,
}: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Chiudi pannello"
        className="cover-focus-panel-backdrop fixed inset-0 z-[130] bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className={cn(
          "cover-focus-panel glass-premium fixed z-[131] flex flex-col overflow-hidden border border-white/12 bg-background/88 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl",
          isMobile
            ? "cover-focus-panel--mobile inset-x-0 bottom-0 max-h-[min(58dvh,520px)] rounded-t-[1.75rem]"
            : "cover-focus-panel--desktop right-4 top-[calc(max(0.5rem,env(safe-area-inset-top))+3.5rem)] bottom-4 w-[min(400px,34vw)] rounded-[1.75rem]",
          className,
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="cover-focus-panel-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {children}
        </div>
      </aside>
    </>
  );
}
