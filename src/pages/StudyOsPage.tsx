import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Play, Trash2 } from "lucide-react";
import { OsShell } from "@/components/os/OsShell";
import { LearningDashboard } from "@/components/study/LearningDashboard";
import { deleteStudyProject, listStudyProjects, type StudyProjectRecord } from "@/lib/study-project-storage";

export default function StudyOsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<StudyProjectRecord[]>(() => listStudyProjects());

  useEffect(() => {
    const sync = () => setProjects(listStudyProjects());
    window.addEventListener("scriptora-study-projects-change", sync);
    return () => window.removeEventListener("scriptora-study-projects-change", sync);
  }, []);

  return (
    <OsShell
      title="Study OS"
      subtitle="Apprendimento enterprise con materiali persistenti"
      badge="🎓 Study Pro"
      actions={
        <button
          type="button"
          onClick={() => navigate("/study-session")}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-300 px-4 text-xs font-bold text-slate-950"
        >
          <Play className="h-3.5 w-3.5" /> Nuova sessione
        </button>
      }
    >
      <LearningDashboard />

      <div className="mt-6">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <GraduationCap className="h-4 w-4 text-emerald-300" /> Progetti Study salvati
        </p>
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/15 p-6 text-sm text-white/55">
            Nessun materiale salvato. Avvia una sessione e carica PDF, EPUB, DOCX o appunti.
          </p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <button type="button" onClick={() => navigate("/study-session", { state: { projectId: p.id } })} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold text-white">{p.title}</p>
                  <p className="text-[11px] text-white/50">
                    {p.sourceType.toUpperCase()} · {p.result.words} parole · {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteStudyProject(p.id);
                    setProjects(listStudyProjects());
                  }}
                  className="rounded-lg p-2 text-white/40 hover:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </OsShell>
  );
}
