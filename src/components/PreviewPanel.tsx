import { BookProject, SectionId } from "@/types/book";
import { useEffect, useRef, useMemo } from "react";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";

interface PreviewPanelProps {
  project: BookProject | null;
  activeSection: SectionId | null;
}

export function PreviewPanel({ project, activeSection }: PreviewPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine which content to show in preview based on activeSection
  const previewContent = useMemo(() => {
    if (!project) return null;
    if (!activeSection) return { type: "toc" as const };

    if (activeSection === "blueprint") return { type: "toc" as const };
    if (activeSection === "front-matter") return { type: "front-matter" as const };
    if (activeSection === "back-matter") return { type: "back-matter" as const };

    const chMatch = activeSection.match(/^chapter-(\d+)$/);
    if (chMatch) return { type: "chapter" as const, index: parseInt(chMatch[1]) };

    const subMatch = activeSection.match(/^chapter-(\d+)-sub-(\d+)$/);
    if (subMatch) return { type: "subchapter" as const, chapterIndex: parseInt(subMatch[1]), subIndex: parseInt(subMatch[2]) };

    return { type: "toc" as const };
  }, [activeSection, project]);

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-[hsl(var(--surface))]">
        <p className="text-sm text-muted-foreground/50 italic">Preview will appear here</p>
      </div>
    );
  }

  const { config, blueprint, frontMatter, chapters, backMatter } = project;

  return (
    <div className="h-full bg-[hsl(var(--surface))] flex flex-col">
      <div className="h-8 border-b border-border/50 flex items-center justify-center">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Live Preview</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="max-w-xl mx-auto py-8 px-6">
          <div className="bg-card rounded-lg shadow-xl border border-border/30 overflow-hidden">
            <div className="p-8 space-y-6" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>

              {/* Table of Contents / Blueprint view */}
              {previewContent?.type === "toc" && (
                <>
                  <div className="text-center py-10 border-b border-border/30">
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">{config.title}</h1>
                    {config.subtitle && <p className="text-base text-muted-foreground mt-2 italic">{config.subtitle}</p>}
                  </div>
                  {blueprint && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground/50 mb-3">Table of Contents</p>
                      <ol className="space-y-1.5">
                        {blueprint.chapterOutlines.map((o, i) => (
                          <li key={`stable-${i}`} className="text-sm text-foreground/70">
                            {formatChapterDisplayTitle(i, chapters[i]?.title || o.title, {
                              config,
                              summary: o.summary,
                              totalChapters: config.numberOfChapters,
                            })}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </>
              )}

              {/* Front Matter preview */}
              {previewContent?.type === "front-matter" && frontMatter && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground text-center pb-4 border-b border-border/30">Front Matter</h2>
                  {Object.entries(frontMatter).map(([key, val]) => (
                    <div key={key}>
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      <p className="text-sm leading-7 text-foreground/80">{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Chapter preview */}
              {previewContent?.type === "chapter" && (() => {
                const ch = chapters[previewContent.index];
                if (!ch || !ch.content) return (
                  <div className="py-16 text-center">
                    <p className="text-sm text-muted-foreground/40 italic">Chapter not yet generated.</p>
                  </div>
                );
                return (
                  <div className="space-y-4">
                    <div className="text-center pb-4 border-b border-border/30">
                      <p className="text-xs uppercase tracking-widest text-primary/60 mb-1">
                        {formatChapterDisplayTitle(previewContent.index, ch.title, {
                          config,
                          summary: blueprint?.chapterOutlines?.[previewContent.index]?.summary,
                          totalChapters: config.numberOfChapters,
                        })}
                      </p>
                      <h2 className="text-xl font-bold text-foreground">
                        {resolveChapterTitle(ch.title, previewContent.index, {
                          config,
                          summary: blueprint?.chapterOutlines?.[previewContent.index]?.summary,
                          totalChapters: config.numberOfChapters,
                        })}
                      </h2>
                    </div>
                    <div className="text-sm leading-7 text-foreground/80 whitespace-pre-wrap">{ch.content}</div>
                    {ch.subchapters.map((sub, j) => (
                      <div key={j} className="mt-4">
                        <h3 className="text-base font-semibold text-foreground/90 mb-2">{sub.title}</h3>
                        <div className="text-sm leading-7 text-foreground/75 whitespace-pre-wrap">{sub.content}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Subchapter preview */}
              {previewContent?.type === "subchapter" && (() => {
                const ch = chapters[previewContent.chapterIndex];
                const sub = ch?.subchapters?.[previewContent.subIndex];
                if (!sub) return (
                  <div className="py-16 text-center">
                    <p className="text-sm text-muted-foreground/40 italic">Subchapter not yet generated.</p>
                  </div>
                );
                return (
                  <div className="space-y-4">
                    <div className="pb-4 border-b border-border/30">
                      <p className="text-xs uppercase tracking-widest text-primary/60 mb-1">
                        {formatChapterDisplayTitle(previewContent.chapterIndex, ch?.title, {
                          config,
                          summary: blueprint?.chapterOutlines?.[previewContent.chapterIndex]?.summary,
                          totalChapters: config.numberOfChapters,
                        })} › Subchapter {previewContent.subIndex + 1}
                      </p>
                      <h2 className="text-lg font-bold text-foreground">{sub.title}</h2>
                    </div>
                    <div className="text-sm leading-7 text-foreground/80 whitespace-pre-wrap">{sub.content}</div>
                  </div>
                );
              })()}

              {/* Back Matter preview */}
              {previewContent?.type === "back-matter" && backMatter && (
                <div className="space-y-6">
                  <h2 className="text-lg font-bold text-foreground text-center pb-4 border-b border-border/30">Back Matter</h2>
                  {Object.entries(backMatter).map(([key, val]) => (
                    <div key={key}>
                      <h3 className="text-xs uppercase tracking-widest text-muted-foreground/70 mb-2">
                        {key.replace(/([A-Z])/g, " $1").trim()}
                      </h3>
                      <p className="text-sm leading-7 text-foreground/80">{val}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state for front/back matter not generated */}
              {previewContent?.type === "front-matter" && !frontMatter && (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground/40 italic">Front matter not yet generated.</p>
                </div>
              )}
              {previewContent?.type === "back-matter" && !backMatter && (
                <div className="py-16 text-center">
                  <p className="text-sm text-muted-foreground/40 italic">Back matter not yet generated.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
