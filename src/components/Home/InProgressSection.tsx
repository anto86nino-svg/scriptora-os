import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ArrowRight, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { loadProjects, getCurrentUserId, deleteProjectAsync } from "@/services/storageService";
import { BookProject } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";
import { t, tt, useUILanguage } from "@/lib/i18n";

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

/**
 * Shows books currently being generated:
 *  - Active SSE runs (auto_bestseller_runs.status = 'running')
 *  - Local partial projects whose phase is not yet 'complete'
 */
export function InProgressSection({ refreshKey = 0 }: Props) {
  useUILanguage();
  const navigate = useNavigate();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [drafts, setDrafts] = useState<BookProject[]>([]);
  const [scopeTick, setScopeTick] = useState(0);

  const deleteDraft = async (projectId: string, title?: string) => {
    const name = title || t("this_draft");
    const ok = window.confirm(tt("confirm_delete_draft", { name }));
    if (!ok) return;

    await deleteProjectAsync(projectId);
    setDrafts((items) => items.filter((p) => p.id !== projectId));
    window.dispatchEvent(new Event("nexora-projects-change"));
  };

  useEffect(() => {
    const onScope = () => {
      setRuns([]);
      setDrafts([]);
      setScopeTick((t) => t + 1);
    };
    window.addEventListener("nexora-dev-mode-change", onScope);
    return () => window.removeEventListener("nexora-dev-mode-change", onScope);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("auto_bestseller_runs")
          .select("id, input, status, progress, created_at, updated_at")
          .eq("status", "running")
          .eq("user_id", getCurrentUserId())
          .order("updated_at", { ascending: false })
          .limit(10);
        if (!cancelled) setRuns((data as any) || []);
      } catch {
        if (!cancelled) setRuns([]);
      }
      try {
        const all = await loadProjects();
        if (!cancelled) {
          // Only true drafts: not complete AND have at least one chapter started.
          setDrafts(
            all.filter((p) => !isProjectComplete(p) && (p.chapters?.length || 0) > 0),
          );
        }
      } catch {
        if (!cancelled) setDrafts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, scopeTick]);

  if (runs.length === 0 && drafts.length === 0) return null;

  const totalCount = runs.length + drafts.length;

  return (
    <div className="mb-6">
      <p className="px-1 mb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-primary" />
        {t("in_progress")} ({totalCount})
      </p>
      <div className="space-y-2">
        {runs.map((r) => {
          const chaptersDone = countChaptersDone(r.progress);
          const total = r.input?.numberOfChapters || estimateTotal(r.progress) || 8;
          const pct = Math.min(100, Math.round((chaptersDone / Math.max(1, total)) * 100));
          const title =
            r.input?.prefilledTitle ||
            (r.input?.idea ? r.input.idea.slice(0, 70) : t("generating_book"));
          return (
            <button
              key={r.id}
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
          );
        })}

        {drafts.map((p) => {
          const total = p.config.numberOfChapters || p.chapters.length;
          const done = p.chapters.length;
          const pct = Math.min(100, Math.round((done / Math.max(1, total)) * 100));
          return (
            <div
              key={p.id}
              className="group flex w-full items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-left transition-colors hover:border-amber-500/60 hover:bg-amber-500/10"
            >
              <button
                type="button"
                onClick={() => {
                  sessionStorage.setItem("nexora-open-project", p.id);
                  navigate("/app");
                }}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left"
              >
                <Save className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{p.config.title || t("untitled")}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-foreground/80">
                      {pct}%
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {t("draft")} · {done}/{total}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>

              <button
                type="button"
                aria-label={t("delete_draft")}
                title={t("delete_draft")}
                onClick={() => deleteDraft(p.id, p.config.title)}
                className="shrink-0 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-destructive opacity-80 transition hover:bg-destructive/10 hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
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
