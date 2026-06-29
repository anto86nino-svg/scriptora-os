import { useMemo } from "react";
import { evaluateMemorability } from "@/lib/writer/memorability-engine";
import { getLatestWriterPerformance } from "@/lib/writer/writer-performance-metrics";
import type { BookConfig } from "@/types/book";
import { cn } from "@/lib/utils";

interface EditorScoreProProps {
  content: string;
  chapterIndex: number;
  config: BookConfig;
  className?: string;
}

const SCORE_LABELS: Array<{ key: keyof ReturnType<typeof evaluateMemorability>["scores"]; label: string }> = [
  { key: "narrativeQuality", label: "Qualità narrativa" },
  { key: "originality", label: "Originalità" },
  { key: "memorability", label: "Memorabilità" },
  { key: "dialogue", label: "Dialoghi" },
  { key: "tension", label: "Tensione" },
  { key: "coherence", label: "Coerenza" },
  { key: "rhythm", label: "Ritmo" },
  { key: "repetitions", label: "Ripetizioni" },
];

function scoreTone(value: number): string {
  if (value >= 75) return "text-emerald-300";
  if (value >= 58) return "text-amber-200";
  return "text-rose-300";
}

export function EditorScorePro({ content, chapterIndex, config, className }: EditorScoreProProps) {
  const report = useMemo(
    () => evaluateMemorability(content, {
      language: config.language,
      genre: config.genre,
      bookTitle: config.title,
      chapterIndex,
      config,
    }),
    [content, chapterIndex, config],
  );

  const metrics = getLatestWriterPerformance(chapterIndex);

  if (!content.trim()) return null;

  return (
    <section className={cn("rounded-2xl border border-white/10 bg-white/[0.03] p-4", className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50">Editor Score Pro</p>
        <div className="flex items-center gap-2">
          {report.provisional && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              Provvisorio
            </span>
          )}
          {metrics && (
            <span className="text-[10px] text-white/40">
              {metrics.repairType !== "none" ? `Riparazione: ${metrics.repairType}` : "Nessuna riparazione"}
              {metrics.retryCount > 0 ? ` · ${metrics.retryCount} retry` : ""}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SCORE_LABELS.map(({ key, label }) => (
          <div key={key} className="rounded-xl border border-white/[0.08] bg-black/20 px-2.5 py-2">
            <p className="truncate text-[9px] uppercase tracking-wider text-white/45">{label}</p>
            <p className={cn("text-lg font-bold tabular-nums", scoreTone(report.scores[key]))}>
              {report.scores[key]}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-200/80">Problemi reali</p>
          <ul className="space-y-1 text-xs text-white/70">
            {(report.problems.length ? report.problems : ["Nessun problema critico rilevato."]).map((item) => (
              <li key={item} className="leading-relaxed">• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200/80">Miglioramenti consigliati</p>
          <ul className="space-y-1 text-xs text-white/70">
            {report.improvements.map((item) => (
              <li key={item} className="leading-relaxed">• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
