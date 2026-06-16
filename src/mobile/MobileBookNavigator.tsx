import type { BookProject, SectionId } from "@/types/book";
import type { ChunkProgress } from "@/lib/generation-types";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";
import { computeProjectProgressPercent } from "@/lib/project-progress";
import { isBackMatterEnabled, isFrontMatterEnabled } from "@/lib/matter-options";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { t } from "@/lib/i18n";

export type MobileBookNavigatorProps = {
  open: boolean;
  onClose: () => void;
  project: BookProject;
  activeSection: SectionId | null;
  generatingSet: Set<string>;
  chunkProgress?: Record<string, ChunkProgress>;
  onSelectSection: (id: SectionId) => void;
};

function chapterStatus(
  index: number,
  project: BookProject,
  generatingSet: Set<string>,
  activeSection: SectionId | null,
): "written" | "live" | "pending" {
  const key = `chapter-${index}`;
  if (generatingSet.has(key) || activeSection === key) return "live";
  const ch = project.chapters[index];
  if (ch?.content?.trim().length) return "written";
  return "pending";
}

export function MobileBookNavigator({
  open,
  onClose,
  project,
  activeSection,
  generatingSet,
  chunkProgress,
  onSelectSection,
}: MobileBookNavigatorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const { config, blueprint, chapters } = project;
  const totalChapters = config.numberOfChapters || blueprint?.chapterOutlines.length || 0;
  const progressPct = computeProjectProgressPercent(project);
  const showFront = isFrontMatterEnabled(config);
  const showBack = isBackMatterEnabled(config);

  const activeChapterIndex = useMemo(() => {
    if (!activeSection) return null;
    const m = activeSection.match(/^chapter-(\d+)/);
    return m ? parseInt(m[1], 10) : null;
  }, [activeSection]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [open, activeChapterIndex]);

  if (!open) return null;

  return (
    <div className="scriptora-mobile-book-nav fixed inset-0 z-[60] flex flex-col bg-[#07070b] lg:hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-white/70"
          aria-label="Chiudi indice"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-white">{config.title || t("untitled")}</p>
          <p className="text-xs text-white/45">{totalChapters} capitoli · {progressPct}%</p>
        </div>
        <Link
          to="/dashboard"
          className="flex h-10 items-center gap-1 rounded-xl border border-white/10 px-3 text-xs text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Libri
        </Link>
      </header>

      <div className="shrink-0 px-4 py-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-700"
            style={{ width: `${Math.max(4, progressPct)}%` }}
          />
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        {blueprint && (
          <button
            type="button"
            onClick={() => onSelectSection("blueprint")}
            className={cn(
              "mb-3 flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition",
              activeSection === "blueprint"
                ? "border-violet-400/35 bg-violet-500/12"
                : "border-white/10 bg-white/[0.03]",
            )}
          >
            <BookOpen className="h-5 w-5 shrink-0 text-violet-300" />
            <div>
              <p className="text-sm font-semibold text-white">Blueprint</p>
              <p className="text-xs text-white/45">Mappa del libro</p>
            </div>
          </button>
        )}

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
          Capitoli
        </p>

        <div className="space-y-2">
          {blueprint?.chapterOutlines.slice(0, totalChapters).map((outline, i) => {
            const status = chapterStatus(i, project, generatingSet, activeSection);
            const ch = chapters[i];
            const title = formatChapterDisplayTitle(
              i,
              ch?.content ? ch.title : outline.title,
              { config, summary: outline.summary, totalChapters },
            );
            const titleParts = title.split(" — ");
            const chapterLabel = titleParts[0] || `Capitolo ${i + 1}`;
            const chapterName = titleParts.slice(1).join(" — ") || outline.title;
            const live = chunkProgress?.[`chapter-${i}`];
            const isActive = activeChapterIndex === i;

            return (
              <button
                key={i}
                ref={isActive ? activeRef : undefined}
                type="button"
                onClick={() => onSelectSection(`chapter-${i}`)}
                className={cn(
                  "scriptora-mobile-chapter-card w-full rounded-2xl border px-4 py-3.5 text-left transition",
                  isActive
                    ? "border-violet-400/40 bg-violet-500/12 shadow-lg shadow-violet-950/20"
                    : "border-white/[0.08] bg-white/[0.03] active:bg-white/[0.06]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
                      {chapterLabel}
                    </p>
                    <p className="mt-0.5 text-base font-semibold leading-snug text-white">
                      {chapterName}
                    </p>
                  </div>
                  <StatusBadge status={status} />
                </div>
                {status === "live" && live?.targetWords && (
                  <p className="mt-2 text-[10px] text-violet-200/70">
                    Scrittura live · {Math.round(((live.currentWords || 0) / live.targetWords) * 100)}%
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {(showFront || showBack) && (
          <div className="mt-6 space-y-2 border-t border-white/10 pt-4">
            {showFront && (
              <NavMatterButton
                label="Front Matter"
                active={activeSection === "front-matter"}
                done={!!project.frontMatter}
                onClick={() => onSelectSection("front-matter")}
              />
            )}
            {showBack && (
              <NavMatterButton
                label="Back Matter"
                active={activeSection === "back-matter"}
                done={!!project.backMatter}
                onClick={() => onSelectSection("back-matter")}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "written" | "live" | "pending" }) {
  if (status === "written") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
        ✓ scritto
      </span>
    );
  }
  if (status === "live") {
    return (
      <span className="shrink-0 rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-100">
        ● live
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-white/40">
      ○
    </span>
  );
}

function NavMatterButton({
  label,
  active,
  done,
  onClick,
}: {
  label: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left",
        active ? "border-violet-400/35 bg-violet-500/10" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <span className="text-sm font-medium text-white">{label}</span>
      <span className={cn("text-[10px] font-semibold", done ? "text-emerald-300" : "text-white/35")}>
        {done ? "✓" : "○"}
      </span>
    </button>
  );
}
