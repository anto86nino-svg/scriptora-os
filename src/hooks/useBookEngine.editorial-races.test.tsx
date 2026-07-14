import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AIQualityRating, BookProject, Chapter } from "@/types/book";
import { useBookEngine } from "./useBookEngine";

const runtimeMocks = vi.hoisted(() => ({
  evaluate: vi.fn(),
  rewrite: vi.fn(),
  generateChunked: vi.fn(),
}));

vi.mock("@/lib/generation-runtime", () => ({
  runGenerateBlueprint: vi.fn(),
  runGenerateFrontMatter: vi.fn(),
  runGenerateBackMatter: vi.fn(),
  runGenerateChapter: vi.fn(),
  runGenerateChapterChunked: runtimeMocks.generateChunked,
  runGenerateChapterViaSubchapterPipeline: vi.fn(),
  runGenerateSubchapter: vi.fn(),
  runRewriteChapter: runtimeMocks.rewrite,
  runEvaluateChapterQuality: runtimeMocks.evaluate,
}));

vi.mock("@/services/storageService", () => ({
  saveProjectAsync: vi.fn().mockResolvedValue(undefined),
  createProjectId: vi.fn(() => "generated-project"),
  setLastProjectId: vi.fn(),
  loadProjects: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/storage", () => ({
  saveProject: vi.fn(),
}));

vi.mock("@/lib/plan", () => ({
  fetchPlan: vi.fn().mockResolvedValue("premium"),
}));

vi.mock("@/lib/dev-mode", () => ({
  isDevMode: vi.fn(() => false),
}));

vi.mock("@/lib/dev-plan-override", () => ({
  getDevPlanOverride: vi.fn(() => "premium"),
}));

vi.mock("@/lib/billing", () => ({
  buildCreditIdempotencyKey: vi.fn(() => "rewrite-idempotency"),
  chargeChapterGeneration: vi.fn().mockResolvedValue("chapter-idempotency"),
  chargeRewriteChapter: vi.fn().mockResolvedValue("rewrite-idempotency"),
  resolveChapterGenerationOperation: vi.fn(() => "generate_chapter_chunk"),
}));

vi.mock("@/lib/intelligence-layer", () => ({
  consultIntelligenceLayer: vi.fn(),
  getWriterEngineContext: vi.fn(() => ({ consolidatedBlock: "", canonWarnings: [] })),
}));

vi.mock("@/lib/long-book-memory", () => ({
  refreshProjectLongBookMemory: vi.fn((project: BookProject) => project),
}));

vi.mock("@/lib/memory-consistency-v25", () => ({
  isMemoryConsistencyV25Enabled: vi.fn(() => false),
  refreshProjectMemoryConsistencyV25: vi.fn((project: BookProject) => project),
}));

vi.mock("@/lib/memory-graph/graph-updater", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/memory-graph/graph-updater")>(),
  refreshProjectMemoryGraph: vi.fn((project: BookProject) => project),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), warning: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/scriptora-logger", () => ({
  scriptoraLog: { error: vi.fn(), warn: vi.fn() },
}));

const lowRating: AIQualityRating = {
  score: 2,
  explanation: "Debole",
  missing: "Tensione",
  improvements: "Rafforzare il conflitto",
};

const highRating: AIQualityRating = {
  score: 5,
  explanation: "Solido",
  missing: "Niente",
  improvements: "Nessuno",
};

function project(id: string, content = `Testo originale ${id}`): BookProject {
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
      overview: "Conflitto centrale",
      themes: ["scelta"],
      emotionalArc: "Dubbio e decisione",
      chapterOutlines: [{ title: "La soglia", summary: "Una scelta irreversibile." }],
    },
    chapters: [{ title: "La soglia", content, subchapters: [], status: "completed", lastGenerationId: `${id}-generation` }],
    frontMatter: null,
    backMatter: null,
    phase: "chapters",
    blueprintApproved: true,
    configStatus: "approved",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("useBookEngine editorial operation races", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    runtimeMocks.evaluate.mockReset();
    runtimeMocks.rewrite.mockReset();
    runtimeMocks.generateChunked.mockReset();
    runtimeMocks.rewrite.mockImplementation(async (_config, _blueprint, chapter: Chapter) => ({
      ...chapter,
      content: `${chapter.content} — riscritto`,
    }));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("uses a separate auto-rewrite workflow lock so a low score reaches the real rewrite", async () => {
    runtimeMocks.evaluate
      .mockResolvedValueOnce(lowRating)
      .mockResolvedValueOnce(highRating);
    const { result } = renderHook(() => useBookEngine());

    act(() => result.current.loadProject(project("A")));
    await act(async () => {
      await result.current.autoRewriteToThreshold(0, 4);
    });

    expect(runtimeMocks.rewrite).toHaveBeenCalledTimes(1);
    expect(result.current.project?.chapters[0].content).toContain("riscritto");
    expect(result.current.generatingSet.has("auto-rewrite-0")).toBe(false);
    expect(result.current.generatingSet.has("chapter-0")).toBe(false);
  });

  it("releases the workflow lock on the early threshold return", async () => {
    runtimeMocks.evaluate.mockResolvedValueOnce(highRating);
    const { result } = renderHook(() => useBookEngine());

    act(() => result.current.loadProject(project("A")));
    await act(async () => {
      await result.current.autoRewriteToThreshold(0, 4);
    });
    await act(async () => {
      await result.current.rewriteChapterWithDepth(0, "light");
    });

    expect(runtimeMocks.rewrite).toHaveBeenCalledTimes(1);
    expect(result.current.generatingSet.has("auto-rewrite-0")).toBe(false);
  });

  it("does not apply an evaluation result after switching projects", async () => {
    const pendingRating = deferred<AIQualityRating>();
    runtimeMocks.evaluate.mockReturnValueOnce(pendingRating.promise);
    const { result } = renderHook(() => useBookEngine());
    let evaluation!: Promise<void>;

    act(() => result.current.loadProject(project("A")));
    act(() => { evaluation = result.current.evaluateChapter(0); });
    await act(async () => { await Promise.resolve(); });
    act(() => result.current.loadProject(project("B")));
    await act(async () => {
      pendingRating.resolve(highRating);
      await evaluation;
    });

    expect(result.current.project?.id).toBe("B");
    expect(result.current.project?.chapters[0].aiRating).toBeUndefined();
    expect(result.current.project?.chapters[0].qualityRating).toBeUndefined();
  });

  it("does not attach a rating to a newer chapter revision", async () => {
    const pendingRating = deferred<AIQualityRating>();
    runtimeMocks.evaluate.mockReturnValueOnce(pendingRating.promise);
    const { result } = renderHook(() => useBookEngine());
    let evaluation!: Promise<void>;

    act(() => result.current.loadProject(project("A")));
    act(() => { evaluation = result.current.evaluateChapter(0); });
    await act(async () => { await Promise.resolve(); });
    act(() => result.current.updateChapterContent(0, "Versione manuale piu recente"));
    await act(async () => {
      pendingRating.resolve(highRating);
      await evaluation;
    });

    expect(result.current.project?.chapters[0].content).toBe("Versione manuale piu recente");
    expect(result.current.project?.chapters[0].aiRating).toBeUndefined();
    expect(result.current.project?.chapters[0].qualityRating).toBeUndefined();
  });

  it("keeps a cancelled chapter generation from saving a late result", async () => {
    const pendingChapter = deferred<Chapter>();
    runtimeMocks.generateChunked.mockImplementationOnce(async (
      _config,
      _blueprint,
      _index,
      _previous,
      _override,
      onProgress,
    ) => {
      onProgress({
        chunkIndex: 0,
        totalChunks: 1,
        currentWords: 2,
        targetWords: 100,
        phase: "OPENING",
        content: "Testo parziale",
      });
      return pendingChapter.promise;
    });
    const { result } = renderHook(() => useBookEngine());
    let generation!: Promise<void>;

    act(() => result.current.loadProject(project("A", "")));
    act(() => { generation = result.current.generateSingleChapter(0); });
    await act(async () => { await Promise.resolve(); });
    act(() => result.current.cancelGeneration("chapter-0"));
    await act(async () => {
      pendingChapter.resolve({ title: "La soglia", content: "RISULTATO TARDIVO", subchapters: [], status: "completed" });
      await generation;
    });

    expect(result.current.generatingSet.has("chapter-0")).toBe(false);
    expect(result.current.chunkProgress["chapter-0"]).toBeUndefined();
    expect(result.current.project?.chapters[0].content).not.toContain("RISULTATO TARDIVO");
    expect(result.current.project?.chapters[0].lastGenerationId).toBeUndefined();
  });
});
