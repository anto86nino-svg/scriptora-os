import type { ReactNode, RefObject } from "react";
import {
  useMobileForgeBodyLock,
  useMobileForgeKeyboardInset,
} from "@/hooks/useMobileForgeViewport";

export type MobileForgeScrollShellProps = {
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Attach to the single scroll `<main>` for programmatic scroll-into-view. */
  scrollRef?: RefObject<HTMLElement | null>;
};

/**
 * Canonical mobile Book Forge viewport shell.
 *
 * Architecture (single scroll, no nesting):
 *   fixed 100dvh column
 *     ├─ header (shrink-0)
 *     ├─ main  (flex-1 min-h-0 overflow-y-auto) ← ONLY scroll region
 *     └─ footer (shrink-0, keyboard-aware)
 */
export function MobileForgeScrollShell({
  header,
  footer,
  children,
  className,
  scrollRef,
}: MobileForgeScrollShellProps) {
  useMobileForgeBodyLock(true);
  const keyboardInset = useMobileForgeKeyboardInset();

  return (
    <div
      className={`scriptora-book-forge-mobile fixed inset-0 z-[100] flex flex-col bg-[#07070b] ${className ?? ""}`}
      style={{
        height: "100dvh",
        maxHeight: "100dvh",
      }}
    >
      {header}

      <main
        ref={scrollRef as RefObject<HTMLElement>}
        className="scriptora-book-forge-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
      >
        {children}
      </main>

      {footer ? (
        <div
          className="scriptora-book-forge-footer shrink-0"
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

export default MobileForgeScrollShell;
