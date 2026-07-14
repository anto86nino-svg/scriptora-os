import { useEffect, useRef } from "react";
import { Feather } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BookPageProps {
  side: "left" | "right";
  eyebrow?: string;
  title: string;
  content: string;
  pageNumber: number;
  isGenerating?: boolean;
  placeholder?: string;
}

function paragraphsFrom(content: string): string[] {
  return content
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function BookPage({
  side,
  eyebrow,
  title,
  content,
  pageNumber,
  isGenerating = false,
  placeholder = "Questa pagina attende ancora le sue parole.",
}: BookPageProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const paragraphs = paragraphsFrom(content);

  useEffect(() => {
    if (!isGenerating || !scrollRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      const page = scrollRef.current;
      if (page) page.scrollTop = page.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [content, isGenerating]);

  return (
    <article
      className={cn("romanziere-page", `romanziere-page-${side}`)}
      aria-busy={isGenerating}
      data-writing={isGenerating ? "true" : "false"}
    >
      <div className="romanziere-paper-grain" aria-hidden="true" />
      <div className="romanziere-page-content" ref={scrollRef}>
        {eyebrow && <p className="romanziere-page-eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        <span className="romanziere-page-flourish" aria-hidden="true">❦</span>

        {paragraphs.length > 0 ? (
          <div className="romanziere-prose">
            {paragraphs.map((paragraph, index) => {
              const isLast = index === paragraphs.length - 1;
              return (
                <p key={`${index}-${paragraph.slice(0, 24)}`}>
                  {paragraph}
                  {isLast && isGenerating && (
                    <span className="romanziere-live-ink" aria-hidden="true">
                      <span className="romanziere-ink-caret" />
                      <Feather className="romanziere-writing-quill" />
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        ) : (
          <div className="romanziere-page-placeholder">
            <Feather aria-hidden="true" />
            <p>{placeholder}</p>
            {isGenerating && (
              <span className="romanziere-live-ink romanziere-live-ink-empty" aria-hidden="true">
                <span className="romanziere-ink-caret" />
                <Feather className="romanziere-writing-quill" />
              </span>
            )}
          </div>
        )}
      </div>
      <footer className="romanziere-page-number" aria-hidden="true">— {pageNumber} —</footer>
    </article>
  );
}
