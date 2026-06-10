import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookProject } from "@/types/book";
import { X, FileDown, Loader2, BookOpen, FileText, FileType, Lock, ImagePlus } from "lucide-react";
import { generateEpub, validateEpubStructure } from "@/lib/epub";
import { generateDocx } from "@/lib/docx-export";
import { generatePdf } from "@/lib/pdf-export";
import { saveBlobAs } from "@/lib/save-file";
import { useToast } from "@/hooks/use-toast";
import { usePlan, PLAN_LIMITS } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CoverGenerator } from "@/components/CoverGenerator";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { analyzeExportReadiness, type ExportIssue } from "@/lib/export-readiness";
import { ExportIssuesDialog } from "@/components/ExportIssuesDialog";
import { queueExportFixNavigation } from "@/lib/export-fix-navigation";
import { requireCredits, InsufficientCreditsError } from "@/lib/billing";
import { CreditCostBadge } from "@/components/billing/CreditCostBadge";

type Format = "epub" | "docx" | "pdf";

interface HomeExportDialogProps {
  open: boolean;
  projects: BookProject[];
  onClose: () => void;
}

export function HomeExportDialog({ open, projects, onClose }: HomeExportDialogProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [format, setFormat] = useState<Format>("epub");
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [coverDataUrls, setCoverDataUrls] = useState<Record<string, string>>({});
  const [exportIssuesOpen, setExportIssuesOpen] = useState(false);
  const [exportIssues, setExportIssues] = useState<ExportIssue[]>([]);
  const { plan } = usePlan();
  const canExport = PLAN_LIMITS[plan].canExport;

  if (!open) return null;

  const selectedProject = projects.find((p) => p.id === selectedId) || null;

  const filenameOf = (p: BookProject) =>
    (p.config.title || "book").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";

  const performExport = async (project: BookProject, coverOverride?: string) => {
    setIsExporting(true);
    try {
      requireCredits("export_premium", { projectId: project.id, format });
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
        blob = await generateEpub(project, coverOverride ?? coverDataUrls[project.id]);
        ext = "epub";
        mime = "application/epub+zip";
        description = "EPUB Book";
      } else if (format === "docx") {
        blob = await generateDocx(project);
        ext = "docx";
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        description = "Word Document";
      } else {
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
        title: e instanceof InsufficientCreditsError ? "Crediti insufficienti" : "Esportazione fallita",
        description: e instanceof Error ? e.message : "Errore sconosciuto",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportIssueFix = (issue: ExportIssue) => {
    if (!selectedProject) return;
    if (issue.fix.type === "open_cover") {
      setExportIssuesOpen(false);
      setShowCover(true);
      return;
    }
    queueExportFixNavigation(selectedProject.id, issue.fix);
    setExportIssuesOpen(false);
    onClose();
    navigate("/app");
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

    const readiness = analyzeExportReadiness(project, { hasCover: !!coverDataUrls[project.id] });
    if (!readiness.canExport) {
      setExportIssues(readiness.blockers);
      setExportIssuesOpen(true);
      return;
    }

    if (format === "epub" && !coverDataUrls[project.id]) {
      setCoverGateOpen(true);
      return;
    }

    await performExport(project);
  };

  const formatOptions: { value: Format; icon: typeof BookOpen; label: string; desc: string }[] = [
    { value: "epub", icon: BookOpen, label: "EPUB", desc: "Indice cliccabile · Kindle/Apple/Kobo" },
    { value: "docx", icon: FileText, label: "Word", desc: "Manoscritto editabile · Bestseller layout" },
    { value: "pdf", icon: FileType, label: "PDF", desc: "KDP 6×9\" · Print-ready" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-h-[calc(100dvh-2rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
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
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Progetto
            </label>
            {projects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">Nessun progetto disponibile.</p>
              </div>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                {projects.map((p) => {
                  const readiness = analyzeExportReadiness(p, { hasCover: !!coverDataUrls[p.id] });
                  const wordCount = p.chapters.reduce(
                    (sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0),
                    0,
                  );
                  return (
                    <label
                      key={p.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
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
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {p.config.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {p.chapters.length} cap · {wordCount.toLocaleString()} parole · {p.config.language}
                        </p>
                        {!readiness.canExport && (
                          <span className="mt-0.5 text-[10px] text-amber-500/90">
                            {readiness.blockers.length} problema/i da risolvere
                          </span>
                        )}
                        {readiness.canExport && !coverDataUrls[p.id] && (
                          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ImagePlus className="h-3 w-3 shrink-0" /> Cover opzionale
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Formato
              </label>
              <div className="grid grid-cols-1 gap-2">
                {formatOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
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
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border bg-muted/20 p-4">
          <CreditCostBadge operation="export_premium" prominent />
          <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40"
          >
            Annulla
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || !selectedId || projects.length === 0}
            title={canExport ? "Export" : "Finish your book — unlock export"}
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
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
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
      <ExportIssuesDialog
        open={exportIssuesOpen}
        issues={exportIssues}
        onClose={() => setExportIssuesOpen(false)}
        onFix={handleExportIssueFix}
      />
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
      {showCover && selectedProject && (
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
          onClose={() => setShowCover(false)}
        />
      )}
    </div>
  );
}
