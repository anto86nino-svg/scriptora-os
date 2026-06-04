import { useState } from "react";
import { BookProject } from "@/types/book";
import { X, FileDown, Loader2, BookOpen, FileText, FileType, Lock } from "lucide-react";
import { generateEpub, validateEpubStructure } from "@/lib/epub";
import { saveBlobAs } from "@/lib/save-file";
import { saveProject } from "@/lib/storage";
import { saveProjectAsync } from "@/services/storageService";
import { useToast } from "@/hooks/use-toast";
import { usePlan, PLAN_LIMITS } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CoverGenerator } from "@/components/CoverGenerator";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { isProjectComplete } from "@/lib/project-status";
import { creditModeDisclosure, operationCreditLabel } from "@/lib/credit-economy";
import { isDevMode } from "@/lib/dev-mode";

type Format = "epub" | "docx" | "pdf";

interface HomeExportDialogProps {
  open: boolean;
  projects: BookProject[];
  onClose: () => void;
}

export function HomeExportDialog({ open, projects, onClose }: HomeExportDialogProps) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [format, setFormat] = useState<Format>("epub");
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [exportAfterCover, setExportAfterCover] = useState(false);
  const [coverDataUrls, setCoverDataUrls] = useState<Record<string, string>>({});
  const { plan } = usePlan();
  // Honour the dev-mode plan override: only the simulated tier's permissions
  // apply (Premium/Pro/Beta unlock export, Free does not).
  const canExport = PLAN_LIMITS[plan].canExport;
  const devCreditMode = isDevMode();

  if (!open) return null;

  const exportableProjects = projects.filter(isProjectComplete);
  const selectedProject = projects.find(p => p.id === selectedId) || null;
  const selectedCoverDataUrl = selectedProject
    ? coverDataUrls[selectedProject.id] || selectedProject.coverDataUrl
    : undefined;

  const filenameOf = (p: BookProject) =>
    (p.config.title || "book").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";

  const performExport = async (project: BookProject, coverOverride?: string) => {
    setIsExporting(true);
    try {
      const filename = filenameOf(project);
      let blob: Blob;
      let ext: "epub" | "docx" | "pdf";
      let mime: string;
      let description: string;

      if (format === "epub") {
        const errors = validateEpubStructure(project);
        if (errors.length > 0) {
          toast({
            title: "EPUB non esportabile",
            description: errors.slice(0, 2).join(" · "),
            variant: "destructive",
          });
          setIsExporting(false);
          return;
        }
        blob = await generateEpub(project, coverOverride ?? coverDataUrls[project.id] ?? project.coverDataUrl);
        ext = "epub";
        mime = "application/epub+zip";
        description = "EPUB Book";
      } else if (format === "docx") {
        const { generateDocx } = await import("@/lib/docx-export");
        blob = await generateDocx(project);
        ext = "docx";
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        description = "Word Document";
      } else {
        const { generatePdf } = await import("@/lib/pdf-export");
        blob = await generatePdf(project);
        ext = "pdf";
        mime = "application/pdf";
        description = "PDF Document";
      }

      const saved = await saveBlobAs(blob, {
        suggestedName: filename,
        extension: ext,
        mimeType: mime,
        description,
      });

      if (saved) {
        toast({ title: "File salvato", description: `${filename}.${ext}` });
        onClose();
      }
    } catch (e) {
      console.error("Export failed:", e);
      toast({
        title: "Esportazione fallita",
        description: e instanceof Error ? e.message : "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    if (!canExport) {
      setShowUpgrade(true);
      return;
    }
    const project = selectedProject;
    if (!project) {
      toast({ title: "Seleziona un progetto", variant: "destructive" });
      return;
    }
    if (!isProjectComplete(project)) {
      toast({
        title: "Libro non completo",
        description: "Completa tutti i capitoli prima di esportare.",
        variant: "destructive",
      });
      return;
    }
    if (!(coverDataUrls[project.id] || project.coverDataUrl)) {
      setExportAfterCover(true);
      setCoverGateOpen(true);
      return;
    }

    await performExport(project);
  };

  const formatOptions: { value: Format; icon: any; label: string; desc: string }[] = [
    { value: "epub", icon: BookOpen, label: "EPUB", desc: "Kindle/Apple/Kobo · include la cover salvata" },
    { value: "docx", icon: FileText, label: "Word", desc: "Manoscritto editabile · cover salvata nel progetto" },
    { value: "pdf", icon: FileType, label: "PDF", desc: "Interni print-ready · cover da usare in KDP/Cover Studio" },
  ];

  return (
    <div className="scriptora-modal-overlay">
      <div className="scriptora-modal-panel max-w-lg">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileDown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Esporta Libro</h2>
              <p className="text-xs text-muted-foreground">Scegli progetto e formato bestseller</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scriptora-modal-body space-y-5 p-5">
          {/* Project Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Progetto
            </label>
            {exportableProjects.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">
                  Nessun libro completo pronto per export.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Completa tutti i capitoli: poi Scriptora ti fara passare da Cover Studio o potrai spedire senza cover.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {exportableProjects.map(p => {
                  const wordCount = p.chapters.reduce(
                    (sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0),
                    0
                  );
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedId === p.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <input
                        type="radio"
                        name="project"
                        checked={selectedId === p.id}
                        onChange={() => setSelectedId(p.id)}
                        className="accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {p.config.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.chapters.length} cap · {wordCount.toLocaleString()} parole · {p.config.language}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Format Selection */}
          {exportableProjects.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Formato
              </label>
              <div className="grid grid-cols-1 gap-2">
                {formatOptions.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      format === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      checked={format === opt.value}
                      onChange={() => setFormat(opt.value)}
                      className="accent-primary"
                    />
                    <opt.icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedProject && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Checklist export</p>
              <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-lg bg-background/70 px-3 py-2">
                  <span className="font-medium text-foreground">Manoscritto</span>
                  <span className="ml-2 text-emerald-400">pronto</span>
                </div>
                <div className="rounded-lg bg-background/70 px-3 py-2">
                  <span className="font-medium text-foreground">Cover</span>
                  <span className={`ml-2 ${selectedCoverDataUrl ? "text-emerald-400" : "text-amber-300"}`}>
                    {selectedCoverDataUrl ? "salvata" : "da creare"}
                  </span>
                  {!selectedCoverDataUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setExportAfterCover(false);
                        setShowCover(true);
                      }}
                      className="mt-2 block rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary hover:bg-primary/15"
                    >
                      Crea cover
                    </button>
                  )}
                </div>
                <div className="rounded-lg bg-background/70 px-3 py-2 sm:col-span-2">
                  <span className="font-medium text-foreground">Costo export</span>
                  <span className="ml-2">{operationCreditLabel("export_package", devCreditMode)}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] leading-4 text-muted-foreground/80">
                EPUB incorpora la cover. PDF e DOCX esportano il manoscritto; la cover resta disponibile nel progetto per KDP e uso separato.
              </p>
              {devCreditMode && (
                <p className="mt-2 rounded-lg border border-border/70 bg-background/55 px-3 py-2 text-[10px] leading-4 text-muted-foreground">
                  {creditModeDisclosure(true)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/20 p-4">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            Annulla
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !selectedId || exportableProjects.length === 0}
            title={canExport ? "Export" : "Finish your book — unlock export"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Esportazione...
              </>
            ) : !canExport ? (
              <>
                <Lock className="h-3 w-3" />
                Unlock Export
              </>
            ) : (
              <>
                <FileDown className="h-3 w-3" />
                Esporta
              </>
            )}
          </button>
        </div>
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
      <CoverBeforeExportDialog
        open={coverGateOpen && !!selectedProject}
        format={format.toUpperCase() as "EPUB" | "PDF" | "DOCX"}
        onCreateCover={() => {
          setExportAfterCover(true);
          setCoverGateOpen(false);
          setShowCover(true);
        }}
        onShipWithoutCover={() => {
          setExportAfterCover(false);
          setCoverGateOpen(false);
          if (selectedProject) void performExport(selectedProject);
        }}
        onClose={() => {
          setCoverGateOpen(false);
          setExportAfterCover(false);
        }}
      />
      {showCover && selectedProject && (
        <CoverGenerator
          title={selectedProject.config.title}
          subtitle={selectedProject.config.subtitle}
          authorName={selectedProject.config.authorName || selectedProject.config.author || selectedProject.config.writerName}
          description={selectedProject.blueprint?.overview || selectedProject.config.subtitle}
          authorBio={selectedProject.frontMatter?.aboutAuthor || selectedProject.config.authorIdentity?.biography}
          projectGenre={selectedProject.config.genre}
          primaryActionLabel={exportAfterCover ? "Usa cover ed esporta" : "Salva cover nel progetto"}
          onGenerate={(dataUrl) => {
            setCoverDataUrls((current) => ({ ...current, [selectedProject.id]: dataUrl }));
            const updatedProject: BookProject = {
              ...selectedProject,
              coverDataUrl: dataUrl,
              coverUpdatedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            saveProject(updatedProject);
            saveProjectAsync(updatedProject).catch(() => undefined);
            setShowCover(false);
            if (exportAfterCover) {
              void performExport(updatedProject, dataUrl);
            } else {
              toast({ title: "Cover salvata", description: "La checklist export e stata aggiornata." });
            }
            setExportAfterCover(false);
          }}
          onClose={() => {
            setShowCover(false);
            setExportAfterCover(false);
          }}
        />
      )}
    </div>
  );
}
