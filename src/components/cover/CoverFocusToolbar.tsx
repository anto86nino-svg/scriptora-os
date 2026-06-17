import {
  Download, Layers, LayoutTemplate, Palette, Sparkles, Store, Type,
  Image as ImageIcon, Printer, Settings2, CheckCircle2,
} from "lucide-react";
import type { CoverFocusPanelId } from "@/lib/cover-studio/cover-focus-types";
import { COVER_FOCUS_PANEL_LABELS } from "@/lib/cover-studio/cover-focus-types";
import { cn } from "@/lib/utils";

const TOOL_ITEMS: Array<{
  id: CoverFocusPanelId;
  icon: typeof Type;
}> = [
  { id: "style", icon: LayoutTemplate },
  { id: "text", icon: Type },
  { id: "images", icon: ImageIcon },
  { id: "layers", icon: Layers },
  { id: "stickers", icon: Sparkles },
  { id: "effects", icon: Palette },
  { id: "format", icon: Settings2 },
  { id: "marketplace", icon: Store },
  { id: "readiness", icon: CheckCircle2 },
  { id: "print", icon: Printer },
  { id: "export", icon: Download },
];

type Props = {
  activePanel: CoverFocusPanelId | null;
  onSelectPanel: (id: CoverFocusPanelId) => void;
  italianUi?: boolean;
  isMobile?: boolean;
  score?: number;
};

export function CoverFocusToolbar({
  activePanel,
  onSelectPanel,
  italianUi = true,
  isMobile = false,
  score,
}: Props) {
  return (
    <nav
      className={cn(
        "cover-focus-toolbar glass-premium z-[125] flex shrink-0 border border-white/10 bg-background/75 backdrop-blur-2xl",
        isMobile
          ? "mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] overflow-x-auto rounded-[1.25rem] px-1 py-1.5 [-webkit-overflow-scrolling:touch]"
          : "absolute bottom-5 left-1/2 max-w-[min(96vw,920px)] -translate-x-1/2 flex-wrap justify-center gap-0.5 rounded-[1.35rem] px-2 py-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)]",
      )}
      aria-label={italianUi ? "Strumenti copertina" : "Cover tools"}
    >
      {TOOL_ITEMS.map(({ id, icon: Icon }) => {
        const label = italianUi ? COVER_FOCUS_PANEL_LABELS[id].it : COVER_FOCUS_PANEL_LABELS[id].en;
        const active = activePanel === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelectPanel(id)}
            className={cn(
              "cover-focus-tool-btn flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-2.5 py-2 text-[10px] font-semibold transition",
              active
                ? "bg-primary/20 text-primary shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]"
                : "text-muted-foreground hover:bg-white/6 hover:text-foreground",
              isMobile ? "min-w-[52px] min-h-[44px]" : "min-w-[56px] min-h-[48px]",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
            {id === "readiness" && score != null && (
              <span className="text-[9px] tabular-nums opacity-80">{score}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
