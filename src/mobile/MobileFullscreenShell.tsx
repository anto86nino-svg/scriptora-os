import type { ReactNode, RefObject } from "react";
import { ArrowLeft, X } from "lucide-react";
import {
  useMobileForgeBodyLock,
  useMobileForgeKeyboardInset,
} from "@/hooks/useMobileForgeViewport";
import { cn } from "@/lib/utils";

export type MobileFullscreenShellProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  backLabel?: string;
  className?: string;
  scrollRef?: RefObject<HTMLElement | null>;
  /** z-index layer — default 110 (above writer bar, below chapter intelligence) */
  layer?: "overlay" | "forge";
};

/**
 * Canonical mobile fullscreen screen — one active surface, no nested modals.
 */
export function MobileFullscreenShell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  backLabel = "Indietro",
  className,
  scrollRef,
  layer = "overlay",
}: MobileFullscreenShellProps) {
  useMobileForgeBodyLock(true);
  const keyboardInset = useMobileForgeKeyboardInset();
  const zClass = layer === "forge" ? "z-[100]" : "z-[110]";

  return (
    <div
      className={cn(
        "scriptora-mobile-fullscreen-shell scriptora-mobile-enter fixed inset-0 flex flex-col bg-[#07070b]",
        zClass,
        className,
      )}
      style={{ height: "100dvh", maxHeight: "100dvh" }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.08] px-4 pb-3 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/70"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-white">{title}</h1>
          {subtitle && <p className="truncate text-xs text-white/45">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/50"
          aria-label="Chiudi"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <main
        ref={scrollRef as RefObject<HTMLElement>}
        className="scriptora-mobile-fullscreen-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {children}
      </main>

      {footer ? (
        <div
          className="shrink-0 border-t border-white/[0.08] bg-[#07070b]/98"
          style={{
            paddingBottom: keyboardInset
              ? `${keyboardInset}px`
              : "max(0px, env(safe-area-inset-bottom))",
          }}
        >
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export default MobileFullscreenShell;
