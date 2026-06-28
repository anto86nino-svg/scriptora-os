import { BarChart3, Download, Headphones, Settings, Shield, Sparkles, Target, Upload } from "lucide-react";
import type { RewriteLevel } from "@/lib/generation-types";
import { REWRITE_LEVEL_LABELS } from "@/lib/chapter-editorial-tools";
import { cn } from "@/lib/utils";
import { MobileFullscreenShell } from "@/mobile/MobileFullscreenShell";

export type WriterOverflowMenuProps = {
  open: boolean;
  onClose: () => void;
  onExport?: () => void;
  onVoice?: () => void;
  onCleanup?: () => void;
  onEvaluate?: () => void;
  onRewrite?: (level: RewriteLevel) => void;
  onSettings?: () => void;
  onCoach?: () => void;
  onMarket?: () => void;
  className?: string;
  /** Mobile: one-screen fullscreen instead of popover */
  fullscreen?: boolean;
};

export function WriterOverflowMenu({
  open,
  onClose,
  onExport,
  onVoice,
  onCleanup,
  onEvaluate,
  onRewrite,
  onSettings,
  onCoach,
  onMarket,
  className,
  fullscreen,
}: WriterOverflowMenuProps) {
  if (!open) return null;

  if (fullscreen) {
    return (
      <MobileFullscreenShell title="Strumenti Writer" subtitle="Voto · Riscrittura · Voice · Export" onClose={onClose}>
        <div className="space-y-2 px-4 py-4">
          {onEvaluate && <FullscreenMenuItem icon={Target} label="Vota capitolo" onClick={() => { onEvaluate(); onClose(); }} />}
          {onRewrite && (
            <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-2">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-50/65">Riscrivi</p>
              {(["light", "deep", "bestseller"] as RewriteLevel[]).map((level) => (
                <FullscreenMenuItem
                  key={level}
                  icon={Sparkles}
                  label={`Riscrivi ${REWRITE_LEVEL_LABELS[level].label.toLowerCase()}`}
                  onClick={() => {
                    onRewrite(level);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
          {onVoice && <FullscreenMenuItem icon={Headphones} label="Ascolta" onClick={() => { onVoice(); onClose(); }} />}
          {onExport && <FullscreenMenuItem icon={Upload} label="Export" onClick={() => { onExport(); onClose(); }} />}
          {onCleanup && <FullscreenMenuItem icon={Shield} label="Pulizia editoriale" onClick={() => { onCleanup(); onClose(); }} />}
          {onCoach && <FullscreenMenuItem icon={Sparkles} label="AI Coach" onClick={() => { onCoach(); onClose(); }} />}
          {onMarket && <FullscreenMenuItem icon={BarChart3} label="Market OS" onClick={() => { onMarket(); onClose(); }} />}
          {onSettings && <FullscreenMenuItem icon={Settings} label="Impostazioni" onClick={() => { onSettings(); onClose(); }} />}
        </div>
      </MobileFullscreenShell>
    );
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-40" aria-label="Chiudi menu" onClick={onClose} />
      <div
        className={cn(
          "absolute right-3 top-[calc(100%+0.35rem)] z-50 min-w-[180px] rounded-xl border border-white/10 bg-[#0c0c12]/98 p-1.5 shadow-2xl backdrop-blur-xl",
          className,
        )}
      >
        {onEvaluate && <MenuItem icon={Target} label="Vota capitolo" onClick={() => { onEvaluate(); onClose(); }} />}
        {onRewrite && (
          <>
            {(["light", "deep", "bestseller"] as RewriteLevel[]).map((level) => (
              <MenuItem
                key={level}
                icon={Sparkles}
                label={`Riscrivi ${REWRITE_LEVEL_LABELS[level].label.toLowerCase()}`}
                onClick={() => {
                  onRewrite(level);
                  onClose();
                }}
              />
            ))}
          </>
        )}
        {onVoice && <MenuItem icon={Headphones} label="Ascolta" onClick={() => { onVoice(); onClose(); }} />}
        {onExport && <MenuItem icon={Upload} label="Export" onClick={() => { onExport(); onClose(); }} />}
        {onCleanup && <MenuItem icon={Shield} label="Pulizia editoriale" onClick={() => { onCleanup(); onClose(); }} />}
        {onCoach && <MenuItem icon={Sparkles} label="AI Coach" onClick={() => { onCoach(); onClose(); }} />}
        {onMarket && <MenuItem icon={BarChart3} label="Market OS" onClick={() => { onMarket(); onClose(); }} />}
        {onSettings && <MenuItem icon={Settings} label="Impostazioni" onClick={() => { onSettings(); onClose(); }} />}
        <MenuItem icon={Download} label="Credits & piano" onClick={onClose} disabled />
      </div>
    </>
  );
}

function FullscreenMenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Settings;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-left text-base font-semibold text-white"
    >
      <Icon className="h-5 w-5 shrink-0 text-white/55" />
      {label}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof Settings;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/80 transition enabled:hover:bg-white/[0.08] disabled:opacity-40"
    >
      <Icon className="h-4 w-4 shrink-0 text-white/50" />
      {label}
    </button>
  );
}
