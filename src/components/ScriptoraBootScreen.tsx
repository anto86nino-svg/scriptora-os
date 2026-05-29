import { Sparkles } from "lucide-react";
import { t, useUILanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { BootMessageKey } from "@/lib/smart-boot";

interface ScriptoraBootScreenProps {
  progress: number;
  messageKey: BootMessageKey;
  exiting?: boolean;
}

export function ScriptoraBootScreen({ progress, messageKey, exiting = false }: ScriptoraBootScreenProps) {
  useUILanguage();
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn(
        "scriptora-boot-screen fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#06070d] transition-opacity duration-300 ease-out",
        exiting ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
    >
      <div className="scriptora-boot-horizon pointer-events-none absolute inset-0" aria-hidden />
      <div className="scriptora-boot-glow pointer-events-none absolute left-1/2 top-[38%] h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl" aria-hidden />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center px-6">
        <div className="scriptora-boot-logo relative mb-8 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[22px] border border-white/12 bg-white/[0.06] shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <div className="scriptora-boot-logo-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]" aria-hidden />
          <Sparkles className="relative h-7 w-7 text-cyan-100" strokeWidth={1.75} />
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/45">Scriptora</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white/95">Scriptora OS</h1>

        <p className="mt-5 min-h-[1.25rem] text-center text-xs font-medium text-white/55 transition-opacity duration-200">
          {t(messageKey)}
        </p>

        <div className="mt-6 w-full max-w-[220px]">
          <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="scriptora-boot-progress h-full rounded-full bg-gradient-to-r from-cyan-300/80 via-sky-200 to-white/90 transition-[width] duration-500 ease-out will-change-[width]"
              style={{ width: `${clamped}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
