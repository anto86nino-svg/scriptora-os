import { useEffect, useRef, useState } from "react";
import { Download, Loader2, Play, Sparkles, X, Zap } from "lucide-react";
import { t } from "@/lib/i18n";
import { RewriteLevel } from "@/lib/generation";
import { cn } from "@/lib/utils";

interface MobileWritingFABProps {
  isGenerating: boolean;
  isGenerated: boolean;
  onGenerate: () => void;
  onRewrite: (level: RewriteLevel) => void;
  onAnalysis: () => void;
  onExport?: () => void;
}

export function MobileWritingFAB({
  isGenerating,
  isGenerated,
  onGenerate,
  onRewrite,
  onAnalysis,
  onExport,
}: MobileWritingFABProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  const actions = isGenerated
    ? [
        { key: "generate", label: t("regenerate"), icon: <Play className="h-4 w-4" />, onClick: () => run(onGenerate), disabled: isGenerating },
        { key: "rewrite", label: t("rewrite"), icon: <Sparkles className="h-4 w-4" />, onClick: () => run(() => onRewrite("deep")), disabled: isGenerating },
        { key: "analysis", label: "Analysis", icon: <Zap className="h-4 w-4" />, onClick: () => run(onAnalysis), disabled: isGenerating },
        ...(onExport
          ? [{ key: "export", label: t("export"), icon: <Download className="h-4 w-4" />, onClick: () => run(onExport), disabled: false }]
          : []),
      ]
    : [
        { key: "generate", label: t("generate"), icon: isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />, onClick: () => run(onGenerate), disabled: isGenerating },
      ];

  return (
    <div ref={rootRef} className="scriptora-mobile-fab fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 md:hidden">
      {open && (
        <div className="flex flex-col items-stretch gap-1.5 rounded-2xl border border-white/12 bg-background/95 p-2 shadow-2xl backdrop-blur-xl">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className="inline-flex min-w-[148px] items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-40"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-primary text-primary-foreground shadow-xl transition-transform active:scale-95",
          open && "rotate-0",
        )}
        aria-label={open ? t("close") : t("writing_actions")}
      >
        {open ? <X className="h-5 w-5" /> : isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
      </button>
    </div>
  );
}
