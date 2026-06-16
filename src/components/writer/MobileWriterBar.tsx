import { Headphones, Layers, MoreHorizontal, Scissors, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileWriterBarProps = {
  onOpenIndex: () => void;
  onListen?: () => void;
  onPatch?: () => void;
  onAnalysis?: () => void;
  onMore?: () => void;
  listenDisabled?: boolean;
  toolsDisabled?: boolean;
  className?: string;
};

export function MobileWriterBar({
  onOpenIndex,
  onListen,
  onPatch,
  onAnalysis,
  onMore,
  listenDisabled,
  toolsDisabled,
  className,
}: MobileWriterBarProps) {
  return (
    <nav
      className={cn(
        "scriptora-mobile-writer-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+0.5rem)] z-40 grid grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-[#0c0c12]/95 p-1.5 shadow-2xl backdrop-blur-xl",
        className,
      )}
    >
      <BarButton icon={Layers} label="Indice" onClick={onOpenIndex} />
      <BarButton icon={Headphones} label="Ascolta" onClick={onListen} disabled={listenDisabled || !onListen} />
      <BarButton icon={Scissors} label="Patch" onClick={onPatch} disabled={toolsDisabled || !onPatch} />
      <BarButton icon={Zap} label="Analysis" onClick={onAnalysis} disabled={toolsDisabled || !onAnalysis} />
      <BarButton icon={MoreHorizontal} label="Altro" onClick={onMore} disabled={!onMore} />
    </nav>
  );
}

function BarButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Layers;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-semibold text-white/70 transition enabled:hover:bg-white/[0.08] enabled:hover:text-white disabled:opacity-35"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
