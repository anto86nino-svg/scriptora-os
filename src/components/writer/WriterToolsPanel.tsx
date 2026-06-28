import { ChevronLeft, ChevronRight, Headphones, RefreshCw, Scissors, Shield, Sparkles, Target, Zap } from "lucide-react";
import { useState } from "react";
import type { RewriteLevel } from "@/lib/generation-types";
import { cn } from "@/lib/utils";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { REWRITE_LEVEL_LABELS } from "@/lib/chapter-editorial-tools";

export type WriterToolsPanelProps = {
  open: boolean;
  onToggle: () => void;
  isGenerated?: boolean;
  isGenerating?: boolean;
  isEvaluating?: boolean;
  onGenerate?: () => void;
  onListen?: () => void;
  onAnalysis?: () => void;
  onPatch?: () => void;
  onCleanup?: () => void;
  onEvaluate?: () => void;
  onRegenerate?: () => void;
  onRewrite?: (level: RewriteLevel) => void;
  onAutoRewrite?: (threshold: number) => void;
};

export function WriterToolsPanel({
  open,
  onToggle,
  isGenerated,
  isGenerating,
  isEvaluating,
  onGenerate,
  onListen,
  onAnalysis,
  onPatch,
  onCleanup,
  onEvaluate,
  onRegenerate,
  onRewrite,
  onAutoRewrite,
}: WriterToolsPanelProps) {
  const [showRewrite, setShowRewrite] = useState(false);
  const busy = isGenerating || isEvaluating;

  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="scriptora-writer-tools-toggle fixed right-3 top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-30 hidden items-center gap-1.5 rounded-full border border-white/10 bg-[#0c0c12]/90 px-3 py-2 text-xs font-semibold text-white/75 shadow-lg backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white lg:flex"
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-300" />
        Tools
        <ChevronLeft className="h-3.5 w-3.5 opacity-50" />
      </button>
    );
  }

  return (
    <aside className="scriptora-writer-tools-panel hidden w-[min(100%,280px)] shrink-0 flex-col border-l border-white/[0.08] bg-[#0a0a0f]/80 backdrop-blur-xl lg:flex">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-white/80">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          Strumenti capitolo
        </p>
        <button type="button" onClick={onToggle} className="rounded-lg p-1.5 text-white/50 hover:bg-white/[0.06] hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {!isGenerated ? (
          <div className="space-y-2">
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-5 text-white/45">
              Genera il capitolo per sbloccare Analisi, Voto, Pulizia, Patch e Riscrittura.
            </p>
            {onGenerate && (
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40"
              >
                Genera capitolo
              </button>
            )}
          </div>
        ) : (
          <>
            <ToolButton icon={Zap} label="Analizza" description="Trova problemi di ritmo, coerenza e struttura." onClick={onAnalysis} disabled={busy} />
            <ToolButton icon={Target} label="Vota" description="Assegna un voto editoriale severo al capitolo." onClick={onEvaluate} disabled={busy} />
            <ToolButton icon={Shield} label="Pulizia editoriale" description="Corregge errori e ripetizioni senza riscrivere." onClick={onCleanup} disabled={busy || !onCleanup} />
            <ToolButton icon={Scissors} label="Patch" description="Corregge un problema specifico." onClick={onPatch} disabled={busy} />
            <ToolButton icon={Headphones} label="Ascolta" description="Rileggi il capitolo in Voice Studio." onClick={onListen} disabled={busy} />
            <div className="px-1">
              <CreditCostBadge operation="chapter_diagnostic" />
            </div>
            <ToolButton icon={RefreshCw} label="Rigenera" description="Ricrea il capitolo dal blueprint." onClick={onRegenerate} disabled={busy} />
            <div className="relative">
              <ToolButton
                icon={Sparkles}
                label="Riscrivi"
                description="Intervento piu' forte di Pulizia e Patch."
                onClick={() => setShowRewrite((v) => !v)}
                disabled={busy || !onRewrite}
              />
              {showRewrite && onRewrite && (
                <div className="mt-1 space-y-1 rounded-xl border border-white/10 bg-black/30 p-2">
                  {(["light", "deep", "bestseller"] as RewriteLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        onRewrite(level);
                        setShowRewrite(false);
                      }}
                      className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-white/75 hover:bg-white/[0.06]"
                    >
                      <span className="font-bold text-white/85">{REWRITE_LEVEL_LABELS[level].label}</span>
                      <span className="mt-0.5 block leading-4 text-white/45">{REWRITE_LEVEL_LABELS[level].description}</span>
                    </button>
                  ))}
                  {onAutoRewrite &&
                    [3, 4, 5].map((th) => (
                      <button
                        key={th}
                        type="button"
                        onClick={() => {
                          onAutoRewrite(th);
                          setShowRewrite(false);
                        }}
                        className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-white/75 hover:bg-white/[0.06]"
                      >
                        Auto → {th}/5
                      </button>
                    ))}
                </div>
              )}
              <div className="mt-1 px-1">
                <CreditCostBadge operation="rewrite_chapter" />
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function ToolButton({
  icon: Icon,
  label,
  description,
  onClick,
  disabled,
}: {
  icon: typeof Zap;
  label: string;
  description?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      title={description}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium text-white/80 transition",
        "enabled:hover:border-white/15 enabled:hover:bg-white/[0.06] disabled:opacity-35",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-300/90" />
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description && <span className="mt-0.5 block text-[11px] leading-4 text-white/42">{description}</span>}
      </span>
    </button>
  );
}
