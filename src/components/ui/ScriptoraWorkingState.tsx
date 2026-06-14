import { useEffect, useMemo, useState } from "react";
import { Clock3, Loader2 } from "lucide-react";
import {
  formatWorkingTime,
  resolveActiveStep,
  resolveRotatingMessage,
  type ScriptoraWorkingTone,
} from "@/lib/scriptora-working-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type ScriptoraWorkingVariant = "inline" | "panel" | "overlay" | "card";

export type ScriptoraWorkingStateProps = {
  title: string;
  description?: string;
  messages?: string[];
  steps?: string[];
  activeStep?: number;
  startedAt?: number;
  compact?: boolean;
  variant?: ScriptoraWorkingVariant;
  tone?: ScriptoraWorkingTone;
  className?: string;
};

const TONE_BORDER: Record<ScriptoraWorkingTone, string> = {
  blueprint: "border-cyan-300/25 bg-cyan-400/8",
  writing: "border-cyan-300/25 bg-cyan-400/8",
  editorial: "border-sky-300/25 bg-sky-400/10",
  market: "border-violet-300/25 bg-violet-400/10",
  export: "border-primary/25 bg-primary/8",
  study: "border-emerald-300/25 bg-emerald-400/10",
  cover: "border-amber-300/25 bg-amber-400/10",
};

export function ScriptoraWorkingState({
  title,
  description,
  messages,
  steps,
  activeStep,
  startedAt,
  compact = false,
  variant = "card",
  tone = "editorial",
  className,
}: ScriptoraWorkingStateProps) {
  const isMobile = useIsMobile();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const base = startedAt ?? Date.now();
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - base) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const copy = useMemo(
    () => description || resolveRotatingMessage(tone, elapsed, messages),
    [description, tone, elapsed, messages],
  );
  const stepIndex = resolveActiveStep(steps, elapsed, activeStep);
  const visualProgress = Math.min(92, 12 + elapsed * 1.4 + (steps?.length ? stepIndex * 8 : 0));
  const slow = elapsed >= 45;
  const denseMobile = isMobile && !compact;
  const effectiveVariant = denseMobile && variant === "panel" ? "card" : variant;
  const activeStepLabel = steps?.[stepIndex];
  const showStepGrid = !compact && steps && steps.length > 0;
  const showMobileStepRail = showStepGrid && denseMobile;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        "scriptora-working-state scriptora-working-enter max-w-full min-w-0 overflow-hidden",
        effectiveVariant === "inline" && "rounded-xl border px-3 py-2.5",
        effectiveVariant === "card" && "rounded-xl border p-3 sm:p-4",
        effectiveVariant === "panel" && "rounded-2xl border p-4 sm:p-5",
        effectiveVariant === "overlay" && "rounded-2xl border p-4 shadow-lg",
        denseMobile && "scriptora-working-state--dense",
        TONE_BORDER[tone],
        className,
      )}
    >
      <div className={cn("flex gap-2.5 sm:gap-3", compact ? "items-center" : "items-start")}>
        <div
          className={cn(
            "scriptora-working-orbit relative flex shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/25",
            denseMobile || compact ? "h-8 w-8" : "h-9 w-9",
          )}
        >
          <Loader2 className={cn("animate-spin text-primary/90", denseMobile || compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p
              className={cn(
                "font-semibold text-foreground break-words",
                compact ? "text-xs" : denseMobile ? "text-xs sm:text-sm" : "text-sm",
              )}
            >
              {title}
            </p>
            <div className="flex shrink-0 items-center gap-1.5">
              {showMobileStepRail && activeStepLabel && (
                <span className="rounded-lg border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/80">
                  {stepIndex + 1}/{steps.length}
                </span>
              )}
              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-black/20 px-2 py-1 font-mono text-[11px] tabular-nums text-foreground/85">
                <Clock3 className="h-3 w-3" />
                {formatWorkingTime(elapsed)}
              </span>
            </div>
          </div>
          {!compact && (
            <p className="scriptora-working-pulse mt-1 text-[11px] leading-5 text-muted-foreground break-words">
              {copy}
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <div className="scriptora-working-progress mt-2.5 h-1 overflow-hidden rounded-full border border-white/8 bg-black/20 sm:mt-3 sm:h-1.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 via-sky-400/80 to-violet-400/80 transition-[width] duration-700 ease-out"
              style={{ width: `${visualProgress}%` }}
            />
          </div>

          {showStepGrid && !denseMobile && (
            <ul className="scriptora-working-steps mt-3 grid gap-1.5 sm:grid-cols-2">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const done = index < stepIndex;
                return (
                  <li
                    key={step}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors",
                      active
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : done
                          ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-100/80"
                          : "border-white/8 bg-white/[0.03] text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        active ? "animate-pulse bg-primary" : done ? "bg-emerald-400" : "bg-white/25",
                      )}
                    />
                    <span className="truncate">{step}</span>
                  </li>
                );
              })}
            </ul>
          )}

          {showMobileStepRail && (
            <ul className="scriptora-working-steps scriptora-working-steps--rail mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 sm:mt-3">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const done = index < stepIndex;
                if (!active && !done && steps.length > 4) return null;
                return (
                  <li
                    key={step}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium whitespace-nowrap transition-colors",
                      active
                        ? "border-primary/45 bg-primary/12 text-foreground shadow-sm shadow-primary/10"
                        : done
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100/85"
                          : "border-white/10 bg-white/[0.04] text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        active ? "animate-pulse bg-primary" : done ? "bg-emerald-400" : "bg-white/30",
                      )}
                    />
                    {step}
                  </li>
                );
              })}
            </ul>
          )}

          {slow && (
            <p className="mt-2.5 text-[10px] leading-5 text-amber-100/80 sm:mt-3 sm:text-[11px]">
              Sta richiedendo più tempo del previsto, ma il processo è ancora attivo. Non chiudere questa schermata.
            </p>
          )}
        </>
      )}
    </div>
  );
}
