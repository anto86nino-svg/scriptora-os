import { lazy, Suspense, useEffect, useState } from "react";
import { BookProject } from "@/types/book";
import { X, FileDown, Loader2, BookOpen, FileText, FileType, Lock, ImagePlus, Headphones } from "lucide-react";
import { AudiobookExportPanel } from "@/components/audiobook/AudiobookExportPanel";
import { runEpubExport, validateEpubExport, runDocxExport, runPdfExport } from "@/lib/export-runtime";
import { saveBlobAs } from "@/lib/save-file";
import { useToast } from "@/hooks/use-toast";
import { usePlan, PLAN_LIMITS } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { isProjectComplete } from "@/lib/project-status";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";
import { ScriptoraWorkingState } from "@/components/ui/ScriptoraWorkingState";
import { ScriptoraAliveTransition } from "@/components/boot/ScriptoraAliveTransition";
import { WORKING_STEP_PRESETS } from "@/lib/scriptora-working-state";
import { chargePremiumOperation, refundPremiumOperation } from "@/lib/billing/charge";
import { InsufficientCreditsError } from "@/lib/billing";
import { ExportBlockedError, getExportBlockers } from "@/lib/export-readiness";
import { applyAuthorIdentityToConfig } from "@/lib/author-identity";
import { listProjectCoverUrls } from "@/lib/cover-session";

const CoverGenerator = lazy(() =>
  import("@/components/CoverGenerator").then((m) => ({ default: m.CoverGenerator })),
);

type Format = "epub" | "docx" | "pdf";
type StudioTab = "documents" | "audiobook";

interface HomeExportDialogProps {
  open: boolean;
  projects: BookProject[];
  initialProjectId?: string;
  onClose: () => void;
}

export function resolveInitialExportProjectId(
  projects: BookProject[],
  currentId = "",
  initialProjectId = "",
): string {
  const exportableProjects = projects.filter(isProjectComplete);
  if (initialProjectId && exportableProjects.some((project) => project.id === initialProjectId)) {
    return initialProjectId;
  }
  if (currentId && exportableProjects.some((project) => project.id === currentId)) {
    return currentId;
  }
  return exportableProjects[0]?.id || "";
}

export function HomeExportDialog({ open, projects, initialProjectId, onClose }: HomeExportDialogProps) {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [format, setFormat] = useState<Format>("epub");
  const [isExporting, setIsExporting] = useState(false);
  const [exportStartedAt, setExportStartedAt] = useState<number | undefined>();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [coverDataUrls, setCoverDataUrls] = useState<Record<string, string>>({});
  const [studioTab, setStudioTab] = useState<StudioTab>("documents");
  const { plan } = usePlan();
  // Honour the dev-mode plan override: only the simulated tier's permissions
  // apply (Premium/Pro/Beta unlock export, Free does not).
  const canExport = PLAN_LIMITS[plan].canExport;

  useEffect(() => {
    if (!open) return;
    const safeProjects = Array.isArray(projects) ? projects : [];
    setCoverDataUrls((current) => ({ ...listProjectCoverUrls(), ...current }));
    setSelectedId((current) => resolveInitialExportProjectId(safeProjects, current, initialProjectId));
  }, [initialProjectId, open, projects]);

  if (!open) return null;

  const safeProjects = Array.isArray(projects) ? projects : [];
  const selectedProject = safeProjects.find((p) => p.id === selectedId) || null;

  if (showCover && selectedProject) {
    return (
      <Suspense
        fallback={
          <ScriptoraAliveTransition
            overlay
            tone="cover"
            title="Sto aprendo Cover Studio…"
            steps={[
              "Sto preparando genere, atmosfera e impatto visivo…",
              "Sto caricando template e readiness…",
            ]}
          />
        }
      >
        <CoverGenerator
          title={selectedProject.config.title}
          subtitle={selectedProject.config.subtitle}
          authorName={selectedProject.config.authorName || selectedProject.config.author || selectedProject.config.writerName}
          description={selectedProject.blueprint?.overview || selectedProject.config.subtitle}
          authorBio={selectedProject.frontMatter?.aboutAuthor || selectedProject.config.authorIdentity?.biography}
          onGenerate={(dataUrl) => {
            setCoverDataUrls((current) => ({ ...current, [selectedProject.id]: dataUrl }));
            setShowCover(false);
            void performExport(selectedProject, dataUrl);
          }}
          projectId={selectedProject.id}
          genre={selectedProject.config.genre || selectedProject.config.category}
          language={selectedProject.config.language || selectedProject.config.titleLanguage}
          onOpenExport={() => setShowCover(false)}
          onClose={() => setShowCover(false)}
        />
      </Suspense>
    );
  }

  const exportableProjects = safeProjects.filter(isProjectComplete);

  const filenameOf = (p: BookProject) =>
    (p.config.title || "book").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";

  const performExport = async (project: BookProject, coverOverride?: string) => {
    const exportProject: BookProject = {
      ...project,
      config: applyAuthorIdentityToConfig({ ...project.config }),
    };

    const blockers = getExportBlockers(exportProject);
    if (blockers.length > 0) {
      toast({
        title: "Export bloccato",
        description: blockers.map((issue) => issue.message).join(" · "),
        variant: "destructive",
      });
      return;
    }

    if (format === "epub") {
      const errors = await validateEpubExport(exportProject);
      if (errors.length > 0) {
        toast({
          title: "EPUB non esportabile",
          description: errors.slice(0, 2).join(" · "),
          variant: "destructive",
        });
        return;
      }
    }

    setIsExporting(true);
    setExportStartedAt(Date.now());
    let charged = false;
    try {
      const filename = filenameOf(exportProject);
      let blob: Blob;
      let ext: "epub" | "docx" | "pdf";
      let mime: string;
      let description: string;

      if (format === "epub") {
        blob = await runEpubExport(exportProject, coverOverride ?? coverDataUrls[project.id]);
        ext = "epub";
        mime = "application/epub+zip";
        description = "EPUB Book";
      } else if (format === "docx") {
        blob = await runDocxExport(exportProject);
        ext = "docx";
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        description = "Word Document";
      } else {
        blob = await runPdfExport(exportProject);
        ext = "pdf";
        mime = "application/pdf";
        description = "PDF Document";
      }

      await chargePremiumOperation(
        "export_premium",
        { projectId: project.id, source: "export_dialog", format },
        undefined,
        [project.id, format],
      );
      charged = true;

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
      if (charged) {
        await refundPremiumOperation("export_premium", {
          projectId: project.id,
          source: "export_dialog_refund",
          format,
        });
      }
      console.error("Export failed:", e);
      toast({
        title: e instanceof ExportBlockedError ? "Export bloccato" : "Esportazione fallita",
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
    if (!coverDataUrls[project.id]) {
      setCoverGateOpen(true);
      return;
    }

    await performExport(project);
  };

  const formatOptions: { value: Format; icon: any; label: string; desc: string }[] = [
    { value: "epub", icon: BookOpen, label: "EPUB", desc: "Indice cliccabile · Kindle/Apple/Kobo" },
    { value: "docx", icon: FileText, label: "Word", desc: "Manoscritto editabile · Bestseller layout" },
    { value: "pdf", icon: FileType, label: "PDF", desc: "Layout 6×9\" · export digitale" },
  ];

  return (
    <div className="scriptora-modal-overlay scriptora-export-modal-overlay fixed inset-0 z-[60] flex items-stretch justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:bg-black/60 sm:p-4 sm:backdrop-blur-sm">
      <div className="scriptora-modal-panel scriptora-export-modal-panel flex h-[100dvh] max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-none border-0 bg-card shadow-2xl sm:h-auto sm:max-h-[min(94dvh,900px)] sm:rounded-2xl sm:border sm:border-border">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileDown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Esporta Libro</h2>
              <p className="text-xs text-muted-foreground">Export digitale — pronto per revisione</p>
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

        <div className="flex shrink-0 gap-1 border-b border-border px-5 pt-4">
          <button
            type="button"
            onClick={() => setStudioTab("documents")}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
              studioTab === "documents" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <FileDown className="h-3.5 w-3.5" />
            Documenti
          </button>
          <button
            type="button"
            onClick={() => setStudioTab("audiobook")}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors ${
              studioTab === "audiobook" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <Headphones className="h-3.5 w-3.5" />
            Audiolibro
          </button>
        </div>

        <div className="scriptora-modal-body scriptora-export-modal-body min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5">
          {isExporting && studioTab === "documents" && (
            <ScriptoraWorkingState
              title="Sto preparando il file finale…"
              tone="export"
              variant="panel"
              startedAt={exportStartedAt}
              steps={[...WORKING_STEP_PRESETS.export]}
            />
          )}
          {studioTab === "audiobook" ? (
            <AudiobookExportPanel
              projects={projects}
              selectedProjectId={selectedId || undefined}
              onSelectProject={setSelectedId}
              compact
            />
          ) : (
          <>
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
                        {!coverDataUrls[p.id] && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-amber-500/80">
                            <ImagePlus className="h-3 w-3 shrink-0" /> Nessuna cover — verrà chiesta all'export
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedProject && !coverDataUrls[selectedProject.id] && (
              <button
                type="button"
                onClick={() => setShowCover(true)}
                className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/16"
              >
                <ImagePlus className="h-4 w-4 shrink-0" />
                Apri Cover Studio per questo libro
              </button>
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
          </>
          )}
        </div>

        {/* Footer — shrink-0 so it's always visible even on very short screens */}
        {studioTab === "documents" && (
        <footer className="scriptora-export-modal-footer flex shrink-0 flex-col gap-3 border-t border-border bg-background/98 px-4 py-4 backdrop-blur-xl sm:bg-muted/20 sm:px-5">
          <CreditCostBadge operation="export_premium" prominent />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="min-h-11 shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
            >
              Annulla
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || !selectedId || exportableProjects.length === 0}
              title={canExport ? "Export" : "Finish your book — unlock export"}
              className="flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 sm:w-auto"
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
        </footer>
        )}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
      <CoverBeforeExportDialog
        open={coverGateOpen && !!selectedProject}
        format={format.toUpperCase() as "EPUB" | "PDF" | "DOCX"}
        onCreateCover={() => {
          setCoverGateOpen(false);
          setShowCover(true);
        }}
        onShipWithoutCover={() => {
          setCoverGateOpen(false);
          if (selectedProject) void performExport(selectedProject);
        }}
        onClose={() => setCoverGateOpen(false)}
      />
    </div>
  );
}
