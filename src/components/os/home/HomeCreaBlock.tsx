import { ArrowRight, BookOpen, GraduationCap, NotebookPen, PenLine, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type HomeCreaOption = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const HOME_CREA_OPTIONS: HomeCreaOption[] = [
  { id: "novel", label: "Romanzo", description: "Narrativa con capitoli", icon: BookOpen },
  { id: "poetry", label: "Raccolta poetica", description: "Sezioni liriche e versi", icon: Sparkles },
  { id: "manual", label: "Manuale", description: "Metodo pratico e lezioni", icon: NotebookPen },
  { id: "workbook", label: "Workbook", description: "Esercizi e schede operative", icon: PenLine },
  { id: "studio", label: "Studio", description: "Study OS e formazione", icon: GraduationCap },
  { id: "memoir", label: "Memoir", description: "Memoria viva e riflessione", icon: BookOpen },
];

type Props = {
  onCreatePreset: (presetId: string) => void;
  onCreateFormat: (formatId: "workbook" | "memoir") => void;
  onOpenStudy: () => void;
};

export function HomeCreaBlock({ onCreatePreset, onCreateFormat, onOpenStudy }: Props) {
  const handleClick = (option: HomeCreaOption) => {
    if (option.id === "studio") {
      onOpenStudy();
      return;
    }
    if (option.id === "workbook" || option.id === "memoir") {
      onCreateFormat(option.id);
      return;
    }
    onCreatePreset(option.id);
  };

  return (
    <section aria-labelledby="home-crea-title" className="rounded-[1.5rem] bg-white/[0.04] p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Nuovo</p>
      <h2 id="home-crea-title" className="mt-1 text-xl font-bold text-white">
        Crea
      </h2>
      <p className="mt-1 text-sm text-white/50">Avvia Book Forge con il formato giusto o apri Study OS.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {HOME_CREA_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleClick(option)}
              className="group flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.07]"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/80">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{option.label}</span>
                  <span className="block truncate text-xs text-white/45">{option.description}</span>
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-white/30 transition group-hover:text-white/60" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
