import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { CoverGenerator } from "@/components/CoverGenerator";
import { ScriptoraLogoMark } from "@/components/brand/ScriptoraLogoMark";
import { getSelectedAuthorIdentity } from "@/lib/author-identity";
import { getLastProjectId, loadProjects, setLastProjectId } from "@/lib/storage";
import type { BookProject } from "@/types/book";

function loadBestProject(): BookProject | null {
  try {
    const loaded = loadProjects();
    const projects = Array.isArray(loaded) ? loaded : [];
    const lastId = getLastProjectId();
    return (
      (lastId ? projects.find((project) => project.id === lastId) : null) ||
      projects.find((project) =>
        (project.chapters || []).some((chapter) => (chapter.content || "").trim().length > 50),
      ) ||
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
  const chapters = Array.isArray(project?.chapters) ? project.chapters : [];

  if (!project || chapters.length === 0) {
    return (
      <main className="scriptora-brand-shell flex min-h-[100dvh] flex-col items-center justify-center bg-[#050505] px-6 text-white safe-area-pt pb-safe">
        <ScriptoraLogoMark size="md" />
        <h1 className="mt-6 text-2xl font-black tracking-tight">Cover Focus Studio</h1>
        <p className="mt-3 max-w-md text-center text-sm leading-6 text-white/62">
          Studio copertina del libro attivo. Crea prima un libro con Book Forge, poi torna qui per lavorare su formato, titolo, autore e export.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate("/dashboard", { state: { openForge: true } })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f2c400] px-5 py-3 text-sm font-black text-black"
          >
            <ImagePlus className="h-4 w-4" />
            Apri Book Forge
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/80"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <CoverGenerator
      title={title}
      subtitle={subtitle}
      authorName={authorName}
      description={project.blueprint?.overview || ""}
      authorBio={project.frontMatter?.aboutAuthor || activeAuthor?.biography || ""}
      genre={project.config?.genre || project.config?.category || ""}
      language={language}
      projectId={project.id}
      showPrimaryAction
      primaryActionLabel="Salva cover nel progetto"
      onGenerate={() => setLastProjectId(project.id)}
      onClose={() => navigate("/dashboard")}
      onOpenExport={() => navigate("/export-studio", { state: { projectId: project.id } })}
    />
  );
}
