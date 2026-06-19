import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BookProject } from "@/types/book";
import type { ChunkProgress } from "@/lib/generation-types";
import { EditorPanel } from "./EditorPanel";

vi.mock("@/lib/plan", () => ({
  usePlan: () => ({ plan: "premium", isDev: true, loading: false, refresh: vi.fn() }),
}));

function project(): BookProject {
  return {
    id: "live-stream-project",
    config: {
      title: "Romanzo Live",
      subtitle: "",
      tone: "cinematic",
      authorStyle: "clean",
      language: "Italian",
      genre: "romance",
      category: "Fiction",
      subcategory: "Romance",
      chapterLength: "medium",
      bookLength: "short",
      numberOfChapters: 1,
      subchaptersEnabled: false,
      matterOptions: {
        frontMatterEnabled: false,
        backMatterEnabled: false,
        acknowledgmentsEnabled: false,
        ctaEnabled: false,
        bibliographyEnabled: false,
      },
    },
    blueprint: {
      overview: "Una storia con un conflitto chiaro.",
      themes: ["desiderio"],
      emotionalArc: "Dalla distanza alla scelta.",
      chapterOutlines: [{ title: "La prima soglia", summary: "La protagonista entra in una scena decisiva." }],
    },
    chapters: [{ title: "La prima soglia", content: "", subchapters: [], status: "generating" }],
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    createdAt: "2026-06-19T00:00:00.000Z",
    updatedAt: "2026-06-19T00:00:00.000Z",
  };
}

describe("EditorPanel Chapter Forge live manuscript", () => {
  it("renders partial chunkProgress content while the chapter is generating", () => {
    const chunkProgress: ChunkProgress = {
      chunkIndex: 0,
      totalChunks: 1,
      currentWords: 7,
      targetWords: 1200,
      phase: "OPENING",
      content: "Prime parole del capitolo in streaming.",
      statusMessage: "Scrittura live del capitolo...",
    };

    render(
      <EditorPanel
        project={project()}
        activeSection="chapter-0"
        onGenerateNext={vi.fn()}
        onGenerateChapter={vi.fn()}
        onRegenerateChapter={vi.fn()}
        onRewriteChapter={vi.fn()}
        onEvaluateChapter={vi.fn()}
        onGenerateSubchapter={vi.fn()}
        onUpdateChapterContent={vi.fn()}
        onUpdateChapterTitle={vi.fn()}
        onUpdateSubchapterContent={vi.fn()}
        onUpdateSubchapterTitle={vi.fn()}
        onSetChapterLengthOverride={vi.fn()}
        isGeneratingSection={(key) => key === "chapter-0"}
        chunkProgress={{ "chapter-0": chunkProgress }}
      />,
    );

    expect(screen.getByText("Manoscritto live")).toBeInTheDocument();
    expect(screen.getByText("Prime parole del capitolo in streaming.")).toBeInTheDocument();
    expect(screen.queryByText(/Nessun testo ricevuto ancora/i)).not.toBeInTheDocument();
  });
});
