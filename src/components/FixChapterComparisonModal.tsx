import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Shield, Sparkles, X } from "lucide-react";
import type { DevelopmentalEditReport } from "@/lib/chapter-doctor-pro";

type PatchSummary = {
  idx: number;
  original: string;
  patched: string;
  type: string;
  reason: string;
};

type PatchResultSummary = {
  patches: PatchSummary[];
  evaluation?: {
    score: number;
    strengths: string[];
    improvements: string[];
    commercialLevel: string;
  } | null;
  originalText: string;
  patchedText: string;
  totalParagraphs: number;
  modificationPercent: number;
};

type MetricDelta = {
  label: string;
  before: number;
  after: number;
  delta: number;
};

interface Props {
  patchResult: PatchResultSummary;
  report?: DevelopmentalEditReport;
  beforeScore: number | null;
  afterScore: number | null;
  scoreDelta?: number | null;
  deltaMode?: "visible" | "refinement" | "minimal";
  metrics: MetricDelta[];
  explanations: string[];
  onApply: () => void;
  onClose: () => void;
  onRevert?: () => void;
}

function splitTokens(value: string): string[] {
  return value.split(/(\s+|[.,;:!?()\[\]{}“”"'«»]+)/).filter(Boolean);
}

function buildWordDiff(oldText: string, newText: string) {
  const oldTokens = splitTokens(oldText);
  const newTokens = splitTokens(newText);
  const m = oldTokens.length;
  const n = newTokens.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (oldTokens[i] === newTokens[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const result: Array<{ type: "equal" | "removed" | "added"; text: string }> = [];
  let i = 0;
  let j = 0;

  while (i < m && j < n) {
    if (oldTokens[i] === newTokens[j]) {
      result.push({ type: "equal", text: oldTokens[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: "removed", text: oldTokens[i] });
      i += 1;
    } else {
      result.push({ type: "added", text: newTokens[j] });
      j += 1;
    }
  }

  while (i < m) {
    result.push({ type: "removed", text: oldTokens[i] });
    i += 1;
  }
  while (j < n) {
    result.push({ type: "added", text: newTokens[j] });
    j += 1;
  }

  return result;
}

function renderDiffLine(text: string, compareText: string, side: "original" | "patched") {
  const diff = buildWordDiff(side === "original" ? text : compareText, side === "original" ? compareText : text);
  return (
    <p className="text-sm leading-7 text-foreground/90 break-words whitespace-pre-wrap">
      {diff.map((token, index) => {
        if (token.type === "equal") {
          return <span key={index}>{token.text}</span>;
        }
        if (token.type === "removed" && side === "original") {
          return (
            <span key={index} className="rounded-md bg-rose-500/10 text-rose-600 line-through">
              {token.text}
            </span>
          );
        }
        if (token.type === "added" && side === "patched") {
          return (
            <span key={index} className="rounded-md bg-emerald-500/10 text-emerald-700 font-semibold">
              {token.text}
            </span>
          );
        }
        return <span key={index}>{token.text}</span>;
      })}
    </p>
  );
}

export default function FixChapterComparisonModal({
  patchResult,
  report,
  beforeScore,
  afterScore,
  scoreDelta,
  deltaMode = "minimal",
  metrics,
  explanations,
  onApply,
  onClose,
  onRevert,
}: Props) {
  const [activePanel, setActivePanel] = useState<"before" | "after">("before");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const patchMap = useMemo(() => {
    return new Map(patchResult.patches.map(p => [p.idx, p]));
  }, [patchResult.patches]);

  const paragraphs = useMemo(() => {
    return patchResult.originalText.split(/\n\s*\n/).map(p => p.trim());
  }, [patchResult.originalText]);

  const patchedParagraphs = useMemo(() => {
    return patchResult.patchedText.split(/\n\s*\n/).map(p => p.trim());
  }, [patchResult.patchedText]);

  const panelText = (side: "before" | "after") => {
    const source = side === "before" ? paragraphs : patchedParagraphs;
    return source.map((paragraph, index) => {
      const patch = patchMap.get(index);
      const isChanged = Boolean(patch);
      return (
        <div
          key={`${side}-${index}`}
          className={`rounded-3xl border p-4 ${isChanged ? "border-primary/20 bg-primary/5 shadow-sm" : "border-border/20 bg-background"}`}
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground">¶{index + 1}</p>
              {isChanged ? (
                <p className="text-[11px] font-semibold text-primary">Editorial change</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">Unchanged</p>
              )}
            </div>
            {isChanged && (
              <span className="rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-primary bg-primary/10">
                {PATCH_TYPE_LABELS[patch?.type as string] || patch?.type}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {isChanged ? renderDiffLine(side === "before" ? patch.original : patch.patched, side === "before" ? patch.patched : patch.original, side) : (
              <p className="text-sm leading-7 text-foreground/85 whitespace-pre-wrap">{paragraph}</p>
            )}
            {isChanged && (
              <p className="text-[11px] italic text-muted-foreground mt-1">{humanizeExplanation(patch.reason)}</p>
            )}
          </div>
        </div>
      );
    });
  };

  const metricRows = metrics.length > 0 ? metrics : [];
  const deltaVisible = deltaMode === "visible" && typeof scoreDelta === "number" && Math.abs(scoreDelta) >= 0.1;
  const heroHighlights = report?.heroHighlights ?? [];
  const interventions = report?.interventions ?? [];
  const modificationSummary = report?.modificationSummary;

  function humanizeExplanation(text: string | undefined) {
    if (!text) return "Editorial refinement.";
    const lower = text.toLowerCase();
    if (lower.includes("ripet") || lower.includes("repeat")) return "Reduced repetition and tightened pacing while preserving emotional rhythm.";
    if (lower.includes("accorc") || lower.includes("shorten")) return "Tightened sentences to improve rhythm and readability.";
    if (lower.includes("sostitu") || lower.includes("replace")) return "Strengthened flow and reduced redundancy to improve readability.";
    return text.charAt(0).toUpperCase() + text.slice(1) + ".";
  }

  const PATCH_TYPE_LABELS: Record<string, string> = {
    tighten: "Compressing repetitive beats",
    rewrite: "Reducing emotional over-explanation",
    compress: "Reducing emotional over-explanation",
    intensify: "Preserving romantic tension",
    "strengthen-dialogue": "Strengthening dialogue realism",
    "remove-redundancy": "Compressing repetitive beats",
    "forced-editorial": "Precision editorial polish",
    remove: "Removed",
  };

  const isHighScoreRefinement = deltaMode === "refinement" && beforeScore !== null && scoreDelta !== null && beforeScore >= 9.5 && Math.abs(scoreDelta) < 0.35;
  const modificationLabel = modificationSummary || (deltaMode === "visible"
    ? `${patchResult.modificationPercent}% strengthened`
    : patchResult.modificationPercent >= 20
    ? `${patchResult.modificationPercent}% editorially refined`
    : patchResult.modificationPercent >= 10
    ? `${patchResult.modificationPercent}% precision refinement`
    : `${Math.max(1, Math.round(patchResult.modificationPercent / 10))} editorial micro-optimizations applied`);

  const refinementHighlights = useMemo(() => {
    const categories = new Map<string, string>();

    const normalize = (value: string) => value.toLowerCase();
    const matches = (value: string, patterns: RegExp[]) => patterns.some(pattern => pattern.test(value));

    for (const patch of patchResult.patches) {
      const reason = normalize(patch.reason || "");
      const type = normalize(patch.type || "");
      let category = "Editorial polish";

      if (type === "compress" || matches(reason, [/ripet/, /redund/, /repeat/, /ridond/, /ripetizione/])) {
        category = "Redundancy reduction";
      } else if (type === "tighten" || matches(reason, [/pacing/, /rhythm/, /ritmo/, /tempo/, /scorre/, /snellezz/, /compressione/])) {
        category = "Pacing compression";
      } else if (type === "rewrite" && matches(reason, [/dialogue/, /dialoghi/, /convers/, /speech/, /stacco/])) {
        category = "Dialogue tightening";
      } else if (matches(reason, [/dialogue/, /dialoghi/, /convers/, /speech/])) {
        category = "Dialogue tightening";
      } else if (matches(reason, [/readab/, /clarit/, /leggibil/, /scorrevolezza/, /comprens/, /phrasing/, /sentence/, /frase/])) {
        category = "Readability improvement";
      } else if (matches(reason, [/emot/, /emotion/, /feeling/, /tone/, /impatto/, /sentiment/, /pathos/])) {
        category = "Emotional clarity";
      } else if (matches(reason, [/flow/, /structure/, /transit/, /scena/, /sequenza/, /ordine/, /arrangiamento/, /flusso/])) {
        category = "Structural flow";
      } else if (type === "intensify") {
        category = "Emotional clarity";
      } else if (type === "remove") {
        category = "Redundancy reduction";
      }

      categories.set(category, category);
    }

    return Array.from(categories.values()).slice(0, 6);
  }, [patchResult.patches]);

  return (
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-lg text-white overflow-hidden pb-safe pt-safe">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_25%)] pointer-events-none" />
      <div className="relative mx-auto scriptora-surgical-edit-shell flex h-[100dvh] min-h-0 max-w-[1600px] md:min-w-[720px] flex-col overflow-hidden p-3 md:p-6">
        <div className="flex shrink-0 flex-col gap-4 rounded-[36px] border border-white/10 bg-[#0c1223]/95 shadow-[0_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl p-4 sm:p-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">Surgical Edit Engine</span>
              <span className="rounded-full bg-emerald-500/10 text-emerald-300 px-3 py-1 text-[10px] uppercase tracking-[0.3em] font-semibold">Developmental Editor</span>
            </div>
            <div>
              <p className="text-base uppercase tracking-[0.35em] text-white/40 font-bold">Your writing, improved</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Surgical Edit Review</h1>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-white/70">
              Targeted editorial pass complete. Compare before and after, read why each change was made, and apply only if you agree.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-black shadow-[0_20px_70px_rgba(16,185,129,0.22)] transition hover:bg-emerald-400"
            >
              <Check className="h-4 w-4" /> Apply changes
            </button>
            <button
              onClick={() => {
                onRevert?.();
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" /> Keep original
            </button>
          </div>
        </div>

        <div className="mt-4 md:mt-6 grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain lg:grid-cols-[1.3fr_1fr] lg:overflow-hidden">
          <div className="space-y-4 min-w-0">
            {isHighScoreRefinement ? (
              <div className="grid gap-3">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Refinement score</p>
                  <div className="mt-4 flex items-end gap-3">
                    <p className="text-6xl font-black text-white">{beforeScore?.toFixed(1) ?? "—"}</p>
                    <p className="text-sm uppercase tracking-[0.35em] text-white/60">/ 10</p>
                  </div>
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100">
                    ✨ Editorial refinement completed
                  </span>
                  <p className="mt-4 text-sm leading-6 text-white/70 max-w-xl">
                    Chapter already very strong. Scriptora applied precision editorial optimizations for pacing, redundancy, clarity, emotional rhythm and readability.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">Before</p>
                    <p className="mt-4 text-5xl font-black text-rose-300">{beforeScore?.toFixed(1) ?? "—"}</p>
                    <p className="text-xs text-white/50 mt-1">Editorial quality</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">After</p>
                    <p className="mt-4 text-5xl font-black text-emerald-300">{afterScore?.toFixed(1) ?? "—"}</p>
                    <p className="text-xs text-white/50 mt-1">Projected improvement</p>
                  </div>
                </div>

                {heroHighlights.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {heroHighlights.map(item => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-200"
                      >
                        {item.pctChange !== null && item.pctChange > 0 ? `+${item.pctChange}%` : `+${item.delta.toFixed(1)}`}
                        {" "}
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Score delta</p>
                  <p className="mt-2 text-3xl font-black text-white">{deltaVisible ? `${scoreDelta! > 0 ? "+" : ""}${scoreDelta!.toFixed(1)}` : deltaMode === "refinement" ? "Editorial refinement completed" : "Minimal editorial change"}</p>
                </div>
                <div className="rounded-3xl bg-primary/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                  {modificationLabel}
                </div>
              </div>
              <p className="mt-3 text-sm text-white/60">Edits: {patchResult.patches.length} / {patchResult.totalParagraphs} paragraphs</p>
            </div>

            {interventions.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">What changed</p>
                <div className="space-y-3">
                  {interventions.map(item => (
                    <div key={item.id} className="flex items-start gap-3 rounded-3xl border border-white/10 bg-black/10 p-3">
                      <Check className="h-4 w-4 text-emerald-300 mt-1 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-white">{item.summary}</p>
                        <p className="text-[12px] leading-5 text-white/65 mt-1">{item.explanation}</p>
                        {item.patchCount > 1 && (
                          <p className="text-[11px] text-white/50 mt-0.5">{item.patchCount} paragraphs touched</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report?.credibilityStats && report.credibilityStats.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">Visible impact</p>
                <div className="flex flex-wrap gap-2">
                  {report.credibilityStats.map(stat => (
                    <span
                      key={stat.label}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs font-medium text-white/85"
                    >
                      <span className="text-white/50">{stat.label}:</span>
                      <span className="font-bold text-emerald-200">{stat.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {deltaMode === "refinement" && refinementHighlights.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">Refinement highlights</p>
                <div className="space-y-3">
                  {refinementHighlights.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-3xl border border-white/10 bg-black/10 p-3">
                      <Check className="h-4 w-4 text-emerald-300 mt-1" />
                      <p className="text-sm text-white/80">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {metricRows.length > 0 && (
              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">Editorial metrics</p>
                <div className="space-y-3">
                  {metricRows.map(metric => {
                    const pct = metric.before > 0 ? Math.round(((metric.after - metric.before) / metric.before) * 100) : null;
                    return (
                    <div key={metric.label} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/10 p-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{metric.label}</p>
                        <p className="text-xs text-white/60">{metric.before.toFixed(1)} → {metric.after.toFixed(1)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${metric.delta >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                        {pct !== null && pct > 0 ? `+${pct}%` : `${metric.delta >= 0 ? "+" : ""}${metric.delta.toFixed(1)}`}
                      </span>
                    </div>
                  )})}
                </div>
              </div>
            )}

            <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">Why Scriptora changed this</p>
              <div className="space-y-3">
                {explanations.map((item, index) => (
                  <div key={index} className="rounded-3xl border border-white/10 bg-black/10 p-3">
                    <p className="text-sm leading-6 text-white/80">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex min-h-[280px] flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#09101f]/95 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)] lg:min-h-0">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Confronto testuale</p>
                <p className="text-sm text-white/70">Visualizza prima e dopo in un layout editoriale</p>
              </div>
              {isMobile ? (
                <div className="inline-flex rounded-full bg-white/5 p-1 text-[10px] text-white/70">
                  <button
                    onClick={() => setActivePanel("before")}
                    className={`px-3 py-2 rounded-full ${activePanel === "before" ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
                  >
                    Prima
                  </button>
                  <button
                    onClick={() => setActivePanel("after")}
                    className={`px-3 py-2 rounded-full ${activePanel === "after" ? "bg-white/10 text-white" : "hover:bg-white/5"}`}
                  >
                    Dopo
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex-1 overflow-hidden">
              <div className={`grid h-full ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                <div className={`${isMobile && activePanel !== "before" ? "hidden" : "block"} overflow-y-auto border-r border-white/10 p-5`}>
                  <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-[0.2em] text-rose-300 font-bold">
                    <Shield className="h-4 w-4" /> Versione originale
                  </div>
                  <div className="space-y-4">{panelText("before")}</div>
                </div>
                <div className={`${isMobile && activePanel !== "after" ? "hidden" : "block"} overflow-y-auto p-5`}>
                  <div className="flex items-center gap-2 mb-4 text-xs uppercase tracking-[0.2em] text-emerald-300 font-bold">
                    <Sparkles className="h-4 w-4" /> Versione migliorata
                  </div>
                  <div className="space-y-4">{panelText("after")}</div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 px-5 py-4 bg-[#070a13]/95 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-white/50">Renderizzato in sicurezza</p>
                <p className="text-sm text-white/60 mt-1">Il testo originale resta intatto finché non confermi.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActivePanel(prev => (prev === "before" ? "after" : "before"))}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 hover:bg-white/10 transition"
                >
                  {activePanel === "before" ? (
                    <><ChevronRight className="h-3.5 w-3.5" /> Mostra Dopo</>
                  ) : (
                    <><ChevronLeft className="h-3.5 w-3.5" /> Mostra Prima</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
