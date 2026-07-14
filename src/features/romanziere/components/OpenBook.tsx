import { useEffect, useState } from "react";
import { BookCover } from "@/features/romanziere/components/BookCover";
import { BookPage } from "@/features/romanziere/components/BookPage";
import { cn } from "@/lib/utils";
import "@/features/romanziere/romanziere.css";

export interface OpenBookProps {
  bookTitle: string;
  author: string;
  chapterTitle: string;
  chapterNumber: number;
  content: string;
  outline?: string;
  isOpen: boolean;
  isGenerating: boolean;
  isTurning?: boolean;
  progressPercent: number;
  statusMessage?: string;
}

function splitForSpread(content: string): [string, string] {
  const clean = content.trim();
  if (!clean) return ["", ""];
  if (clean.length < 760) return ["", clean];

  const midpoint = Math.floor(clean.length / 2);
  const laterBreak = clean.indexOf("\n\n", midpoint);
  const earlierBreak = clean.lastIndexOf("\n\n", midpoint);
  const splitAt = laterBreak >= 0 && laterBreak - midpoint < 500
    ? laterBreak
    : earlierBreak > 280
      ? earlierBreak
      : clean.indexOf(" ", midpoint);

  if (splitAt <= 0) return ["", clean];
  return [clean.slice(0, splitAt).trim(), clean.slice(splitAt).trim()];
}

export function OpenBook({
  bookTitle,
  author,
  chapterTitle,
  chapterNumber,
  content,
  outline,
  isOpen,
  isGenerating,
  isTurning = false,
  progressPercent,
  statusMessage,
}: OpenBookProps) {
  const [singlePage, setSinglePage] = useState(
    () => typeof window !== "undefined" && window.matchMedia?.("(max-width: 760px)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(max-width: 760px)");
    const sync = () => setSinglePage(query.matches);
    sync();
    query.addEventListener?.("change", sync);
    return () => query.removeEventListener?.("change", sync);
  }, []);

  const [leftText, rightText] = singlePage ? ["", content] : splitForSpread(content);
  const leftContent = leftText || outline || "";
  const rightContent = rightText || (leftText ? "" : content);

  return (
    <div
      className="romanziere-book-stage"
      data-open={isOpen ? "true" : "false"}
      data-writing={isGenerating ? "true" : "false"}
    >
      <div className={cn("romanziere-book", isTurning && "is-turning")}>
        <div className="romanziere-back-cover" aria-hidden="true" />
        <div className="romanziere-page-edges" aria-hidden="true" />
        <div className="romanziere-spread">
          <BookPage
            side="left"
            eyebrow={`${bookTitle} · ${author}`}
            title={chapterTitle}
            content={leftContent}
            pageNumber={Math.max(1, chapterNumber * 2 - 1)}
            placeholder={outline ? "" : "Il capitolo comincia sulla pagina accanto."}
          />
          <BookPage
            side="right"
            eyebrow={`Capitolo ${chapterNumber}`}
            title={leftText ? "Continua" : chapterTitle}
            content={rightContent}
            pageNumber={chapterNumber * 2}
            isGenerating={isGenerating}
            placeholder={isGenerating ? "La prima frase sta per apparire…" : "Premi “Genera capitolo” e lascia che la storia cominci."}
          />
          <span className="romanziere-book-gutter" aria-hidden="true" />
          <span className="romanziere-turning-sheet" aria-hidden="true" />
        </div>
        <BookCover title={bookTitle} author={author} />
      </div>

      <div className="romanziere-live-progress" aria-hidden="true">
        <span style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
      </div>
      <p className="romanziere-live-message">
        {isGenerating ? statusMessage || "La piuma sta seguendo il filo della storia…" : `${progressPercent}% del capitolo`}
      </p>
    </div>
  );
}
