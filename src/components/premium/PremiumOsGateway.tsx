import { BookOpen, Sparkles, ArrowRight, Clock } from "lucide-react";
import type { BookProject } from "@/types/book";
import { t } from "@/lib/i18n";

interface PremiumOsGatewayProps {
  lastProject: BookProject | null;
  progressPercent: number;
  onContinue: () => void;
  onNewBook: () => void;
}

export function PremiumOsGateway({ lastProject, progressPercent, onContinue, onNewBook }: PremiumOsGatewayProps) {
  const title = lastProject?.config?.title || t("no_active_book");
  const genre = lastProject?.config?.genre || "";
  const nextStep = progressPercent >= 100
    ? t("export_studio")
    : progressPercent > 0
      ? t("continue_action")
      : t("new_book");

  return (
    <section className="ios-panel relative overflow-hidden border-white/15 bg-gradient-to-br from-slate-950/55 via-indigo-950/25 to-sky-950/20 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative grid gap-5 md:grid-cols-[minmax(0,1fr)_200px] md:items-center">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.08] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              <Sparkles className="h-3 w-3 text-sky-300" /> Scriptora OS
            </span>
            {genre && (
              <span className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] font-medium text-white/60">
                {genre}
              </span>
            )}
          </div>

          <h2 className="truncate text-xl font-semibold text-white sm:text-2xl">{title}</h2>

          <div className="flex flex-wrap items-center gap-3 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-sky-300" />
              {progressPercent}% {t("active_draft_progress")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-300" />
              {nextStep}
            </span>
          </div>

          <div className="h-1.5 max-w-md overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 transition-all duration-700"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>

          <p className="max-w-lg text-xs leading-relaxed text-white/62">
            {lastProject
              ? "Il tuo manoscritto è vivo. Riprendi da dove hai lasciato o lascia che Scriptora suggerisca il prossimo passo editoriale."
              : "Crea il tuo primo libro premium — Scriptora ti guida dalla prima scena al lancio KDP."}
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {lastProject ? (
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200/50 bg-white px-4 text-xs font-bold text-slate-950 shadow-[0_14px_40px_rgba(14,165,233,0.22)] transition-all hover:-translate-y-0.5 hover:bg-slate-50"
              >
                <BookOpen className="h-4 w-4 text-sky-600" />
                {t("continue_action")}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onNewBook}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-sky-200/50 bg-white px-4 text-xs font-bold text-slate-950 shadow-[0_14px_40px_rgba(14,165,233,0.22)] transition-all hover:-translate-y-0.5 hover:bg-slate-50"
              >
                {t("new_book")}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mx-auto flex items-center justify-center md:mx-0" aria-hidden>
          <div className="premium-book-3d">
            <div className="premium-book-cover">
              <div className="premium-book-spine" />
              <div className="premium-book-pages" />
              <div className="premium-book-glow" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
