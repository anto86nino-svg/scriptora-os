import { useMemo, useRef, useState, useEffect } from "react";
import { BookProject } from "@/types/book";
import { X, FileDown, Loader2, BookOpen, FileText, FileType, Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { generateEpub, validateEpubStructure } from "@/lib/epub";
import { saveBlobAs } from "@/lib/save-file";
import { useToast } from "@/hooks/use-toast";
import { usePlan, PLAN_LIMITS } from "@/lib/plan";
import { UpgradeModal } from "@/components/UpgradeModal";
import { CoverGenerator } from "@/components/CoverGenerator";
import { CoverBeforeExportDialog } from "@/components/CoverBeforeExportDialog";
import { isProjectComplete } from "@/lib/project-status";
import { t, tt, useUILanguage } from "@/lib/i18n";
import { captureException } from "@/lib/monitoring";
import {
  analyzeExportPreflight,
  generateMarkdownExport,
  generatePlainTextExport,
} from "@/lib/export-quality-engine";
import {
  DOCX_EXPORT_PRESETS,
  PDF_EXPORT_PRESETS,
  defaultDocxPreset,
  defaultPdfPreset,
  type DocxExportPreset,
  type PdfExportPreset,
} from "@/lib/export-presets";
import type { PdfExportOptions } from "@/lib/pdf-export";
import type { DocxExportOptions } from "@/lib/docx-export";
import { useRequirementGate } from "@/hooks/useRequirementGate";
import { buildRequirement, summarizeEpubValidationErrors, getExportAuthorGap, applyActiveAuthorIdentityToProject } from "@/lib/scriptora-requirement-gate";
import { REQUIREMENT_ACTION_EVENTS } from "@/lib/scriptora-requirement-actions";
import { useScriptoraModalScrollLock } from "@/lib/viewport-safe";
import { MissingRequirementCard } from "@/components/MissingRequirementCard";
import { CreditOperationHint } from "@/components/billing/CreditOperationHint";
import { loadProjectCoverMap, setProjectCoverDataUrl } from "@/lib/cover-session";

type Format = "epub" | "docx" | "pdf" | "txt" | "md";

interface HomeExportDialogProps {
  open: boolean;
  projects: BookProject[];
  onClose: () => void;
}

export function HomeExportDialog({ open, projects, onClose }: HomeExportDialogProps) {
  useUILanguage();
  useScriptoraModalScrollLock(open);
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string>("");
  const [format, setFormat] = useState<Format>("epub");
  const [pdfPreset, setPdfPreset] = useState<PdfExportPreset>(defaultPdfPreset());
  const [docxPreset, setDocxPreset] = useState<DocxExportPreset>(defaultDocxPreset());
  const [isExporting, setIsExporting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [coverGateOpen, setCoverGateOpen] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [coverDataUrls, setCoverDataUrls] = useState<Record<string, string>>({});
  const { plan } = usePlan();
  const canExport = PLAN_LIMITS[plan].canExport;
  const { showRequirement, requirementDialog } = useRequirementGate();
  const pendingExportProjectRef = useRef<BookProject | null>(null);

  useEffect(() => {
    if (!open) return;
    setCoverDataUrls(loadProjectCoverMap(projects.map((p) => p.id)));
  }, [open, projects]);

  const exportableProjects = projects.filter(isProjectComplete);
  const selectedProject = projects.find(p => p.id === selectedId) || null;
  const hasCover = selectedProject ? !!coverDataUrls[selectedProject.id] : false;

  const preflight = useMemo(() => {
    if (!selectedProject) return null;
    return analyzeExportPreflight(selectedProject, {
      hasCover,
      format,
      pdfPreset: format === "pdf" ? pdfPreset : undefined,
      docxPreset: format === "docx" ? docxPreset : undefined,
    });
  }, [selectedProject, hasCover, format, pdfPreset, docxPreset]);

  if (!open) return null;

  const filenameOf = (p: BookProject) =>
    (p.config.title || "book").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";

  const performExport = async (project: BookProject, coverOverride?: string) => {
    setIsExporting(true);
    try {
      const filename = filenameOf(project);
      let blob: Blob;
      let ext: "epub" | "docx" | "pdf" | "txt" | "md";
      let mime: string;
      let description: string;

      if (format === "epub") {
        const errors = validateEpubStructure(project);
        if (errors.length > 0) {
          showRequirement("epub_not_ready", {
            detail: summarizeEpubValidationErrors(errors),
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
        const options: DocxExportOptions = { preset: docxPreset };
        blob = await generateDocx(project, options);
        ext = "docx";
        mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        description = "Word Document";
      } else if (format === "pdf") {
        const { generatePdf } = await import("@/lib/pdf-export");
        const options: PdfExportOptions = { preset: pdfPreset };
        blob = await generatePdf(project, options);
        ext = "pdf";
        mime = "application/pdf";
        description = "PDF Document";
      } else if (format === "md") {
        const text = generateMarkdownExport(project);
        blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
        ext = "md";
        mime = "text/markdown";
        description = "Markdown Manuscript";
      } else {
        const text = generatePlainTextExport(project);
        blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        ext = "txt";
        mime = "text/plain";
        description = "Plain Text Manuscript";
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
      captureException(e, { area: "export", extra: { format } });
      showRequirement("export_failed");
    } finally {
      setIsExporting(false);
    }
  };

  const continueExportFlow = (project: BookProject) => {
    pendingExportProjectRef.current = project;
    if (format === "epub" && !coverDataUrls[project.id]) {
      setCoverGateOpen(true);
      return;
    }
    void performExport(project);
  };

  const promptAuthorIdentityIfNeeded = (project: BookProject, next: (prepared: BookProject) => void) => {
    const gap = getExportAuthorGap(project);
    if (!gap.needsIdentityPrompt) {
      next(project);
      return;
    }
    showRequirement("missing_author_identity", {
      vars: { name: gap.activePenName },
      onPrimary: () => {
        onClose();
        window.dispatchEvent(new CustomEvent(REQUIREMENT_ACTION_EVENTS.open_author_identity));
      },
      onSecondary: () => next(applyActiveAuthorIdentityToProject(project)),
    });
  };

  const handleExport = async () => {
    if (!canExport) {
      setShowUpgrade(true);
      return;
    }
    const project = selectedProject;
    if (!project) {
      showRequirement("missing_project");
      return;
    }
    if (!isProjectComplete(project)) {
      showRequirement("incomplete_book");
      return;
    }
    promptAuthorIdentityIfNeeded(project, continueExportFlow);
  };

  const formatOptions: { value: Format; icon: typeof BookOpen; label: string; desc: string }[] = [
    { value: "epub", icon: BookOpen, label: "EPUB", desc: t("export_format_epub_desc") },
    { value: "docx", icon: FileText, label: "Word", desc: t("export_format_docx_desc") },
    { value: "pdf", icon: FileType, label: "PDF", desc: t("export_format_pdf_desc") },
    { value: "txt", icon: FileText, label: "TXT", desc: t("export_format_txt_desc") },
    { value: "md", icon: FileText, label: "Markdown", desc: t("export_format_md_desc") },
  ];

  return (
    <div className="scriptora-modal-overlay">
      <div className="scriptora-modal-panel scriptora-mobile-work-panel max-w-lg">
        <div className="scriptora-mobile-work-panel__header flex shrink-0 items-center justify-between border-b border-border p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileDown className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{t("export_dialog_title")}</h2>
              <p className="text-xs text-muted-foreground">{t("export_dialog_subtitle_premium")}</p>
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

        <div className="scriptora-modal-body scriptora-mobile-work-panel__body space-y-5 p-4 sm:p-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
              {t("export_dialog_project")}
            </label>
            {exportableProjects.length === 0 ? (
              <MissingRequirementCard
                payload={buildRequirement("incomplete_book")}
                onPrimary={onClose}
                compact
              />
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {exportableProjects.map(p => {
                  const wordCount = p.chapters.reduce(
                    (sum, c) => sum + (c.content?.split(/\s+/).filter(Boolean).length || 0),
                    0,
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

          {selectedProject && format === "pdf" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("export_dialog_preset")}
              </label>
              <select
                value={pdfPreset}
                onChange={e => setPdfPreset(e.target.value as PdfExportPreset)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {Object.values(PDF_EXPORT_PRESETS).map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {PDF_EXPORT_PRESETS[pdfPreset].description}
              </p>
            </div>
          )}

          {selectedProject && format === "docx" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                {t("export_dialog_preset")}
              </label>
              <select
                value={docxPreset}
                onChange={e => setDocxPreset(e.target.value as DocxExportPreset)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {Object.values(DOCX_EXPORT_PRESETS).map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {DOCX_EXPORT_PRESETS[docxPreset].description}
              </p>
            </div>
          )}

          {selectedProject && !hasCover && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{t("export_no_cover_saved_title")}</p>
              <p className="mt-1 text-xs leading-5">{t("export_no_cover_saved_hint")}</p>
            </div>
          )}

          {selectedProject && preflight && (
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("export_preflight_title")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{preflight.labelText}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-foreground">{preflight.score}</p>
                  <p className="text-[11px] text-muted-foreground">{t("export_preflight_score")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {preflight.checks.slice(0, 8).map(check => (
                  <div key={check.id} className="flex items-start gap-2 text-xs">
                    {check.ok ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-0.5" />
                    )}
                    <span className="text-muted-foreground">
                      {check.label}: <span className="text-foreground">{check.detail}</span>
                    </span>
                  </div>
                ))}
              </div>
              {preflight.warnings.length > 0 && (
                <div className="space-y-1.5 border-t border-border/70 pt-3">
                  {preflight.warnings.slice(0, 3).map(warning => (
                    <p key={warning} className="text-xs text-muted-foreground leading-5">
                      {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border/60 px-4 pt-3">
          <CreditOperationHint operation="advanced_export" showBalance />
        </div>

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
        format={format === "epub" ? "EPUB" : format === "pdf" ? "PDF" : format === "docx" ? "DOCX" : "EPUB"}
        onCreateCover={() => {
          setCoverGateOpen(false);
          setShowCover(true);
        }}
        onShipWithoutCover={() => {
          setCoverGateOpen(false);
          const target = pendingExportProjectRef.current ?? selectedProject;
          if (target) void performExport(target);
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
            setProjectCoverDataUrl(selectedProject.id, dataUrl);
            setShowCover(false);
            const target = pendingExportProjectRef.current ?? selectedProject;
            void performExport(target, dataUrl);
          }}
          onClose={() => setShowCover(false)}
        />
      )}
      {requirementDialog}
    </div>
  );
}
