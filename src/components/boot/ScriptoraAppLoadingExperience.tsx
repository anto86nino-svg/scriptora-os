import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { APP_ENTRY_FAILOPEN_MS, APP_ENTRY_MIN_MS } from "@/lib/app-entry-loading";
import { cn } from "@/lib/utils";

const STAGES = [
  { until: 20, label: "Accendo Scriptora OS…" },
  { until: 40, label: "Carico il tuo spazio creativo…" },
  { until: 60, label: "Sincronizzo progetti e strumenti…" },
  { until: 80, label: "Preparo Writer, KDP, Radar e Cover Studio…" },
  { until: 100, label: "Apro il tuo studio editoriale…" },
] as const;

type Props = {
  authReady: boolean;
  onComplete: () => void;
};

export function ScriptoraAppLoadingExperience({ authReady, onComplete }: Props) {
  const startedAt = useRef(Date.now());
  const completedRef = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(4);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const activeStage = STAGES.find((s) => progress < s.until) ?? STAGES[STAGES.length - 1];
  const canFailOpen = elapsed >= APP_ENTRY_FAILOPEN_MS;
  const showSlowHint = elapsed >= APP_ENTRY_MIN_MS && !authReady;

  useEffect(() => {
    const tick = () => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);

      const timeRatio = Math.min(1, ms / APP_ENTRY_MIN_MS);
      const target = authReady && ms >= APP_ENTRY_MIN_MS
        ? 100
        : Math.min(96, 8 + timeRatio * 88);

      setProgress((prev) => Math.max(prev, target));

      if (!completedRef.current && ms >= APP_ENTRY_MIN_MS && authReady) {
        completedRef.current = true;
        setProgress(100);
        window.setTimeout(onComplete, reducedMotion ? 80 : 420);
      }
    };

    tick();
    const id = window.setInterval(tick, 120);
    return () => window.clearInterval(id);
  }, [authReady, onComplete, reducedMotion]);

  const handleEnterNow = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setProgress(100);
    onComplete();
  };

  return (
    <div
      className="scriptora-app-loading fixed inset-0 z-[200] flex min-h-[100dvh] flex-col items-center justify-center bg-[#02030a] px-4 pb-safe pt-safe text-white"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="scriptora-app-loading-glow" aria-hidden="true" />

      <div className="scriptora-app-loading-card w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="scriptora-app-loading-orbit flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5">
            <Sparkles className="h-5 w-5 text-cyan-200" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-200/80">Scriptora OS</p>
            <p className="text-sm font-semibold text-white/90">Preparo il tuo universo creativo</p>
          </div>
        </div>

        <div className="scriptora-app-loading-track h-2 overflow-hidden rounded-full border border-white/10 bg-black/30">
          <div
            className={cn(
              "h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 transition-[width] duration-300 ease-out",
              !reducedMotion && progress < 100 && "scriptora-app-loading-bar-pulse",
            )}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] tabular-nums text-white/55">
          <span className="min-w-0 flex-1 break-words font-medium text-white/78">{activeStage.label}</span>
          <span>{Math.round(progress)}%</span>
        </div>

        {showSlowHint && (
          <p className="mt-3 text-[11px] leading-5 text-amber-100/75">
            Sto sincronizzando la sessione… quasi pronto.
          </p>
        )}

        {canFailOpen && (
          <div className="mt-5 rounded-xl border border-white/12 bg-white/[0.04] p-3 text-center">
            <p className="text-xs leading-5 text-white/65">
              Sto impiegando più del previsto. Puoi entrare comunque.
            </p>
            <button
              type="button"
              onClick={handleEnterNow}
              className="mt-3 inline-flex h-10 min-w-[140px] items-center justify-center rounded-lg bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
            >
              Entra ora
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
