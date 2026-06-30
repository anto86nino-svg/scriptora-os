import { useMemo, useState } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import type { BookProject } from "@/types/book";
import {
  HOME_PROJECT_CATEGORY_LABELS,
  categorizeHomeProjects,
  countHomeProjectsByCategory,
  type HomeProjectCategory,
} from "@/lib/os/home-project-categories";
import { getProjectHumanStatus } from "@/lib/project-continuity";

type Props = {
  projects: BookProject[];
  onOpenLibrary: () => void;
  onContinueProject: (projectId: string) => void;
};

export function HomeLibriBlock({ projects, onOpenLibrary, onContinueProject }: Props) {
  const [activeCategory, setActiveCategory] = useState<HomeProjectCategory>("in_corso");
  const counts = useMemo(() => countHomeProjectsByCategory(projects), [projects]);
  const categorized = useMemo(() => categorizeHomeProjects(projects), [projects]);
  const visible = categorized[activeCategory].slice(0, 4);

  return (
    <section aria-labelledby="home-libri-title" className="rounded-[1.5rem] border border-stone-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.07)] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700/65">Libreria</p>
          <h2 id="home-libri-title" className="mt-1 text-xl font-black text-slate-950">
            I miei libri
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-stone-100 hover:text-slate-950"
        >
          Tutti
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(HOME_PROJECT_CATEGORY_LABELS) as HomeProjectCategory[]).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            activeCategory === category
                ? "bg-slate-950 text-white"
                : "bg-stone-100 text-slate-600 hover:bg-stone-200 hover:text-slate-950"
            }`}
          >
            {HOME_PROJECT_CATEGORY_LABELS[category]} · {counts[category]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          {activeCategory === "archiviati"
            ? "Nessun libro archiviato negli ultimi 7 giorni."
            : "Nessun libro in questa categoria."}
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onContinueProject(project.id)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-3 text-left transition hover:border-emerald-200 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {project.config.title?.trim() || "Progetto senza titolo"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{getProjectHumanStatus(project)}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {projects.length === 0 && (
        <button
          type="button"
          onClick={onOpenLibrary}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-stone-200 px-4 text-sm font-bold text-slate-700 hover:bg-stone-50"
        >
          <BookOpen className="h-4 w-4" />
          Apri libreria
        </button>
      )}
    </section>
  );
}
