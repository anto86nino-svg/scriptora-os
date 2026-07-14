import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BookProject } from "@/types/book";
import { EditorPanel } from "./EditorPanel";

vi.mock("@/lib/plan", () => ({
  usePlan: () => ({ plan: "premium", isDev: true, loading: false, refresh: vi.fn() }),
}));

function project(id: string): BookProject {
  return {
    id,
    config: {
      title: `Romanzo ${id}`,
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
    chapters: [{
      title: "La prima soglia",
      content: `Non non era solo vanita. Questo e il testo specifico del progetto ${id}, abbastanza lungo da essere ripulito senza ambiguita.`,
      subchapters: [],
      status: "completed",
    }],
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
  };
}

function props(currentProject: BookProject) {
  return {
    project: currentProject,
    activeSection: "chapter-0" as const,
    onGenerateNext: vi.fn(),
    onGenerateChapter: vi.fn(),
    onRegenerateChapter: vi.fn(),
    onRewriteChapter: vi.fn(),
    onEvaluateChapter: vi.fn(),
    onGenerateSubchapter: vi.fn(),
    onUpdateChapterContent: vi.fn(),
    onUpdateChapterTitle: vi.fn(),
    onUpdateSubchapterContent: vi.fn(),
    onUpdateSubchapterTitle: vi.fn(),
    onSetChapterLengthOverride: vi.fn(),
    isGeneratingSection: vi.fn(() => false),
    premiumWriter: true,
  };
}

describe("EditorPanel cleanup preview identity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("cancels a pending cleanup preview when the active project changes", async () => {
    const projectA = project("A");
    const projectB = project("B");
    const { rerender } = render(
      <EditorPanel {...props(projectA)} chapterToolRequest={null} />,
    );

    act(() => {
      rerender(
        <EditorPanel {...props(projectA)} chapterToolRequest={{ mode: "cleanup", nonce: 1 }} />,
      );
    });
    expect(screen.getByText(/Pulizia editoriale in corso/i)).toBeInTheDocument();

    act(() => {
      rerender(
        <EditorPanel {...props(projectB)} chapterToolRequest={{ mode: "cleanup", nonce: 1 }} />,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(screen.queryByText("Pulizia completata")).not.toBeInTheDocument();
    expect(screen.queryByText(/testo specifico del progetto A/i)).not.toBeInTheDocument();
  });
});
