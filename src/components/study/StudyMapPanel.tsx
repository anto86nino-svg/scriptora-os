import { Copy, Network } from "lucide-react";
import { toast } from "sonner";
import type { StudyConceptMap, StudyExercise } from "@/lib/study-session";

interface StudyMapPanelProps {
  conceptMap?: StudyConceptMap | null;
  exercises?: StudyExercise[];
}

const EXERCISE_LABELS: Record<StudyExercise["type"], string> = {
  guided: "Guidato",
  free: "Libero",
  correction: "Corretto",
  application: "Applicazione",
  reasoning: "Ragionamento",
};

export function StudyMapPanel({ conceptMap, exercises = [] }: StudyMapPanelProps) {
  if (!conceptMap && exercises.length === 0) {
    return (
      <p className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 text-sm text-muted-foreground">
        Nessuna mappa disponibile. Rigenera la sessione per creare mappe ed esercizi.
      </p>
    );
  }

  async function copyMap() {
    if (!conceptMap?.exportText) return;
    await navigator.clipboard.writeText(conceptMap.exportText);
    toast.success("Mappa copiata");
  }

  return (
    <div className="space-y-4">
      {conceptMap && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4 text-emerald-200" />
                <h3 className="font-semibold">Mappa concettuale</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{conceptMap.title}</p>
            </div>
            <button
              type="button"
              onClick={copyMap}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Copy className="h-3.5 w-3.5" />
              Copia
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            {conceptMap.nodes.map((node) => (
              <div
                key={node.id}
                className="rounded-2xl border border-white/10 bg-background/45 p-3"
                style={{ marginLeft: `${Math.min(2, node.level) * 18}px` }}
              >
                <p className="text-sm font-bold text-foreground">{node.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{node.detail}</p>
              </div>
            ))}
          </div>

          {conceptMap.relations.length > 0 && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-background/45 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200/80">Relazioni</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {conceptMap.relations.map((relation) => (
                  <li key={`${relation.from}-${relation.to}-${relation.label}`}>
                    {relation.from} - {relation.label} - {relation.to} ({relation.type})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {exercises.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-2xl">
          <h3 className="font-semibold">Esercizi adattivi</h3>
          <div className="mt-3 grid gap-3">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="rounded-2xl border border-white/10 bg-background/45 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
                    {EXERCISE_LABELS[exercise.type]}
                  </span>
                  <span className="text-xs text-muted-foreground">{exercise.difficulty}</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{exercise.prompt}</p>
                {exercise.solution && (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    <span className="font-semibold text-foreground/90">Soluzione attesa: </span>
                    {exercise.solution}
                  </p>
                )}
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{exercise.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
