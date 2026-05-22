import { useState } from "react";
import { Library, ArrowRight, FileDown, Trash2, CheckCircle2 } from "lucide-react";
import { BookProject } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";
import { EditorialMasteryBadge } from "@/components/EditorialMasteryBadge";
import { t, useUILanguage } from "@/lib/i18n";

interface Props {
  projects: BookProject[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
}

/**
 * Shows COMPLETED books only.
 * Uses isProjectComplete() so books with all chapters generated land here even
 * if the engine never fired the final "complete" phase (avoids desync with
 * InProgressSection).
 */
export function LibrarySection({ projects, onOpen, onDelete, onExport }: Props) {
  useUILanguage();
  const [expanded, setExpanded] = useState(true);
  const completed = projects.filter(isProjectComplete);

  if (completed.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-1 mb-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Library className="h-3 w-3 text-emerald-500" />
          {t("library")} ({completed.length})
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
          {completed.map((p) => {
            const ch = p.chapters?.length || 0;
            const words = (p.chapters || []).reduce(
              (sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0),
              0,
            );
            return (
              <div
                key={p.id}
                className="group flex w-full items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-left transition-colors hover:border-emerald-500/60 hover:bg-emerald-500/10"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="capitalize">{p.config.genre}</span>
                    <span>·</span>
                    <span>{ch} {t("chapters_unit")}</span>
                    <span>·</span>
                    <span>{words.toLocaleString()} {t("words_unit")}</span>
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold uppercase tracking-wider">
                      {t("ready")}
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
                  className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
