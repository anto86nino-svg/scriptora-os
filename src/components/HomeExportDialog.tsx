import { useState } from "react";
import { BookProject } from "@/types/book";
import { X, FileDown, Loader2, BookOpen, FileText, FileType, Lock } from "lucide-react";
import { generateEpub, validateEpubStructure } from "@/lib/epub";
import { saveBlobAs } from "@/lib/save-file";
import { useToast } from "@/hooks/use-toast";
import { usePlan, PLAN_LIMITS } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CoverGenerator } from "@/components/CoverGenerator";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { isProjectComplete } from "@/lib/project-status";
import { t, tt, useUILanguage } from "@/lib/i18n";

type Format = "epub" | "docx" | "pdf";

interface HomeExportDialogProps {
  open: boolean;
  projects: BookProject[];
  onClose: () => void;
}

export function HomeExportDialog({ open, projects, onClose }: HomeExportDialogProps) {
  useUILanguage();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [format, setFormat] = useState<Format>("epub");
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [coverDataUrls, setCoverDataUrls] = useState<Record<string, string>>({});
  const { plan } = usePlan();
  // Honour the dev-mode plan override: only the simulated tier's permissions
  // apply (Premium/Pro/Beta unlock export, Free does not).
  const canExport = PLAN_LIMITS[plan].canExport;

  if (!open) return null;

  const exportableProjects = projects.filter(isProjectComplete);
  const selectedProject = projects.find(p => p.id === selectedId) || null;

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
            title: t("export_toast_epub_invalid"),
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
        toast({ title: t("export_toast_saved"), description: `${filename}.${ext}` });
        onClose();
      }
    } catch (e) {
      console.error("Export failed:", e);
      toast({
        title: t("export_toast_failed"),
        description: e instanceof Error ? e.message : t("export_toast_failed"),
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
      toast({ title: t("export_toast_select_project"), variant: "destructive" });
      return;
    }
    if (!isProjectComplete(project)) {
      toast({
        title: t("export_toast_incomplete"),
        description: t("export_toast_incomplete_desc"),
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
    { value: "epub", icon: BookOpen, label: "EPUB", desc: t("export_format_epub_desc") },
    { value: "docx", icon: FileText, label: "Word", desc: t("export_format_docx_desc") },
    { value: "pdf", icon: FileType, label: "PDF", desc: t("export_format_pdf_desc") },
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
              <h2 className="text-sm font-semibold text-foreground">{t("export_dialog_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("export_dialog_subtitle")}</p>
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
              {t("export_dialog_project")}
            </label>
            {exportableProjects.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">
                  {t("export_dialog_no_books")}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t("export_dialog_no_books_hint")}
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
                          {tt("export_chapters_words", {
                            chapters: p.chapters.length,
                            words: wordCount.toLocaleString(),
                            language: p.config.language,
                          })}
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
                {t("export_dialog_format")}
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
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/20 p-4">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40"
          >
            {t("export_dialog_cancel")}
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
                {t("export_dialog_exporting")}
              </>
            ) : !canExport ? (
              <>
                <Lock className="h-3 w-3" />
                Unlock Export
              </>
            ) : (
              <>
                <FileDown className="h-3 w-3" />
                {t("export_dialog_export")}
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
          projectGenre={selectedProject.config.genre}
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
