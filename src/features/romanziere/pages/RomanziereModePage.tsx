import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Feather,
  Home,
  Square,
  WandSparkles,
} from "lucide-react";
import { OpenBook } from "@/features/romanziere/components/OpenBook";
import {
  getLastRomanziereChapter,
  setLastRomanziereChapter,
} from "@/features/romanziere/store/romanziere-store";
import type { RomanziereModePageProps } from "@/features/romanziere/types";
import { formatChapterDisplayTitle } from "@/lib/chapter-titles";

function clampChapter(index: number, count: number): number {
  return Math.min(Math.max(0, index), Math.max(0, count - 1));
}

function firstUsefulChapter(
  project: NonNullable<RomanziereModePageProps["project"]>,
  generatingSet: Set<string>,
): number {
  for (const key of generatingSet) {
    const match = key.match(/^chapter-(\d+)$/);
    if (match) return Number.parseInt(match[1], 10);
  }

  const stored = getLastRomanziereChapter(project.id);
  if (stored != null) return stored;

  const firstEmpty = project.chapters.findIndex((chapter) => !chapter?.content?.trim());
  return firstEmpty >= 0 ? firstEmpty : Math.max(0, project.chapters.length - 1);
}

export default function RomanziereModePage({
  project,
  activeChapterIndex,
  generatingSet,
  chunkProgress,
  onSelectChapter,
  onGenerateChapter,
  onCancelGeneration,
  onExit,
  onDashboard,
}: RomanziereModePageProps) {
  const [isBookOpen, setIsBookOpen] = useState(false);
  const [isTurning, setIsTurning] = useState(false);
  const previousChapterRef = useRef<number | null>(null);

  const chapterCount = project
    ? Math.max(
        1,
        project.config.numberOfChapters || 0,
        project.chapters.length,
        project.blueprint?.chapterOutlines?.length || 0,
      )
    : 0;

  const suggestedChapter = useMemo(
    () => (project ? clampChapter(firstUsefulChapter(project, generatingSet), chapterCount) : 0),
    [project, generatingSet, chapterCount],
  );
  const chapterIndex = project
    ? clampChapter(activeChapterIndex ?? suggestedChapter, chapterCount)
    : 0;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsBookOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!project || activeChapterIndex != null) return;
    onSelectChapter(suggestedChapter);
  }, [activeChapterIndex, onSelectChapter, project, suggestedChapter]);

  useEffect(() => {
    if (!project) return;
    setLastRomanziereChapter(project.id, chapterIndex);
    if (previousChapterRef.current == null) {
      previousChapterRef.current = chapterIndex;
      return;
    }
    if (previousChapterRef.current === chapterIndex) return;
    previousChapterRef.current = chapterIndex;
    setIsTurning(true);
    const timer = window.setTimeout(() => setIsTurning(false), 720);
    return () => window.clearTimeout(timer);
  }, [chapterIndex, project]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape") onExit();
      if (event.key === "ArrowLeft" && chapterIndex > 0) onSelectChapter(chapterIndex - 1);
      if (event.key === "ArrowRight" && chapterIndex < chapterCount - 1) onSelectChapter(chapterIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chapterCount, chapterIndex, onExit, onSelectChapter]);

  if (!project) {
    return (
      <main className="romanziere-shell romanziere-empty" aria-labelledby="romanziere-empty-title">
        <div className="romanziere-empty-book" aria-hidden="true">
          <BookOpen />
        </div>
        <p className="romanziere-kicker">Scriptora Novel Mode</p>
        <h1 id="romanziere-empty-title">Apri prima un libro</h1>
        <p>La Modalità Romanziere usa il progetto attivo, i suoi capitoli e la memoria narrativa reale.</p>
        <div className="romanziere-empty-actions">
          <button type="button" className="romanziere-action romanziere-action-primary" onClick={onDashboard}>
            <Home aria-hidden="true" /> Scegli un libro
          </button>
          <button type="button" className="romanziere-action" onClick={onExit}>
            <ArrowLeft aria-hidden="true" /> Torna all&apos;editor
          </button>
        </div>
      </main>
    );
  }

  const chapter = project.chapters[chapterIndex];
  const outline = project.blueprint?.chapterOutlines?.[chapterIndex];
  const generationKey = `chapter-${chapterIndex}`;
  const isGenerating = generatingSet.has(generationKey);
  const progress = chunkProgress[generationKey];
  const content = progress?.content?.trim() ? progress.content : chapter?.content || "";
  const chapterTitle = formatChapterDisplayTitle(
    chapterIndex,
    chapter?.title || outline?.title,
    {
      config: project.config,
      summary: outline?.summary,
      totalChapters: chapterCount,
    },
  );
  const progressPercent = isGenerating
    ? Math.min(99, Math.round(((progress?.currentWords || 0) / Math.max(progress?.targetWords || 1, 1)) * 100))
    : content.trim()
      ? 100
      : 0;
  const canGenerate = Boolean(project.blueprint) && !isGenerating;
  const author = project.config.author || project.config.authorName || project.config.writerName || "Scriptora Author";

  const selectChapter = (next: number) => {
    if (next < 0 || next >= chapterCount || next === chapterIndex) return;
    onSelectChapter(next);
  };

  return (
    <main className="romanziere-shell" aria-labelledby="romanziere-title">
      <header className="romanziere-toolbar">
        <button type="button" className="romanziere-icon-button" onClick={onExit} aria-label="Torna all'editor">
          <ArrowLeft aria-hidden="true" />
        </button>

        <div className="romanziere-heading">
          <p className="romanziere-kicker"><Feather aria-hidden="true" /> Modalità Romanziere</p>
          <h1 id="romanziere-title">{project.config.title || "Libro senza titolo"}</h1>
        </div>

        <div className="romanziere-status" role="status" aria-live="polite">
          <span className={isGenerating ? "is-writing" : ""} aria-hidden="true" />
          {isGenerating ? "La piuma sta scrivendo" : content.trim() ? "Capitolo pronto" : "Pagina in attesa"}
        </div>

        <button type="button" className="romanziere-icon-button" onClick={onDashboard} aria-label="Vai alla dashboard">
          <Home aria-hidden="true" />
        </button>
      </header>

      <section className="romanziere-workspace" aria-label={`Capitolo ${chapterIndex + 1}: ${chapterTitle}`}>
        <OpenBook
          bookTitle={project.config.title || "Libro senza titolo"}
          author={author}
          chapterTitle={chapterTitle}
          chapterNumber={chapterIndex + 1}
          content={content}
          outline={outline?.summary}
          isOpen={isBookOpen}
          isGenerating={isGenerating}
          isTurning={isTurning}
          progressPercent={progressPercent}
          statusMessage={progress?.statusMessage}
        />
      </section>

      <nav className="romanziere-controls" aria-label="Navigazione capitoli">
        <button
          type="button"
          className="romanziere-icon-button"
          onClick={() => selectChapter(chapterIndex - 1)}
          disabled={chapterIndex === 0}
          aria-label="Capitolo precedente"
        >
          <ChevronLeft aria-hidden="true" />
        </button>

        <label className="romanziere-chapter-picker">
          <span className="sr-only">Capitolo aperto</span>
          <select value={chapterIndex} onChange={(event) => selectChapter(Number(event.target.value))}>
            {Array.from({ length: chapterCount }, (_, index) => (
              <option key={index} value={index}>Capitolo {index + 1}</option>
            ))}
          </select>
          <span>{chapterTitle}</span>
        </label>

        {isGenerating ? (
          <button
            type="button"
            className="romanziere-action romanziere-action-danger"
            onClick={() => onCancelGeneration(generationKey)}
          >
            <Square aria-hidden="true" /> Interrompi
          </button>
        ) : (
          <button
            type="button"
            className="romanziere-action romanziere-action-primary"
            onClick={() => void onGenerateChapter(chapterIndex)}
            disabled={!canGenerate}
            title={!project.blueprint ? "Completa prima il Blueprint nell'editor" : undefined}
          >
            <WandSparkles aria-hidden="true" /> {content.trim() ? "Rigenera capitolo" : "Genera capitolo"}
          </button>
        )}

        <button
          type="button"
          className="romanziere-icon-button"
          onClick={() => selectChapter(chapterIndex + 1)}
          disabled={chapterIndex >= chapterCount - 1}
          aria-label="Capitolo successivo"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>

      {!project.blueprint && (
        <button type="button" className="romanziere-blueprint-warning" onClick={onExit}>
          Completa il Blueprint nell&apos;editor prima di generare i capitoli.
        </button>
      )}
    </main>
  );
}
