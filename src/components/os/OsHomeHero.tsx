import { BookOpen, PenLine, Sparkles, Package, ChevronRight } from "lucide-react";
import type { BookProject } from "@/types/book";
import { isProjectComplete } from "@/lib/project-status";

interface OsHomeHeroProps {
  lastProject: BookProject | null | undefined;
  progressPercent: number;
  onContinue: () => void;
  onGenerateNextChapter: () => void;
  onExport: () => void;
  onNewBook: () => void;
  onMyBooks: () => void;
}

function coverDisplayTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= 32) return trimmed;
  const words = trimmed.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > 16 && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length >= 2) break;
  }
  if (lines.length < 2 && current) lines.push(current);
  const preview = lines.join(" ");
  return preview.length < trimmed.length ? `${preview}…` : preview;
}

function manuscriptStatus(project: BookProject | null | undefined): string {
  if (!project) return "Nessun libro attivo";
  if (isProjectComplete(project)) return "Manoscritto completo";
  if (project.phase === "chapters" || project.chapters?.some((c) => c.content?.trim())) {
    return "In scrittura";
  }
  if (project.blueprint) return "Blueprint pronto";
  return "Bozza iniziale";
}

export function OsHomeHero({
  lastProject,
  progressPercent,
  onContinue,
  onGenerateNextChapter,
  onExport,
  onNewBook,
  onMyBooks,
}: OsHomeHeroProps) {
  const title = lastProject?.config?.title || "Il tuo prossimo bestseller";
  const subtitle = lastProject?.config?.subtitle || "Crea o continua un progetto editoriale";
  const doneChapters = lastProject?.chapters?.filter((c) => (c.content || "").trim().length > 50).length || 0;
  const targetChapters = lastProject?.config?.numberOfChapters || lastProject?.chapters?.length || 0;
  const status = manuscriptStatus(lastProject);

  return (
    <section className="mb-4 sm:mb-5">
      <div className="scriptora-glass-panel scriptora-home-hero-impact overflow-hidden rounded-2xl p-4 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/80">Libro attivo</p>
            <h2 className="scriptora-impact-title mt-1 line-clamp-2 text-2xl font-bold tracking-tight sm:text-4xl xl:text-5xl">{title}</h2>
            <p className="scriptora-impact-subtitle mt-2 line-clamp-2 text-sm sm:text-base">{subtitle}</p>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:gap-3">
              <Stat label="Avanzamento" value={`${progressPercent}%`} />
              <Stat label="Capitoli" value={targetChapters ? `${doneChapters}/${targetChapters}` : "—"} />
              <Stat label="Stato" value={status} small />
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--scriptora-visual-primary))] to-[rgb(var(--scriptora-visual-accent))] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <HeroCta
                primary
                fullWidth
                icon={PenLine}
                label="Continua a scrivere"
                onClick={lastProject ? onContinue : onNewBook}
              />
              <div className="grid grid-cols-2 gap-2">
                <HeroCta
                  icon={Sparkles}
                  label="Genera capitolo"
                  onClick={lastProject ? onGenerateNextChapter : onNewBook}
                  disabled={!lastProject}
                />
                <HeroCta icon={Package} label="Esporta libro" onClick={onExport} disabled={!lastProject} />
              </div>
            </div>

            <button
              type="button"
              onClick={onMyBooks}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-white"
            >
              <BookOpen className="h-3.5 w-3.5" /> I miei libri <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="order-1 flex justify-center lg:order-2">
            <div className="os-book-3d-scene" aria-hidden>
              <div className="os-book-3d">
                <div className="os-book-spine" />
                <div className="os-book-cover">
                  <p className="os-book-kicker">SCRIPTORA</p>
                  <p className="os-book-title" title={title}>{coverDisplayTitle(title)}</p>
                  <p className="os-book-meta">{progressPercent}% · {doneChapters} cap.</p>
                </div>
                <div className="os-book-pages" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2 sm:px-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className={`mt-0.5 font-bold tabular-nums text-white ${small ? "text-[11px] leading-4" : "text-sm sm:text-base"}`}>
        {value}
      </p>
    </div>
  );
}

function HeroCta({
  icon: Icon,
  label,
  onClick,
  primary,
  disabled,
  fullWidth,
}: {
  icon: typeof PenLine;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold transition-all sm:text-sm ${
        fullWidth ? "w-full" : ""
      } ${
        primary
          ? "h-12 bg-white text-slate-950 shadow-[0_16px_40px_rgba(14,165,233,0.28)] hover:-translate-y-0.5 sm:h-11"
          : "border border-white/15 bg-white/8 text-white hover:bg-white/12"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
