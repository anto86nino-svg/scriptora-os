import { useState } from "react";
import { BookProject, SectionId, GenerationStatus } from "@/types/book";
import { ChevronRight, ChevronDown, FileText, Layers, Archive, ScrollText, Loader2, CheckCircle2, AlertCircle, Circle, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { t, tt, useUILanguage } from "@/lib/i18n";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

interface NavigationTreeProps {
  project: BookProject | null;
  activeSection: SectionId | null;
  onSelectSection: (id: SectionId) => void;
  generatingSet: Set<string>;
  onGenerateChaptersParallel?: (indices: number[]) => void;
}

export function NavigationTree({ project, activeSection, onSelectSection, generatingSet, onGenerateChaptersParallel }: NavigationTreeProps) {
  useUILanguage();
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleChapter = (i: number) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const toggleSelected = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  if (!project) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("select_project_prompt")}
      </div>
    );
  }

  const { blueprint, frontMatter, chapters, backMatter, config } = project;
  const isActive = (id: SectionId) => activeSection === id;

  const getChapterStatus = (i: number): GenerationStatus => {
    if (generatingSet.has(`chapter-${i}`)) return "generating";
    const ch = chapters[i];
    if (!ch || !ch.content) return "idle";
    if (ch.status === "error") return "error";
    return "completed";
  };

  const handleBulkGenerate = () => {
    if (selected.size === 0 || !onGenerateChaptersParallel) return;
    onGenerateChaptersParallel(Array.from(selected).sort((a, b) => a - b));
    setSelected(new Set());
    setSelectMode(false);
  };

  return (
    <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
      {config.category && (
        <div className="ios-glass-soft mb-2 rounded-lg px-3 py-2">
          <div className="mb-0.5 text-[10px] uppercase text-muted-foreground/60">{t("category")}</div>
          <div className="text-xs text-foreground/70">{config.category} › {config.subcategory}</div>
        </div>
      )}

      <TreeItem
        icon={<Layers className="h-3.5 w-3.5" />}
        label={t("blueprint")}
        active={isActive("blueprint")}
        status={blueprint ? "completed" : generatingSet.has("blueprint") ? "generating" : "idle"}
        onClick={() => onSelectSection("blueprint")}
      />

      <TreeItem
        icon={<ScrollText className="h-3.5 w-3.5" />}
        label={t("front_matter")}
        active={isActive("front-matter")}
        status={frontMatter ? "completed" : generatingSet.has("front-matter") ? "generating" : "idle"}
        onClick={() => onSelectSection("front-matter")}
      />

      {blueprint && (
        <div className="mt-1">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <span className="text-[10px] font-semibold uppercase text-muted-foreground/70">
              {t("chapters")}
            </span>
            {onGenerateChaptersParallel && (
              <button
                onClick={() => { setSelectMode(v => !v); setSelected(new Set()); }}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] font-medium transition-colors",
                  selectMode
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
                title={t("parallel_selection_title")}
              >
                {selectMode ? `✕ ${t("cancel")}` : `☰ ${t("select_short")}`}
              </button>
            )}
          </div>

          {selectMode && (
            <div className="ios-glass-soft mb-1.5 flex items-center justify-between gap-2 rounded-lg p-1.5">
              <span className="text-[10px] text-foreground/70">{tt("selected_count", { count: selected.size })}</span>
              <button
                onClick={handleBulkGenerate}
                disabled={selected.size === 0}
                className="flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-950 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-2.5 w-2.5" /> {t("generate_x3")}
              </button>
            </div>
          )}

          {blueprint.chapterOutlines.map((outline, i) => {
            const isExpanded = expandedChapters.has(i);
            const chGenerated = chapters[i] && chapters[i].content.length > 0;
            const hasSubs = chGenerated && chapters[i].subchapters.length > 0;
            const chStatus = getChapterStatus(i);
            const isSelected = selected.has(i);
            const chapterTitle = formatChapterDisplayTitle(
              i,
              chGenerated ? chapters[i]?.title : outline.title,
              { config, summary: outline.summary, totalChapters: config.numberOfChapters },
            );

            return (
              <div key={`stable-${i}`}>
                <div className={cn("flex items-center rounded-lg", isSelected && "bg-primary/10")}>
                  {selectMode ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSelected(i); }}
                      className="pl-2 pr-0.5 py-1.5"
                      title={isSelected ? t("deselect") : t("select")}
                    >
                      <span className={cn(
                        "h-3 w-3 rounded border flex items-center justify-center text-[8px]",
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                      )}>
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  ) : (hasSubs || config.subchaptersEnabled) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleChapter(i); }}
                      className="py-1.5 pl-1 pr-0.5 text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                  )}
                  <TreeItem
                    icon={<FileText className="h-3.5 w-3.5" />}
                    label={chapterTitle}
                    active={isActive(`chapter-${i}`)}
                    status={chStatus}
                    onClick={() => selectMode ? toggleSelected(i) : onSelectSection(`chapter-${i}`)}
                    className={(!selectMode && !(hasSubs || config.subchaptersEnabled)) ? "pl-6" : ""}
                  />
                </div>

                {isExpanded && !selectMode && chGenerated && (
                  <div className="ml-6 border-l border-white/10">
                    {chapters[i].subchapters.map((sub, j) => (
                      <TreeItem
                        key={j}
                        icon={<span className="text-[10px] font-mono text-muted-foreground">{i+1}.{j+1}</span>}
                        label={sub.title || `${t("subchapters")} ${j + 1}`}
                        active={isActive(`chapter-${i}-sub-${j}`)}
                        status={
                          generatingSet.has(`chapter-${i}-sub-${j}`) ? "generating" :
                          sub.content.length > 0 ? "completed" : "idle"
                        }
                        onClick={() => onSelectSection(`chapter-${i}-sub-${j}`)}
                        className="pl-3"
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TreeItem
        icon={<Archive className="h-3.5 w-3.5" />}
        label={t("back_matter")}
        active={isActive("back-matter")}
        status={backMatter ? "completed" : generatingSet.has("back-matter") ? "generating" : "idle"}
        onClick={() => onSelectSection("back-matter")}
      />
    </nav>
  );
}

function StatusIcon({ status }: { status: GenerationStatus }) {
  switch (status) {
    case "generating":
      return <Loader2 className="h-3 w-3 animate-spin text-primary" />;
    case "completed":
      return <CheckCircle2 className="h-3 w-3 text-[hsl(var(--success))]" />;
    case "error":
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />;
  }
}

function TreeItem({
  icon, label, active, status, onClick, className,
}: {
  icon: React.ReactNode; label: string; active: boolean;
  status: GenerationStatus; onClick: () => void; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "my-0.5 flex w-full items-center gap-2 truncate rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors",
        active
          ? "border border-primary/30 bg-primary/15 font-medium text-primary shadow-sm shadow-primary/10"
          : status === "completed"
            ? "text-foreground/[0.85] hover:bg-white/[0.07]"
            : "text-muted-foreground/[0.65] hover:bg-white/[0.06]",
        className
      )}
    >
      {icon}
      <span className="truncate flex-1">{label}</span>
      <StatusIcon status={status} />
    </button>
  );
}
