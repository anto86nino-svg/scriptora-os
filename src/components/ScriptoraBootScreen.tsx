import { t, useUILanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { BootRitualMessageKey, BootRitualStep } from "@/hooks/useHybridBootProgress";

interface ScriptoraBootScreenProps {
  progress: number;
  step: BootRitualStep;
  messageKey: BootRitualMessageKey;
  exiting?: boolean;
}

const RITUAL_LABELS = [
  { id: "write", key: "boot_label_write" as const },
  { id: "edit", key: "boot_label_edit" as const },
  { id: "publish", key: "boot_label_publish" as const },
  { id: "dominate", key: "boot_label_dominate" as const },
] as const;

function isLabelActive(labelId: (typeof RITUAL_LABELS)[number]["id"], step: BootRitualStep): boolean {
  if (step === 1) return labelId === "write";
  if (step === 2) return labelId === "edit";
  return labelId === "publish" || labelId === "dominate";
}

export function ScriptoraBootScreen({
  progress,
  step,
  messageKey,
  exiting = false,
}: ScriptoraBootScreenProps) {
  useUILanguage();
  const clamped = Math.max(0, Math.min(100, progress));

  return (
    <div
      className={cn(
        "scriptora-boot-screen fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-[opacity,filter] duration-500 ease-out",
        exiting ? "pointer-events-none opacity-0 blur-md" : "opacity-100 blur-0",
      )}
      role="status"
      aria-live="polite"
      aria-busy={!exiting}
      aria-label={t(messageKey)}
    >
      <div className="scriptora-boot-bg-image pointer-events-none absolute inset-0" aria-hidden />
      <div className="scriptora-boot-bg-blur pointer-events-none absolute inset-0" aria-hidden />
      <div className="scriptora-boot-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="scriptora-boot-vignette pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center px-5 text-center sm:px-6">
        <div className="scriptora-boot-logo relative mb-7 flex h-[5rem] w-[5rem] items-center justify-center rounded-[24px] border border-white/14 bg-black/25 shadow-[0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-md">
          <div className="scriptora-boot-logo-shimmer pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]" aria-hidden />
          <img
            src="/scriptora-icon.png"
            alt=""
            width={52}
            height={52}
            className="relative h-[3.25rem] w-[3.25rem] object-contain drop-shadow-[0_4px_24px_rgba(186,230,253,0.35)]"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        <h1 className="text-[2rem] font-semibold uppercase tracking-[0.22em] text-white/95 sm:text-[2.35rem]">
          Scriptora
        </h1>

        <div
          className="mt-4 flex max-w-full flex-wrap items-center justify-center gap-x-1.5 gap-y-1 sm:gap-x-2"
          aria-hidden
        >
          {RITUAL_LABELS.map((label, index) => (
            <span key={label.id} className="inline-flex items-center gap-x-1.5 sm:gap-x-2">
              {index > 0 && (
                <span className="text-[9px] font-light text-white/20 sm:text-[10px]" aria-hidden>
                  ·
                </span>
              )}
              <span
                className={cn(
                  "scriptora-boot-label text-[9px] font-semibold uppercase tracking-[0.28em] transition-[color,text-shadow,opacity] duration-500 ease-out sm:text-[10px] sm:tracking-[0.34em]",
                  isLabelActive(label.id, step)
                    ? "scriptora-boot-label-active text-white/92"
                    : "text-white/32",
                )}
              >
                {t(label.key)}
              </span>
            </span>
          ))}
        </div>

        <div className="mt-10 w-full max-w-[280px] sm:max-w-[300px]">
          <div className="scriptora-boot-progress-track relative h-[7px] overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="scriptora-boot-progress-fill relative h-full rounded-full will-change-[width]"
              style={{ width: `${clamped}%` }}
            >
              <div className="scriptora-boot-progress-shimmer pointer-events-none absolute inset-0" aria-hidden />
            </div>
          </div>
        </div>

        <p
          key={messageKey}
          className="scriptora-boot-message mt-4 min-h-[1.35rem] text-sm font-medium tracking-wide text-white/62"
        >
          {t(messageKey)}
        </p>
      </div>
    </div>
  );
}
