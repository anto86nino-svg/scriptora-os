import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, GraduationCap, Loader2, Sparkles, X } from "lucide-react";
import { explainStudyDictionaryTerm } from "@/lib/study-ai";
import type { DifficultWord } from "@/lib/study-session";
import type { StudyKernelPlan } from "@/lib/study-os/study-intelligence-kernel";
import {
  buildDictionaryIndex,
  formatDictionaryLookup,
  listDictionaryTerms,
  lookupDictionaryWithAI,
  type DictionaryExplainMode,
  type DictionaryLookupResult,
} from "@/lib/study-os/study-dictionary";

interface StudyDictionaryPopoverProps {
  difficultWords: DifficultWord[];
  keyConcepts?: string[];
  kernelPlan?: StudyKernelPlan | null;
  /** Compact chip list for summary/quiz panels */
  variant?: "chips" | "inline";
  materialContext?: string;
}

export function StudyDictionaryPopover({
  difficultWords,
  keyConcepts = [],
  kernelPlan,
  variant = "chips",
  materialContext,
}: StudyDictionaryPopoverProps) {
  const index = useMemo(
    () => buildDictionaryIndex(difficultWords, keyConcepts, kernelPlan),
    [difficultWords, keyConcepts, kernelPlan],
  );
  const terms = useMemo(() => listDictionaryTerms(index), [index]);
  const [mode, setMode] = useState<DictionaryExplainMode>("bambino");
  const [active, setActive] = useState<DictionaryLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActive(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [active]);

  async function openTerm(term: string) {
    setLoading(true);
    try {
      const lookup = await lookupDictionaryWithAI(index, term, mode, {
        context: materialContext,
        aiLookup: async ({ term: t, mode: m, local, context }) => {
          const result = await explainStudyDictionaryTerm({
            term: t,
            mode: m,
            localBody: local.body,
            localHeadline: local.headline,
            context,
          });
          return result;
        },
      });
      if (lookup) setActive(lookup);
    } finally {
      setLoading(false);
    }
  }

  async function switchMode(next: DictionaryExplainMode) {
    setMode(next);
    if (!active) return;
    setLoading(true);
    try {
      const lookup = await lookupDictionaryWithAI(index, active.entry.term, next, {
        context: materialContext,
        aiLookup: async ({ term, mode: m, local, context }) =>
          explainStudyDictionaryTerm({
            term,
            mode: m,
            localBody: local.body,
            localHeadline: local.headline,
            context,
          }),
      });
      if (lookup) setActive(lookup);
    } finally {
      setLoading(false);
    }
  }

  if (!terms.length) return null;

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-200/80">
          Dizionario intelligente
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => void switchMode("bambino")}
            className={[
              "min-h-[36px] rounded-xl px-2.5 py-1.5 text-[11px] font-semibold",
              mode === "bambino" ? "bg-emerald-300 text-slate-950" : "border border-white/10 bg-white/[0.04] text-muted-foreground",
            ].join(" ")}
          >
            <BookOpen className="mr-1 inline h-3 w-3" />
            10 anni
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void switchMode("universitario")}
            className={[
              "min-h-[36px] rounded-xl px-2.5 py-1.5 text-[11px] font-semibold",
              mode === "universitario" ? "bg-emerald-300 text-slate-950" : "border border-white/10 bg-white/[0.04] text-muted-foreground",
            ].join(" ")}
          >
            <GraduationCap className="mr-1 inline h-3 w-3" />
            Universitario
          </button>
        </div>
      </div>

      <div className={variant === "inline" ? "mt-2 flex flex-wrap gap-1.5" : "mt-3 flex flex-wrap gap-2"}>
        {terms.slice(0, variant === "inline" ? 8 : 16).map((entry) => (
          <button
            key={entry.term}
            type="button"
            disabled={loading}
            onClick={() => void openTerm(entry.term)}
            className="min-h-[40px] rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 active:scale-[0.98] disabled:opacity-60"
          >
            {entry.term}
            {entry.source === "kernel" && (
              <span className="ml-1 text-[10px] text-emerald-200/60">★</span>
            )}
          </button>
        ))}
      </div>

      {active && (
        <div
          ref={popoverRef}
          className="study-fade-in absolute left-0 right-0 z-20 mt-3 rounded-2xl border border-white/15 bg-background/95 p-4 shadow-2xl backdrop-blur-xl sm:left-auto sm:right-0 sm:max-w-md"
          role="dialog"
          aria-label={`Definizione: ${active.entry.term}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-lg font-bold text-foreground">{active.entry.term}</p>
              <p className="text-[11px] font-semibold text-emerald-200/90">{active.headline}</p>
              {active.source === "ai" && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-sky-200/90">
                  <Sparkles className="h-3 w-3" /> Arricchito con AI
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 text-muted-foreground"
              aria-label="Chiudi"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
              Sto preparando la spiegazione...
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-foreground/90">{active.body}</p>
          )}
          <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs text-muted-foreground">
            <p><span className="font-semibold text-emerald-200/90">Semplice: </span>{active.entry.semplice}</p>
            <p><span className="font-semibold text-emerald-200/90">Tecnica: </span>{active.entry.tecnica}</p>
            <p><span className="font-semibold text-emerald-200/90">Esempio: </span>{active.entry.esempio}</p>
            {active.entry.sinonimi.length > 0 && (
              <p><span className="font-semibold text-emerald-200/90">Sinonimi: </span>{active.entry.sinonimi.join(", ")}</p>
            )}
            {active.entry.collegamenti.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {active.entry.collegamenti.map((c) => (
                  <button
                    key={c}
                    type="button"
                    disabled={loading}
                    onClick={() => void openTerm(c)}
                    className="min-h-[32px] rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px]"
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
