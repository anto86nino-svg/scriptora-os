import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { hasAutoBestsellerCloud } from "@/lib/supabase-cloud-capabilities";
import { getCurrentUserId } from "@/services/storageService";
import { t, useUILanguage } from "@/lib/i18n";

interface RunRow {
  id: string;
  input: { idea?: string; prefilledTitle?: string; numberOfChapters?: number };
  status: string;
  progress: any;
  created_at: string;
  updated_at: string;
}

interface Props {
  /** Bumped from outside to force refresh (e.g. after returning from /auto-bestseller). */
  refreshKey?: number;
}

/** Shows a single auto-bestseller run when generation is live — not local drafts. */
export function InProgressSection({ refreshKey = 0 }: Props) {
  useUILanguage();
  const navigate = useNavigate();
  const [run, setRun] = useState<RunRow | null>(null);
  const [scopeTick, setScopeTick] = useState(0);

  useEffect(() => {
    const onScope = () => {
      setRun(null);
      setScopeTick((t) => t + 1);
    };
    window.addEventListener("nexora-dev-mode-change", onScope);
    return () => window.removeEventListener("nexora-dev-mode-change", onScope);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!(await hasAutoBestsellerCloud())) return;
        const { data } = await supabase
          .from("auto_bestseller_runs")
          .select("id, input, status, progress, created_at, updated_at")
          .eq("status", "running")
          .eq("user_id", getCurrentUserId())
          .order("updated_at", { ascending: false })
          .limit(1);
        if (!cancelled) setRun(((data as RunRow[] | null)?.[0] as RunRow) || null);
      } catch {
        if (!cancelled) setRun(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, scopeTick]);

  if (!run) return null;

  const chaptersDone = countChaptersDone(run.progress);
  const total = run.input?.numberOfChapters || estimateTotal(run.progress) || 8;
  const pct = Math.min(100, Math.round((chaptersDone / Math.max(1, total)) * 100));
  const title =
    run.input?.prefilledTitle ||
    (run.input?.idea ? run.input.idea.slice(0, 70) : t("generating_book"));

  return (
    <div className="mb-6">
      <p className="px-1 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        {t("generation_running")}
      </p>
      <button
        onClick={() => navigate("/auto-bestseller")}
        className="group flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/10"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-foreground/80">
              {pct}%
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
              {chaptersDone}/{total}
            </span>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    </div>
  );
}

function countChaptersDone(progress: any): number {
  if (!Array.isArray(progress)) return 0;
  const seen = new Set<number>();
  for (const e of progress) {
    if (e?.type === "chapter" && e?.phase === "done" && typeof e.index === "number") {
      seen.add(e.index);
    }
  }
  return seen.size;
}

function estimateTotal(progress: any): number {
  if (!Array.isArray(progress)) return 0;
  for (const e of progress) {
    if (e?.type === "chapter" && typeof e.total === "number") return e.total;
  }
  return 0;
}
