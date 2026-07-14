import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookProject } from "@/types/book";
import RomanziereModePage from "./RomanziereModePage";

vi.mock("@/features/romanziere/components/OpenBook", () => ({
  OpenBook: ({
    content,
    isGenerating,
    progressPercent,
    statusMessage,
  }: {
    content: string;
    isGenerating: boolean;
    progressPercent: number;
    statusMessage?: string;
  }) => (
    <div
      data-testid="open-book"
      data-generating={String(isGenerating)}
      data-progress={String(progressPercent)}
      data-status={statusMessage || ""}
    >
      {content}
    </div>
  ),
}));

function project(overrides: Partial<BookProject> = {}): BookProject {
  return {
    id: "romanzo-1",
    config: {
      title: "Il giardino delle ombre",
      subtitle: "",
      tone: "cinematic",
      authorStyle: "literary",
      authorName: "Livia Emerson",
      language: "Italian",
      genre: "literary-fiction",
      category: "Fiction",
      subcategory: "Literary",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 3,
      subchaptersEnabled: false,
    },
    blueprint: {
      overview: "Una storia di memoria e ritorno.",
      themes: ["memoria"],
      emotionalArc: "Dalla fuga alla scelta.",
      chapterOutlines: [
        { title: "Il cancello", summary: "La protagonista torna nella casa abbandonata." },
        { title: "La stanza chiusa", summary: "Una traccia riapre il conflitto di famiglia." },
        { title: "Il nome sul muro", summary: "La verita costringe tutti a scegliere." },
      ],
    },
    chapters: [
      { title: "Il cancello", content: "Testo salvato del primo capitolo.", subchapters: [], status: "completed" },
      { title: "La stanza chiusa", content: "", subchapters: [], status: "idle" },
      { title: "Il nome sul muro", content: "", subchapters: [], status: "idle" },
    ],
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

function handlers() {
  return {
    onSelectChapter: vi.fn(),
    onGenerateChapter: vi.fn(),
    onCancelGeneration: vi.fn(),
    onExit: vi.fn(),
    onDashboard: vi.fn(),
  };
}

describe("RomanziereModePage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("mostra lo stato vuoto e permette di scegliere un libro o tornare all'editor", () => {
    const callbacks = handlers();

    render(
      <RomanziereModePage
        project={null}
        activeChapterIndex={null}
        generatingSet={new Set()}
        chunkProgress={{}}
        {...callbacks}
      />,
    );

    expect(screen.getByRole("heading", { name: "Apri prima un libro" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /scegli un libro/i }));
    fireEvent.click(screen.getByRole("button", { name: /torna all'editor/i }));

    expect(callbacks.onDashboard).toHaveBeenCalledTimes(1);
    expect(callbacks.onExit).toHaveBeenCalledTimes(1);
  });

  it("mostra il contenuto live e lo stato della piuma durante la generazione", () => {
    const callbacks = handlers();

    render(
      <RomanziereModePage
        project={project()}
        activeChapterIndex={1}
        generatingSet={new Set(["chapter-1"])}
        chunkProgress={{
          "chapter-1": {
            chunkIndex: 0,
            totalChunks: 2,
            currentWords: 320,
            targetWords: 800,
            phase: "DEVELOPMENT",
            content: "La piuma tracciava parole nuove sulla pagina.",
            statusMessage: "Allineo voce e continuita narrativa...",
          },
        }}
        {...callbacks}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("La piuma sta scrivendo");
    expect(screen.getByTestId("open-book")).toHaveTextContent(
      "La piuma tracciava parole nuove sulla pagina.",
    );
    expect(screen.getByTestId("open-book")).toHaveAttribute("data-generating", "true");
    expect(screen.getByTestId("open-book")).toHaveAttribute("data-progress", "40");
    expect(screen.getByTestId("open-book")).toHaveAttribute(
      "data-status",
      "Allineo voce e continuita narrativa...",
    );
  });

  it("avvia la generazione del capitolo aperto", () => {
    const callbacks = handlers();

    render(
      <RomanziereModePage
        project={project()}
        activeChapterIndex={1}
        generatingSet={new Set()}
        chunkProgress={{}}
        {...callbacks}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Genera capitolo" }));

    expect(callbacks.onGenerateChapter).toHaveBeenCalledTimes(1);
    expect(callbacks.onGenerateChapter).toHaveBeenCalledWith(1);
  });

  it("annulla la generazione usando la chiave del capitolo aperto", () => {
    const callbacks = handlers();

    render(
      <RomanziereModePage
        project={project()}
        activeChapterIndex={2}
        generatingSet={new Set(["chapter-2"])}
        chunkProgress={{}}
        {...callbacks}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Interrompi" }));

    expect(callbacks.onCancelGeneration).toHaveBeenCalledTimes(1);
    expect(callbacks.onCancelGeneration).toHaveBeenCalledWith("chapter-2");
  });

  it("naviga tra capitoli con pulsanti, selettore e tastiera", () => {
    const callbacks = handlers();

    render(
      <RomanziereModePage
        project={project()}
        activeChapterIndex={1}
        generatingSet={new Set()}
        chunkProgress={{}}
        {...callbacks}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Capitolo precedente" }));
    fireEvent.click(screen.getByRole("button", { name: "Capitolo successivo" }));
    fireEvent.change(screen.getByRole("combobox", { name: /Capitolo aperto/ }), {
      target: { value: "0" },
    });
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(callbacks.onSelectChapter.mock.calls).toEqual([[0], [2], [0], [2]]);
    expect(callbacks.onExit).toHaveBeenCalledTimes(1);
  });
});
