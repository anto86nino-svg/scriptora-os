import { ArrowRight, GraduationCap, Plus, Rocket } from "lucide-react";
import { ONE_FLOW_TOOL_ROLES } from "@/lib/one-flow/one-flow-tool-roles";

type Props = {
  onNewBook: () => void;
  onStudyOs: () => void;
};

export function DashboardHomePillars({ onCharacterStudio,
 onNewBook, onStudyOs }: Props) {
  return (
    <section className="mb-4 grid gap-3 sm:mb-6 lg:grid-cols-2">
      <button
        type="button"
        onClick={onCharacterStudio ?? onNewBook}
        className="scriptora-home-pillar group relative overflow-hidden rounded-[1.75rem] border border-sky-400/30 bg-gradient-to-br from-sky-950/70 via-slate-900/55 to-sky-900/35 p-5 text-left shadow-[0_24px_80px_rgba(14,165,233,0.18)] transition-all hover:-translate-y-0.5 hover:border-sky-300/45 sm:p-6"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/75">Percorso principale</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Character Studio</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/68">
              Costruisci il cuore del libro — cast canonico, genere, tono, dinamica e conflitto prima del blueprint.
            </p>
            <p className="mt-3 text-xs text-white/45">{ONE_FLOW_TOOL_ROLES.forge.it}</p>
          </div>
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-[0_16px_40px_rgba(14,165,233,0.35)] transition-transform group-hover:translate-x-0.5">
            <Plus className="h-6 w-6" />
          </span>
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-sky-100/90">
          Costruisci il libro <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>

      <button
        type="button"
        onClick={onStudyOs}
        className="scriptora-home-pillar group relative overflow-hidden rounded-[1.75rem] border border-emerald-300/28 bg-gradient-to-br from-emerald-950/55 via-slate-900/50 to-slate-950/45 p-5 text-left shadow-[0_24px_80px_rgba(16,185,129,0.14)] transition-all hover:-translate-y-0.5 hover:border-emerald-300/42 sm:p-6"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-200/75">Secondo pilastro</p>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Study OS</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-white/68">
              Studia PDF, appunti, libri — riassunti, quiz, flashcard e spiegazioni guidate.
            </p>
            <p className="mt-3 text-xs text-white/45">Ecosistema studio separato dal flusso libro.</p>
          </div>
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-300 text-emerald-950 shadow-[0_16px_40px_rgba(16,185,129,0.28)] transition-transform group-hover:translate-x-0.5">
            <GraduationCap className="h-6 w-6" />
          </span>
        </div>
        <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-emerald-100/90">
          Apri Study OS <Rocket className="h-3.5 w-3.5" />
        </span>
      </button>
    </section>
  );
}
