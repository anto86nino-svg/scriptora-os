import { useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, Layers, ChevronDown } from "lucide-react";
import {
  clampDockPosition,
  defaultDockPosition,
  loadFloatingDockState,
  saveFloatingDockState,
} from "@/lib/floating-dock-storage";
import { isDevMode } from "@/lib/dev-mode";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  devSlot?: ReactNode;
}

export function ScriptoraFloatingDock({ children, devSlot }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originLeft: number; originTop: number; moved: boolean } | null>(null);

  const [collapsed, setCollapsed] = useState(() => loadFloatingDockState().collapsed);
  const [position, setPosition] = useState(() => {
    const saved = loadFloatingDockState().position;
    return saved ?? defaultDockPosition();
  });

  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const clamped = clampDockPosition(position.left, position.top, rect.width, rect.height);
      if (clamped.left !== position.left || clamped.top !== position.top) {
        setPosition(clamped);
        saveFloatingDockState({ collapsed, position: clamped });
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [collapsed, position]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originLeft: position.left,
      originTop: position.top,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    const el = panelRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    const width = el?.getBoundingClientRect().width ?? 44;
    const height = el?.getBoundingClientRect().height ?? 44;
    const next = clampDockPosition(drag.originLeft + dx, drag.originTop + dy, width, height);
    setPosition(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const wasDrag = drag.moved;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const el = panelRef.current;
    const width = el?.getBoundingClientRect().width ?? 44;
    const height = el?.getBoundingClientRect().height ?? 44;
    const clamped = clampDockPosition(position.left, position.top, width, height);
    setPosition(clamped);
    saveFloatingDockState({ collapsed, position: clamped });
    return wasDrag;
  };

  if (collapsed) {
    return (
      <button
        type="button"
        className="scriptora-floating-dock-pill"
        style={{ left: position.left, top: position.top }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => {
          const dragged = onPointerUp(e);
          if (!dragged) {
            setCollapsed(false);
            saveFloatingDockState({ collapsed: false, position });
          }
        }}
        onPointerCancel={onPointerUp}
        title="Apri strumenti flottanti"
        aria-label="Apri strumenti flottanti"
      >
        <Layers className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      className="scriptora-floating-dock"
      style={{ left: position.left, top: position.top }}
      role="complementary"
      aria-label="Strumenti flottanti"
    >
      <div
        className="scriptora-floating-dock-header"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 opacity-60 touch-none" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">Utilità</span>
        <button
          type="button"
          className="scriptora-floating-dock-icon-btn"
          onClick={() => {
            setCollapsed(true);
            saveFloatingDockState({ collapsed: true, position });
          }}
          title="Minimizza"
          aria-label="Minimizza dock"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="scriptora-floating-dock-stack">
        {children}
        {isDevMode() && devSlot ? <div className="scriptora-floating-dock-slot">{devSlot}</div> : null}
      </div>
    </div>
  );
}

export function FloatingDockSlot({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("scriptora-floating-dock-slot", className)}>{children}</div>;
}
