import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Loader2, BookOpen, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LiveBook } from "@/hooks/useAutoBestseller";
import { getBookProgress, getChapterProgress } from "@/lib/book-progress";
import { ProgressBar } from "@/components/AutoBestseller/ProgressBar";
import { formatChapterDisplayTitle, resolveChapterTitle } from "@/lib/chapter-titles";

/**
 * Typewriter hook — reveals `text` character-by-character for a "live writing" feel.
 * If `enabled` is false (or already done), shows full text immediately.
 */
function useTypewriter(text: string | undefined, enabled: boolean, charsPerTick = 12, tickMs = 16) {
  const [shown, setShown] = useState(text || "");
  const indexRef = useRef(0);
  const lastTextRef = useRef<string>("");

  useEffect(() => {
    if (!text) {
      setShown("");
      indexRef.current = 0;
      lastTextRef.current = "";
      return;
    }
    if (!enabled) {
      setShown(text);
      indexRef.current = text.length;
      lastTextRef.current = text;
      return;
    }
    // If text changed (new chapter), reset; if same text, continue from where we are
    if (text !== lastTextRef.current) {
      // If new text is an extension, keep position; otherwise reset
      if (!text.startsWith(lastTextRef.current)) {
        indexRef.current = 0;
        setShown("");
      }
      lastTextRef.current = text;
    }
    if (indexRef.current >= text.length) {
      setShown(text);
      return;
    }
    const id = setInterval(() => {
      indexRef.current = Math.min(text.length, indexRef.current + charsPerTick);
      setShown(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) clearInterval(id);
    }, tickMs);
    return () => clearInterval(id);
  }, [text, enabled, charsPerTick, tickMs]);

  return { shown, isTyping: enabled && !!text && indexRef.current < (text?.length || 0) };
}

interface Props {
  liveBook: LiveBook;
  isRunning: boolean;
  totalChaptersHint?: number;
}

/**
 * BookLivePreview — renders the book as it is being generated.
 * Append-only: never clears prior content. Auto-scrolls when a new chapter arrives.
 */
export function BookLivePreview({ liveBook, isRunning, totalChaptersHint }: Props) {
  const { title, subtitle, outlines, chapters, currentStageLabel } = liveBook;
  const [tocOpen, setTocOpen] = useState(true);
  const lastChapterRef = useRef<HTMLDivElement | null>(null);
  const lastSeenIndexRef = useRef<number>(-1);

  // Soft auto-scroll only when a NEW chapter arrives (not on every content tick)
  useEffect(() => {
    const last = chapters[chapters.length - 1];
    if (!last) return;
    if (last.index > lastSeenIndexRef.current) {
      lastSeenIndexRef.current = last.index;
      lastChapterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [chapters]);

  const totalCh = outlines?.length ?? totalChaptersHint ?? chapters.length;
  const doneCh = chapters.filter((c) => c.phase === "done").length;
  const activeChapter = [...chapters].reverse().find((c) => c.phase === "writing" || c.phase === "refining");
  const activeLabel = activeChapter
    ? activeChapter.phase === "refining"
      ? `Capitolo ${activeChapter.index + 1}/${totalCh} in rifinitura`
      : `Capitolo ${activeChapter.index + 1}/${totalCh} in scrittura`
    : doneCh > 0
      ? `${doneCh}/${totalCh} capitoli completati`
      : "Preparazione manoscritto";
  const hasAnyContent = !!title || !!outlines?.length || chapters.length > 0;
  const bookProgress = getBookProgress(liveBook, totalChaptersHint);

  if (!hasAnyContent) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{currentStageLabel || "Starting…"}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sticky status bar with overall book progress */}
      <div
        className={cn(
          "sticky top-0 z-10 space-y-2 rounded-md border border-border/60 bg-card/95 px-4 py-2.5 backdrop-blur",
          isRunning && "border-primary/40",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {isRunning ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            ) : (
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
            )}
            <p className="truncate text-sm font-medium">{currentStageLabel}</p>
          </div>
          {totalCh > 0 && (
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs font-semibold tabular-nums text-foreground">
                {bookProgress.percent}%
              </span>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                {doneCh}/{totalCh} ch
              </Badge>
            </div>
          )}
        </div>
        <ProgressBar
          percent={bookProgress.percent}
          variant={bookProgress.percent === 100 ? "success" : "primary"}
          animated={isRunning && bookProgress.percent < 100}
        />
      </div>

      {/* Book header */}
      {title && (
        <Card className="border-border/60">
          <CardContent className="py-6 text-center">
            <BookOpen className="mx-auto mb-3 h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl">{title}</h2>
            {subtitle && (
              <p className="mt-2 text-sm italic text-muted-foreground md:text-base">{subtitle}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Table of contents (collapsible) */}
      {outlines && outlines.length > 0 && (
        <Card className="border-border/60">
          <button
            onClick={() => setTocOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/30"
          >
            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Indice · {outlines.length} capitoli
            </span>
            {tocOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {tocOpen && (
            <CardContent className="pt-0">
              <ol className="space-y-1.5 text-sm">
                {outlines.map((o, i) => {
                  const ch = chapters.find((c) => c.index === i);
                  const status = ch?.phase ?? "pending";
                  return (
                    <li
                      key={`stable-${i}`}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-1",
                        status === "done" && "text-foreground",
                        status === "writing" && "bg-primary/5 text-primary",
                        status === "refining" && "bg-amber-500/5 text-amber-600 dark:text-amber-400",
                        status !== "done" && status !== "writing" && status !== "refining" && "text-muted-foreground/70",
                      )}
                    >
                      <span className="w-6 shrink-0 text-right text-xs tabular-nums">{i + 1}.</span>
                      <span className="min-w-0 flex-1 truncate">{o.title}</span>
                      {status === "writing" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {status === "refining" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {status === "done" && <Check className="h-3 w-3 text-emerald-500" />}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          )}
        </Card>
      )}

      {/* Chapters — append only */}
      {chapters.map((ch, idx) => {
        const isLast = idx === chapters.length - 1;
        // Use typewriter ONLY as fallback when no real streaming content is flowing
        // (backend now streams token-per-token, so we render content directly)
        const useTw = false;
        const showCaret = isLast && isRunning && ch.phase === "writing";
        return (
          <ChapterCard
            key={ch.index}
            chapter={ch}
            innerRef={isLast ? lastChapterRef : undefined}
            useTypewriter={useTw}
            showCaret={showCaret}
          />
        );
      })}
    </div>
  );
}

function ChapterCard({
  chapter: ch,
  innerRef,
  useTypewriter: tw,
  showCaret = false,
}: {
  chapter: LiveBook["chapters"][number];
  innerRef?: React.RefObject<HTMLDivElement>;
  useTypewriter: boolean;
  showCaret?: boolean;
}) {
  const { shown, isTyping } = useTypewriter(ch.content, tw);
  const displayed = tw ? shown : ch.content || "";
  const showBlinkingCaret = showCaret || isTyping;
  const progress = getChapterProgress(ch);
  const variant =
    progress.phase === "done" ? "success" : progress.phase === "refining" ? "warning" : "primary";
  return (
    <Card ref={innerRef} className="border-border/60 transition-all">
      <CardContent className="py-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {formatChapterDisplayTitle(ch.index, ch.title, { language: "Italian" })}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold leading-tight">
              {resolveChapterTitle(ch.title, ch.index, { language: "Italian" })}
            </h3>
          </div>
          <ChapterStatusBadge phase={ch.phase} score={ch.score} />
        </div>
        {/* Per-chapter progress */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate">{progress.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground/80">{progress.percent}%</span>
          </div>
          <ProgressBar
            percent={progress.percent}
            variant={variant}
            animated={progress.phase !== "done"}
            size="sm"
          />
        </div>
        {displayed ? (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 dark:prose-invert">
            {displayed}
            {showBlinkingCaret && (
              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{ch.phase === "refining" ? "Refining draft…" : "Starting to write…"}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChapterStatusBadge({ phase, score }: { phase: "writing" | "refining" | "done"; score?: number }) {
  if (phase === "done") {
    const good = (score ?? 0) >= 7;
    return (
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 text-[10px] uppercase tracking-wider border-0",
          good
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        )}
      >
        Done{score ? ` · ${score}/10` : ""}
      </Badge>
    );
  }
  if (phase === "refining") {
    return (
      <Badge variant="outline" className="shrink-0 border-0 bg-amber-500/10 text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400">
        Refining
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="shrink-0 border-0 bg-primary/10 text-[10px] uppercase tracking-wider text-primary">
      Writing
    </Badge>
  );
}

interface ContinueProps {
  onContinue: () => void;
}

export function GenerationErrorPanel({
  message,
  hasPartialContent,
  onContinue,
  onReset,
}: { message: string; hasPartialContent: boolean; onReset: () => void } & Partial<ContinueProps>) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="py-5">
        <p className="font-medium text-destructive">Generation interrupted</p>
        <p className="mt-1 text-sm text-muted-foreground">{message}</p>
        {hasPartialContent && (
          <p className="mt-2 text-xs text-muted-foreground">
            Your generated content above is preserved.
          </p>
        )}
        <div className="mt-3 flex gap-2">
          {onContinue && (
            <Button size="sm" onClick={onContinue}>
              Continue generation
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onReset}>
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
