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

describe("EditorPanel Chapter Forge live stream V2", () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("shows status lines instead of full manuscript preview while generating", async () => {
    const { render, screen } = await import("@testing-library/react");
    const chunkProgress: ChunkProgress = {
      chunkIndex: 0,
      totalChunks: 1,
      currentWords: 7,
      targetWords: 1200,
      phase: "OPENING",
      content: "Prime parole del capitolo in streaming con un paragrafo molto lungo che non deve apparire per intero nel pannello live.",
      statusMessage: "Continuity e apertura scena…",
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
        premiumWriter
      />,
    );

    expect(screen.getByText("Live Stream V2")).toBeInTheDocument();
    expect(screen.queryByText(/Prime parole del capitolo in streaming con un paragrafo molto lungo/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Continuity: allineo blueprint/i)).toBeInTheDocument();
  });
});
