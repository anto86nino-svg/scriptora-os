import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Crown, Shield, Sparkles, X } from "lucide-react";

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
  beforeScore: number | null;
  afterScore: number | null;
  scoreDelta?: number | null;
  deltaMode?: "visible" | "refinement" | "minimal";
  metrics: MetricDelta[];
  explanations: string[];
  onApply: () => void;
  onClose: () => void;
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
  beforeScore,
  afterScore,
  scoreDelta,
  deltaMode = "minimal",
  metrics,
  explanations,
  onApply,
  onClose,
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

  function humanizeExplanation(text: string | undefined) {
    if (!text) return "Editorial refinement.";
    const lower = text.toLowerCase();
    if (lower.includes("ripet") || lower.includes("repeat")) return "Reduced repetition and tightened pacing while preserving emotional rhythm.";
    if (lower.includes("accorc") || lower.includes("shorten")) return "Tightened sentences to improve rhythm and readability.";
    if (lower.includes("sostitu") || lower.includes("replace")) return "Strengthened flow and reduced redundancy to improve readability.";
    return text.charAt(0).toUpperCase() + text.slice(1) + ".";
  }

  const PATCH_TYPE_LABELS: Record<string, string> = {
    tighten: "Refined",
    rewrite: "Reworked",
    compress: "Focused",
    intensify: "Emotional enhancement",
    remove: "Removed",
  };

  const isHighScoreRefinement = deltaMode === "refinement" && beforeScore !== null && scoreDelta !== null && beforeScore >= 9.7 && Math.abs(scoreDelta) < 0.2;
  const modificationSummary = deltaMode === "visible"
    ? `${patchResult.modificationPercent}% strengthened`
    : patchResult.modificationPercent >= 20
    ? `${patchResult.modificationPercent}% editorially refined`
    : patchResult.modificationPercent >= 10
    ? `${patchResult.modificationPercent}% precision refinement`
    : `${Math.max(1, Math.round(patchResult.modificationPercent / 10))} editorial micro-optimizations applied`;

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
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-lg text-white overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.18),transparent_25%)] pointer-events-none" />
      <div className="relative mx-auto flex h-screen max-w-[1600px] flex-col overflow-hidden p-4">
        <div className="flex items-start justify-between gap-4 rounded-[36px] border border-white/10 bg-[#0c1223]/95 shadow-[0_0_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl p-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white/70">AI Developmental Edit</span>
              <span className="rounded-full bg-emerald-500/10 text-emerald-300 px-3 py-1 text-[10px] uppercase tracking-[0.3em] font-semibold">Premium</span>
            </div>
            <div>
              <p className="text-base uppercase tracking-[0.35em] text-white/40 font-bold">AI Developmental Edit</p>
              <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Scriptora completed an editorial pass</h1>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-white/70">Review changes before updating your chapter.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onApply}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-bold text-black shadow-[0_20px_70px_rgba(16,185,129,0.22)] transition hover:bg-emerald-400"
            >
              <Check className="h-4 w-4" /> Apply improved version
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-4">
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
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Before</p>
                  <p className="mt-4 text-5xl font-black text-rose-300">{beforeScore?.toFixed(1) ?? "—"}</p>
                  <p className="text-xs text-white/50 mt-1">Editorial score</p>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">After</p>
                  <p className="mt-4 text-5xl font-black text-emerald-300">{afterScore?.toFixed(1) ?? "—"}</p>
                  <p className="text-xs text-white/50 mt-1">Expected improvement</p>
                </div>
              </div>
            )}

              <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-white/50">Score delta</p>
                  <p className="mt-2 text-3xl font-black text-white">{deltaVisible ? `${scoreDelta! > 0 ? "+" : ""}${scoreDelta!.toFixed(1)}` : deltaMode === "refinement" ? "Editorial refinement completed" : "Minimal editorial change"}</p>
                </div>
                <div className="rounded-3xl bg-primary/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                  {modificationSummary}
                </div>
              </div>
              <p className="mt-3 text-sm text-white/60">Edits: {patchResult.patches.length} / {patchResult.totalParagraphs} paragraphs</p>
            </div>

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
                <p className="text-xs uppercase tracking-[0.25em] text-white/50 mb-4">What's improved</p>
                <div className="space-y-3">
                  {metricRows.map(metric => (
                    <div key={metric.label} className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/10 p-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{metric.label}</p>
                        <p className="text-xs text-white/60">{metric.before.toFixed(1)} → {metric.after.toFixed(1)}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${metric.delta >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
                        {metric.delta >= 0 ? "+" : ""}{metric.delta.toFixed(1)}
                      </span>
                    </div>
                  ))}
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

          <div className="flex flex-col overflow-hidden rounded-[36px] border border-white/10 bg-[#09101f]/95 shadow-[inset_0_0_80px_rgba(255,255,255,0.02)]">
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
