import { useMemo, useState } from "react";
import { Library, ArrowRight, FileDown, Trash2, CheckCircle2, Save } from "lucide-react";
import { BookProject } from "@/types/book";
import { isProjectComplete, isOnFinishShelf } from "@/lib/project-status";
import { EditorialMasteryBadge } from "@/components/EditorialMasteryBadge";
import { t, tt, useUILanguage } from "@/lib/i18n";

interface Props {
  projects: BookProject[];
  activeWritingId?: string | null;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  /** When true, render an empty-state message instead of returning null. */
  allowEmpty?: boolean;
}

export function LibrarySection({
  projects,
  activeWritingId = null,
  onOpen,
  onDelete,
  onExport,
  allowEmpty = false,
}: Props) {
  useUILanguage();
  const [expanded, setExpanded] = useState(true);

  const shelfProjects = useMemo(
    () => projects.filter((p) => isOnFinishShelf(p, activeWritingId ?? null)),
    [projects, activeWritingId],
  );

  const completedCount = shelfProjects.filter(isProjectComplete).length;
  const pausedCount = shelfProjects.length - completedCount;

  if (shelfProjects.length === 0) {
    if (!allowEmpty) return null;
    return (
      <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-muted-foreground/70">
        {t("shelf_empty_hint")}
      </p>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Library className="h-3 w-3 text-emerald-500" />
          {t("completed_shelf_title")} ({shelfProjects.length})
        </button>
        <button
          onClick={onExport}
          className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <FileDown className="h-3 w-3" /> {t("export_label")}
        </button>
      </div>

      {expanded && (
        <div className="space-y-2">
          {shelfProjects.map((p) => {
            const complete = isProjectComplete(p);
            const ch = p.chapters?.length || 0;
            const target = p.config?.numberOfChapters || ch || 1;
            const words = (p.chapters || []).reduce(
              (sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0),
              0,
            );
            const pct = complete
              ? 100
              : Math.min(100, Math.round((ch / Math.max(1, target)) * 100));

            return (
              <div
                key={p.id}
                className={`group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                  complete
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 hover:bg-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60 hover:bg-amber-500/10"
                }`}
              >
                {complete ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Save className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                )}
                <button
                  onClick={() => onOpen(p.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {p.config.title || t("untitled")}
                    </p>
                    <EditorialMasteryBadge genre={p.config.genre} subcategory={(p.config as any).subcategory} size="xs" />
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="capitalize">{p.config.genre}</span>
                    <span>·</span>
                    <span>{ch} {t("chapters_unit")}</span>
                    <span>·</span>
                    <span>{words.toLocaleString()} {t("words_unit")}</span>
                    {!complete && (
                      <>
                        <span>·</span>
                        <span className="tabular-nums">{pct}%</span>
                      </>
                    )}
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                        complete
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {complete ? t("ready") : t("finish_later")}
                    </span>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(p.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 transition-opacity"
                  title={t("delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <ArrowRight
                  onClick={() => onOpen(p.id)}
                  className={`h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer ${
                    complete
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600 dark:text-amber-400"
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}

      {pausedCount > 0 && completedCount > 0 && (
        <p className="mt-2 px-1 text-[10px] text-muted-foreground/70">
          {tt("shelf_summary", { completed: completedCount, paused: pausedCount })}
        </p>
      )}
    </div>
  );
}
