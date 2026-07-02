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
    <section aria-labelledby="home-libri-title" className="scriptora-home-card rounded-[1.5rem] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="scriptora-home-eyebrow">Libreria</p>
          <h2 id="home-libri-title" className="mt-1 text-xl font-black text-[#1a1209]">
            I miei libri
          </h2>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#8b5a2b] hover:bg-[#efe2cc] hover:text-[#1a1209]"
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
                ? "bg-[#2c1810] text-[#faf6ee]"
                : "bg-[#efe2cc] text-[#5c4030] hover:bg-[#e8dcc8] hover:text-[#1a1209]"
            }`}
          >
            {HOME_PROJECT_CATEGORY_LABELS[category]} · {counts[category]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-[#5c4030]">
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
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#d9c9b0] bg-[#faf6ee]/80 px-3 py-3 text-left transition hover:border-[#f2c400]/45 hover:bg-white"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#1a1209]">
                    {project.config.title?.trim() || "Progetto senza titolo"}
                  </p>
                  <p className="mt-0.5 text-xs text-[#5c4030]">{getProjectHumanStatus(project)}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-[#c9a87c]" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {projects.length === 0 && (
        <button
          type="button"
          onClick={onOpenLibrary}
          className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#c9a87c]/40 px-4 text-sm font-bold text-[#5c4030] hover:bg-[#efe2cc]"
        >
          <BookOpen className="h-4 w-4" />
          Apri libreria
        </button>
      )}
    </section>
  );
}
