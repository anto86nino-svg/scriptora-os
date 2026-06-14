import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  resolveRouteTransitionConfig,
  resolveRotatingStep,
  type ScriptoraAliveTone,
} from "@/lib/scriptora-route-transition";
import { cn } from "@/lib/utils";

export type ScriptoraAliveTransitionProps = {
  route?: string;
  title?: string;
  description?: string;
  steps?: string[];
  compact?: boolean;
  overlay?: boolean;
  minHeight?: string;
  tone?: ScriptoraAliveTone;
};

const TONE_ACCENT: Record<ScriptoraAliveTone, string> = {
  dashboard: "from-cyan-400/80 via-violet-400/70 to-fuchsia-400/80",
  writer: "from-cyan-300/80 via-sky-400/70 to-blue-400/80",
  kdp: "from-violet-400/80 via-fuchsia-400/70 to-pink-400/80",
  radar: "from-amber-300/80 via-orange-400/70 to-rose-400/80",
  cover: "from-amber-300/80 via-yellow-400/70 to-orange-400/80",
  study: "from-emerald-300/80 via-teal-400/70 to-cyan-400/80",
  pricing: "from-sky-300/80 via-indigo-400/70 to-violet-400/80",
  auth: "from-slate-300/80 via-cyan-400/70 to-violet-400/80",
  export: "from-primary/80 via-cyan-400/70 to-violet-400/80",
  default: "from-cyan-400/80 via-violet-400/70 to-fuchsia-400/80",
};

const STEP_INTERVAL_MS = 1500;

export function ScriptoraAliveTransition({
  route,
  title,
  description,
  steps,
  compact = false,
  overlay = false,
  minHeight,
  tone,
}: ScriptoraAliveTransitionProps) {
  const location = useLocation();
  const pathname = route ?? location.pathname;
  const resolved = useMemo(() => resolveRouteTransitionConfig(pathname), [pathname]);
  const effectiveTone = tone ?? resolved.tone;
  const effectiveTitle = title ?? resolved.title;
  const effectiveSteps = steps ?? resolved.steps;
  const [stepIndex, setStepIndex] = useState(0);

  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    setStepIndex(0);
  }, [pathname, effectiveTitle]);

  useEffect(() => {
    if (reducedMotion || effectiveSteps.length <= 1) return;
    const id = window.setInterval(() => {
      setStepIndex((prev) => prev + 1);
    }, STEP_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [effectiveSteps.length, reducedMotion, pathname]);

  const activeStep = description || resolveRotatingStep(effectiveSteps, stepIndex);
  const accent = TONE_ACCENT[effectiveTone];

  const card = (
    <div className={cn("scriptora-alive-card w-full", compact ? "max-w-sm" : "max-w-md")}>
      <div className={cn("flex items-center gap-3", compact ? "mb-4" : "mb-5")}>
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
          <span
            className={cn(
              "scriptora-alive-ring absolute inset-0 rounded-full border-2 border-transparent",
              `bg-gradient-to-tr ${accent}`,
              !reducedMotion && "opacity-70",
            )}
            aria-hidden="true"
          />
          <span className="scriptora-alive-orb relative flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#0a0b14]/90">
            <Sparkles className="h-4 w-4 text-cyan-200" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200/75">Scriptora OS</p>
          <p className={cn("font-semibold text-white/92", compact ? "text-sm" : "text-base")}>{effectiveTitle}</p>
        </div>
      </div>

      <div className="scriptora-alive-track h-1.5 overflow-hidden rounded-full border border-white/10 bg-black/30">
        <div
          className={cn(
            "scriptora-alive-bar h-full w-1/3 rounded-full bg-gradient-to-r",
            accent,
            !reducedMotion && "opacity-90",
          )}
          aria-hidden="true"
        />
      </div>

      <p
        className={cn(
          "mt-3 min-w-0 break-words leading-relaxed text-white/72",
          compact ? "text-[11px]" : "text-xs sm:text-sm",
        )}
      >
        {activeStep}
      </p>

      {!compact && effectiveSteps.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {effectiveSteps.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                index === stepIndex % effectiveSteps.length
                  ? "w-5 bg-cyan-300/90"
                  : "w-1.5 bg-white/20",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div
        className="scriptora-alive-overlay fixed inset-0 z-[80] grid place-items-center bg-background/75 px-4 backdrop-blur-sm"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="scriptora-alive-card-shell w-full max-w-md rounded-2xl border border-white/10 bg-[#06070f]/95 p-5 shadow-2xl">
          {card}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          "scriptora-alive-compact flex min-h-[200px] w-full max-w-full items-center justify-center px-4 py-8",
          minHeight,
        )}
        style={minHeight ? { minHeight } : undefined}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="scriptora-alive-card-shell w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg backdrop-blur-sm">
          {card}
        </div>
      </div>
    );
  }

  return (
    <div
      className="scriptora-route-transition bg-[#02030a] text-white"
      style={minHeight ? { minHeight } : undefined}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="scriptora-alive-glow" aria-hidden="true" />
      <div className="scriptora-alive-card-shell w-full rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl backdrop-blur-md sm:p-6">
        {card}
      </div>
    </div>
  );
}

export function RouteSuspenseFallback() {
  return <ScriptoraAliveTransition />;
}

export function routeFallback(pathname: string) {
  return <ScriptoraAliveTransition route={pathname} />;
}
