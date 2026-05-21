import { useState } from "react";
import { BookProject } from "@/types/book";
import { RefreshCw, ChevronRight, Sparkles, Loader2, Download, Image, Plus, Lock } from "lucide-react";
import { generateEpub, downloadEpub, validateEpubStructure } from "@/lib/epub";
import { CoverGenerator } from "./CoverGenerator";
import { usePlan, PLAN_LIMITS } from "@/lib/plan";
import { isDevMode } from "@/lib/dev-mode";
import { UpgradeModal } from "@/components/UpgradeModal";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

interface BookPreviewProps {
  project: BookProject;
  isGenerating: boolean;
  onGenerateNext: () => void;
  onRegenerateChapter: (index: number) => void;
  onRewriteChapter: (index: number) => void;
  onGenerateChapter: (index: number) => void;
  onGenerateSubchapter: (chapterIndex: number, subIndex: number) => void;
}

export function BookPreview({
  project, isGenerating, onGenerateNext,
  onRegenerateChapter, onRewriteChapter,
  onGenerateChapter, onGenerateSubchapter,
}: BookPreviewProps) {
  const { config, blueprint, frontMatter, chapters, backMatter, phase } = project;
  const [isExporting, setIsExporting] = useState(false);
  const [showCover, setShowCover] = useState(false);
  const [coverDataUrl, setCoverDataUrl] = useState<string | undefined>();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { plan } = usePlan();
  // Honour dev-mode plan override: Free does NOT export, Beta/Pro/Premium do.
  const canExport = PLAN_LIMITS[plan].canExport;

  const handleExportEpub = async () => {
    if (!canExport) {
      setShowUpgrade(true);
      return;
    }
    // Run validation first
    const errors = validateEpubStructure(project);
    if (errors.length > 0) {
      console.error("EPUB validation failed:", errors);
      alert(`EPUB export blocked — validation errors:\n\n${errors.join("\n")}`);
      return;
    }

    setIsExporting(true);
    try {
      const blob = await generateEpub(project, coverDataUrl);
      const filename = config.title.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_") || "book";
      downloadEpub(blob, filename);
    } catch (e) {
      console.error("EPUB export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const isChapterGenerated = (i: number) => chapters[i] && chapters[i].content.length > 0;

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6 space-y-6">
      {/* Header */}
      <div className="text-center border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-foreground">{config.title || "Untitled Book"}</h1>
        {config.subtitle && <p className="text-muted-foreground mt-1">{config.subtitle}</p>}
        <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="px-2 py-0.5 rounded bg-surface">{config.language}</span>
          <span className="px-2 py-0.5 rounded bg-surface">{config.numberOfChapters} chapters</span>
          <span className="px-2 py-0.5 rounded bg-surface capitalize">{config.chapterLength}</span>
          <span className="px-2 py-0.5 rounded bg-surface capitalize">{phase}</span>
        </div>

        {chapters.length > 0 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setShowCover(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
            >
              <Image className="h-3 w-3" />
              {coverDataUrl ? "Edit Cover" : "Create Cover"}
            </button>
            <button
              onClick={handleExportEpub}
              disabled={isExporting}
              title={canExport ? "Export EPUB" : "Finish your book — unlock export"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {isExporting ? <Loader2 className="h-3 w-3 animate-spin" /> : !canExport ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
              {!canExport ? "Unlock Export" : "Export EPUB"}
            </button>
          </div>
        )}
      </div>

      {/* Cover preview */}
      {coverDataUrl && (
        <div className="flex justify-center">
          <img src={coverDataUrl} alt="Book Cover" className="h-48 rounded shadow-md" />
        </div>
      )}

      {/* Blueprint */}
      {blueprint && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Blueprint</h2>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{blueprint.overview}</p>
          {blueprint.themes.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {blueprint.themes.map((t, i) => (
                <span key={`stable-${i}`} className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{t}</span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Front Matter */}
      {frontMatter && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Front Matter</h2>
          {Object.entries(frontMatter).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{val}</p>
            </div>
          ))}
        </section>
      )}

      {/* Chapter Generation Controls */}
      {phase === "chapters" && blueprint && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Chapters</h2>
          {blueprint.chapterOutlines.map((outline, i) => (
            <div key={`stable-${i}`} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {formatChapterDisplayTitle(i, outline.title, { config, summary: outline.summary, totalChapters: config.numberOfChapters })}
                  </h3>
                  <p className="text-xs text-muted-foreground">{outline.summary}</p>
                </div>
                {!isChapterGenerated(i) ? (
                  <button
                    onClick={() => onGenerateChapter(i)}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                    Generate
                  </button>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => onRegenerateChapter(i)} disabled={isGenerating}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40" title="Regenerate">
                      <RefreshCw className="h-3 w-3" />
                    </button>
                    <button onClick={() => onRewriteChapter(i)} disabled={isGenerating}
                      className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40" title="Rewrite with depth">
                      <Sparkles className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Chapter content */}
              {isChapterGenerated(i) && (
                <>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{chapters[i].content}</p>

                  {/* Existing subchapters */}
                  {chapters[i].subchapters.length > 0 && (
                    <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-3">
                      {chapters[i].subchapters.map((sub, j) => (
                        <div key={j}>
                          <h4 className="text-xs font-medium text-primary">{sub.title}</h4>
                          <p className="text-sm text-foreground/70 whitespace-pre-wrap mt-1">{sub.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add subchapter button */}
                  {config.subchaptersEnabled && (
                    <button
                      onClick={() => onGenerateSubchapter(i, chapters[i].subchapters.length)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-opacity mt-2"
                    >
                      {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add Subchapter
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Already generated chapters (other phases) */}
      {phase !== "chapters" && chapters.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Chapters</h2>
          {chapters.map((ch, i) => (
            <div key={`stable-${i}`} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  {formatChapterDisplayTitle(i, ch.title, { config, summary: blueprint?.chapterOutlines?.[i]?.summary, totalChapters: config.numberOfChapters })}
                </h3>
                <div className="flex gap-1">
                  <button onClick={() => onRegenerateChapter(i)} disabled={isGenerating}
                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40" title="Regenerate">
                    <RefreshCw className="h-3 w-3" />
                  </button>
                  <button onClick={() => onRewriteChapter(i)} disabled={isGenerating}
                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-40" title="Rewrite with depth">
                    <Sparkles className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{ch.content}</p>
              {ch.subchapters.length > 0 && (
                <div className="pl-4 border-l-2 border-primary/20 space-y-3 mt-3">
                  {ch.subchapters.map((sub, j) => (
                    <div key={j}>
                      <h4 className="text-xs font-medium text-primary">{sub.title}</h4>
                      <p className="text-sm text-foreground/70 whitespace-pre-wrap mt-1">{sub.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Back Matter */}
      {backMatter && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Back Matter</h2>
          {Object.entries(backMatter).map(([key, val]) => (
            <div key={key} className="space-y-1">
              <h3 className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{val}</p>
            </div>
          ))}
        </section>
      )}

      {/* Generate Next (front-matter / back-matter only) */}
      {(phase === "front-matter" || phase === "back-matter") && (
        <div className="pt-4 border-t border-border">
          <button
            onClick={onGenerateNext}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
            ) : (
              <><ChevronRight className="h-4 w-4" />
                {phase === "front-matter" ? "Generate Front Matter" : "Generate Back Matter"}</>
            )}
          </button>
        </div>
      )}

      {phase === "complete" && (
        <div className="text-center py-4 text-sm font-medium text-primary">
          ✅ Book generation complete!
        </div>
      )}

      {showCover && (
        <CoverGenerator
          title={config.title}
          subtitle={config.subtitle}
          onGenerate={(dataUrl) => { setCoverDataUrl(dataUrl); setShowCover(false); }}
          onClose={() => setShowCover(false)}
        />
      )}
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} reason="export" currentPlan={plan} />
    </div>
  );
}
