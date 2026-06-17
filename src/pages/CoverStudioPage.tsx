import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, ImagePlus } from "lucide-react";
import { CoverGenerator } from "@/components/CoverGenerator";
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { getLastProjectId, loadProjects, setLastProjectId } from "@/services/storageService";
import type { BookProject } from "@/types/book";

function loadBestProject(): BookProject | null {
  try {
    const projects = loadProjects();
    const lastId = getLastProjectId();
    return (
      (lastId ? projects.find((project) => project.id === lastId) : null) ||
      projects.find((project) => (project.chapters || []).some((chapter) => (chapter.content || "").trim().length > 50)) ||
      projects[0] ||
      null
    );
  } catch {
    return null;
  }
}

export default function CoverStudioPage() {
  const navigate = useNavigate();
  const project = useMemo(() => loadBestProject(), []);
  const activeAuthor = useMemo(() => {
    try {
      return getSelectedAuthorIdentity();
    } catch {
      return null;
    }
  }, []);

  const title = project?.config?.title || "Untitled";
  const subtitle = project?.config?.subtitle || "";
  const authorName = project?.config?.authorName || activeAuthor?.penName || "";
  const language = project?.config?.language || project?.config?.titleLanguage || "Italian";

  return (
    <main className="scriptora-brand-shell min-h-[100dvh] overflow-x-hidden bg-[#050505] text-white">
      <header className="sticky top-0 z-30 border-b border-[#f2c400]/20 bg-[#050505]/82 px-4 py-3 backdrop-blur-2xl safe-area-pt sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#f2c400]/20 bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#f2c400] transition hover:bg-[#f2c400]/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>

          <div className="flex min-w-0 items-center gap-3">
            <ScriptoraLogoMark size="sm" />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.22em] text-[#f2c400]/80">
                Scriptora Publishing Room
              </p>
              <h1 className="truncate text-sm font-black tracking-tight text-white sm:text-base">
                Cover Studio
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/app")}
            className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-white/78 transition hover:bg-white/[0.09] sm:inline-flex"
          >
            <ImagePlus className="h-4 w-4 text-[#f2c400]" />
            Writer
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-3 pt-5 sm:px-6">
        <div className="scriptora-brand-card rounded-[2rem] p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f2c400]/75">
                Copertina protagonista
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Crea una cover intera, salvabile, pronta per export e KDP.
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                Niente finestre incastrate. Qui la copertina diventa una stanza vera di Scriptora.
              </p>
            </div>
            {project && (
              <div className="rounded-2xl border border-[#f2c400]/20 bg-[#f2c400]/8 px-4 py-3 text-xs text-[#f2c400]/90">
                Progetto attivo: <span className="font-black">{title}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1800px] px-0 pb-safe sm:px-4">
        <CoverGenerator
          title={title}
          subtitle={subtitle}
          authorName={authorName}
          description={project?.blueprint?.overview || ""}
          authorBio={project?.frontMatter?.aboutAuthor || activeAuthor?.biography || ""}
          genre={project?.config?.genre || project?.config?.category}
          language={language}
          projectId={project?.id}
          showPrimaryAction={Boolean(project)}
          primaryActionLabel="Salva cover nel progetto"
          onGenerate={() => {
            if (project?.id) setLastProjectId(project.id);
          }}
          onClose={() => navigate("/dashboard")}
          onOpenExport={() => navigate("/dashboard", { state: { openExport: true, projectId: project?.id } })}
        />
      </section>

      {!project && (
        <div className="fixed inset-x-4 bottom-4 z-40 rounded-3xl border border-[#f2c400]/25 bg-[#050505]/90 p-4 text-sm text-white shadow-2xl backdrop-blur-xl sm:left-auto sm:w-[420px]">
          <p className="font-black text-[#f2c400]">Nessun progetto attivo trovato.</p>
          <p className="mt-1 text-white/62">Crea prima un libro con Book Forge, poi torna qui per la cover.</p>
          <button
            type="button"
            onClick={() => navigate("/dashboard", { state: { openForge: true } })}
            className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-[#f2c400] px-4 py-2 text-xs font-black text-black"
          >
            <ImagePlus className="h-4 w-4" />
            Apri Book Forge
          </button>
        </div>
      )}
    </main>
  );
}
